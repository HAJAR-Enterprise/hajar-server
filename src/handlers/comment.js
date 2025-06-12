const { google } = require("googleapis");
const db = require("../config/firebase");
const { oauth2Client } = require("../auth/oauth");
const axios = require("axios");
require("dotenv").config();

const getComments = async (request, h) => {
  const { credentials } = request.auth;
  const { channelId, videoId } = request.params;

  try {
    const snapshot = await db
      .collection("comments")
      .where("videoId", "==", videoId)
      .where("channelId", "==", channelId)
      .get();
    if (snapshot.empty) {
      return h
        .response({
          message: "No comments found in database",
          comments: [],
          token: credentials.token,
        })
        .code(200);
    }

    const comments = [];
    snapshot.forEach((doc) => {
      comments.push(doc.data());
    });

    return h.response({ comments, token: credentials.token }).code(200);
  } catch (error) {
    console.error("Error fetching comments from DB:", error);
    return h.response({ error: error.message }).code(500);
  }
};

const syncCommentsFromYouTube = async (request, h) => {
  const { credentials } = request.auth;
  const { channelId, videoId } = request.params;
  oauth2Client.setCredentials({ access_token: credentials.token });

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  let allComments = [];
  let nextPageToken = null;

  try {
    // Ambil semua komentar dari YouTube
    do {
      const response = await youtube.commentThreads.list({
        part: "snippet",
        videoId,
        maxResults: 100,
        pageToken: nextPageToken,
      });
      const comments = response.data.items.map((item) => ({
        commentId: item.id,
        author: item.snippet.topLevelComment.snippet.authorDisplayName,
        authorProfileImageURL:
          item.snippet.topLevelComment.snippet.authorProfileImageUrl,
        text: item.snippet.topLevelComment.snippet.textOriginal,
        videoId,
        channelId,
      }));
      allComments = allComments.concat(comments);
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);
    console.log("Fetched Comments:", allComments);

    // Kirim semua data ke ML
    const mlEndpoint = process.env.ML_URL;
    const mlRequestData = { comments: allComments };
    const mlResponse = await axios.post(mlEndpoint, mlRequestData, {
      headers: { "Content-Type": "application/json" },
    });
    const mlResults = mlResponse.data.results || [];
    console.log("ML Results:", mlResults);

    // Hapus komentar lama dari Firestore (kecuali deleted atau hidden)
    const snapshot = await db.collection("comments").get();
    const batchDelete = db.batch();
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!(data.status === "deleted" || data.status === "hidden")) {
        batchDelete.delete(doc.ref);
      }
    });
    await batchDelete.commit();
    console.log("Cleared old comments from Firestore (except deleted/hidden)");

    // Filter dan simpan cuma komentar "judi" ke Firestore
    const judiCommentIds = mlResults
      .filter((result) => result.label === "judi")
      .map((r) => r.commentId);
    const judiComments = allComments.filter((comment) =>
      judiCommentIds.includes(comment.commentId)
    );

    const batch = db.batch();
    judiComments.forEach((comment) => {
      const ref = db.collection("comments").doc(comment.commentId);
      batch.set(
        ref,
        {
          ...comment,
          status: "judi",
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
    await batch.commit();
    console.log("Saved judi comments to Firestore:", judiComments);

    // Balik ke frontend cuma comment yang terdeteksi sebagai "judi"
    return h
      .response({ comments: judiComments, token: credentials.token })
      .code(200);
  } catch (error) {
    console.error("Error syncing comments from YouTube or ML:", error);
    if (error.response) {
      console.error("ML API Error:", error.response.data);
    }
    return h.response({ error: error.message }).code(500);
  }
};

const deleteComment = async (request, h) => {
  const { credentials } = request.auth;
  const { channelId, videoId, commentId } = request.params;
  oauth2Client.setCredentials({ access_token: credentials.token });

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  try {
    const commentRef = db.collection("comments").doc(commentId);
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      return h.response({ error: "Comment not found" }).code(404);
    }

    const commentData = commentDoc.data();
    if (commentData.status === "deleted" || commentData.status === "hidden") {
      return h.response({ error: "Comment already moderated" }).code(400);
    }

    // Coba ubah status menjadi 'heldForReview' (disembunyikan)
    await youtube.comments.setModerationStatus({
      id: commentId,
      moderationStatus: "heldForReview",
    });

    // Perbarui status di Firestore
    await commentRef.update({
      status: "hidden",
      moderatedAt: new Date().toISOString(),
    });

    console.log(
      `Comment ${commentId} hidden successfully for video ${videoId}`
    );
    return h
      .response({
        message: "Comment hidden successfully",
        token: credentials.token,
      })
      .code(200);
  } catch (error) {
    console.error(`Error moderating comment ${commentId}:`, error);
    if (error.code === 403) {
      return h
        .response({ error: "Permission denied: Cannot moderate this comment" })
        .code(403);
    }
    return h.response({ error: error.message }).code(500);
  }
};

const deleteAllComments = async (request, h) => {
  const { credentials } = request.auth;
  const { channelId, videoId } = request.params;
  oauth2Client.setCredentials({ access_token: credentials.token });

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  try {
    const snapshot = await db
      .collection("comments")
      .where("videoId", "==", videoId)
      .where("channelId", "==", channelId)
      .get();

    if (snapshot.empty) {
      return h
        .response({
          message: "No comments to moderate",
          token: credentials.token,
        })
        .code(200);
    }

    const commentIds = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status !== "deleted" && data.status !== "hidden") {
        commentIds.push(doc.id);
      }
    });

    const commentsToModerate = commentIds.slice(0, 50);
    const totalComments = commentIds.length;

    const failedModerations = [];
    const successfullyModerated = [];

    for (const commentId of commentsToModerate) {
      try {
        await youtube.comments.setModerationStatus({
          id: commentId,
          moderationStatus: "heldForReview",
        });

        // Validasi dengan comments.list
        const response = await youtube.comments.list({
          part: "snippet",
          id: commentId,
        });
        const comment = response.data.items[0];
        if (comment && comment.snippet.moderationStatus === "heldForReview") {
          successfullyModerated.push(commentId);
        } else {
          failedModerations.push({
            id: commentId,
            reason: "Status not updated to heldForReview",
          });
        }
      } catch (error) {
        console.error(
          `Failed to moderate comment ${commentId} from YouTube:`,
          error
        );
        if (error.code === 403) {
          failedModerations.push({
            id: commentId,
            reason: "Permission denied: Not owned by channel",
          });
        } else {
          failedModerations.push({ id: commentId, reason: error.message });
        }
      }
    }

    const batch = db.batch();
    commentsToModerate.forEach((commentId) => {
      if (successfullyModerated.includes(commentId)) {
        const ref = db.collection("comments").doc(commentId);
        batch.update(ref, {
          status: "hidden",
          moderatedAt: new Date().toISOString(),
        });
      } else if (!failedModerations.some((fail) => fail.id === commentId)) {
        failedModerations.push({
          id: commentId,
          reason: "Unknown moderation failure",
        });
      }
    });

    await batch.commit();

    const moderatedCount = successfullyModerated.length;
    const remainingComments = totalComments - moderatedCount;

    if (failedModerations.length > 0) {
      return h
        .response({
          message: `Hidden ${moderatedCount} comments, failed to moderate ${failedModerations.length} comments`,
          failedCommentIds: failedModerations.map((fail) => ({
            id: fail.id,
            reason: fail.reason,
          })),
          remainingComments: remainingComments > 0 ? remainingComments : 0,
          token: credentials.token,
        })
        .code(207);
    }

    return h
      .response({
        message: `Hidden ${moderatedCount} comments`,
        remainingComments: remainingComments > 0 ? remainingComments : 0,
        token: credentials.token,
      })
      .code(200);
  } catch (error) {
    console.error("Error moderating all comments:", error);
    return h.response({ error: error.message }).code(500);
  }
};

module.exports = {
  getComments,
  syncCommentsFromYouTube,
  deleteComment,
  deleteAllComments,
};
