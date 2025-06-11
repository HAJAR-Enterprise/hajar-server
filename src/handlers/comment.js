const { google } = require("googleapis");
const db = require("../config/firebase");
const { oauth2Client } = require("../auth/oauth");


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

    const batch = db.batch();
    allComments.forEach((comment) => {
      const ref = db.collection("comments").doc(comment.commentId);
      batch.set(
        ref,
        {
          ...comment,
          status: "pending",
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
    await batch.commit();

    return h
      .response({ comments: allComments, token: credentials.token })
      .code(200);
  } catch (error) {
    console.error("Error syncing comments from YouTube:", error);
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
      // Filter komentar yang belum di-moderate (bukan deleted atau hidden)
      if (data.status !== "deleted" && data.status !== "hidden") {
        commentIds.push(doc.id);
      }
    });

    const commentsToModerate = commentIds.slice(0, 50);
    const totalComments = commentIds.length;

    const failedModerations = [];
    for (const commentId of commentsToModerate) {
      try {
        await youtube.comments.setModerationStatus({
          id: commentId,
          moderationStatus: "heldForReview",
        });
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
      if (!failedModerations.some((fail) => fail.id === commentId)) {
        const ref = db.collection("comments").doc(commentId);
        batch.update(ref, {
          status: "hidden",
          moderatedAt: new Date().toISOString(),
        });
      }
    });

    await batch.commit();

    const moderatedCount = commentsToModerate.length - failedModerations.length;
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
