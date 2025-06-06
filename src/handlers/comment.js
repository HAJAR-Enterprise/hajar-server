const { google } = require("googleapis");
const db = require("../config/firebase");
const { oauth2Client } = require("../auth/oauth");
const { preprocessText } = require("../utils/text");

const getComments = async (request, h) => {
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
        text: item.snippet.topLevelComment.snippet.textOriginal,
        videoId,
        channelId,
      }));
      allComments = allComments.concat(comments);
      nextPageToken = response.data.nextPageToken;
    } while (nextPageToken);

    const batch = db.batch();
    allComments.forEach((comment) => {
      const ref = db.collection("comments").doc(comment.commentId);
      batch.set(ref, {
        ...comment,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    });
    await batch.commit();

    return h
      .response({ comments: allComments, token: credentials.token })
      .code(200);
  } catch (error) {
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
    // Validasi apakah komentar ada di Firestore
    const commentRef = db.collection("comments").doc(commentId);
    const commentDoc = await commentRef.get();
    if (!commentDoc.exists) {
      return h.response({ error: "Comment not found" }).code(404);
    }

    const commentData = commentDoc.data();
    if (commentData.status === "deleted") {
      return h.response({ error: "Comment already deleted" }).code(400);
    }

    // Hapus komentar dari YouTube
    await youtube.comments.delete({
      id: commentId,
    });

    // Update status di Firestore
    await commentRef.update({
      status: "deleted",
      deletedAt: new Date().toISOString(),
    });

    return h
      .response({
        message: "Comment deleted successfully",
        token: credentials.token,
      })
      .code(200);
  } catch (error) {
    console.error("Error deleting comment:", error);
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
    // Ambil semua komentar dari Firestore untuk video tertentu
    const snapshot = await db
      .collection("comments")
      .where("videoId", "==", videoId)
      .where("channelId", "==", channelId)
      .where("status", "!=", "deleted")
      .get();

    if (snapshot.empty) {
      return h
        .response({
          message: "No comments to delete",
          token: credentials.token,
        })
        .code(200);
    }

    const commentIds = [];
    snapshot.forEach((doc) => {
      commentIds.push(doc.id);
    });

    // Batasi hingga 50 komentar
    const commentsToDelete = commentIds.slice(0, 50); // Ambil maksimal 50 komentar pertama
    const totalComments = commentIds.length; // Total komentar awal

    // Hapus komentar dari YouTube terlebih dahulu
    const failedDeletions = [];
    for (const commentId of commentsToDelete) {
      try {
        await youtube.comments.delete({ id: commentId });
      } catch (error) {
        console.error(
          `Failed to delete comment ${commentId} from YouTube:`,
          error
        );
        failedDeletions.push(commentId);
      }
    }

    // Update status di Firestore hanya untuk komentar yang berhasil dihapus
    const batch = db.batch();
    commentsToDelete.forEach((commentId) => {
      if (!failedDeletions.includes(commentId)) {
        const ref = db.collection("comments").doc(commentId);
        batch.update(ref, {
          status: "deleted",
          deletedAt: new Date().toISOString(),
        });
      }
    });

    await batch.commit();

    const deletedCount = commentsToDelete.length - failedDeletions.length;
    const remainingComments = totalComments - deletedCount;

    if (failedDeletions.length > 0) {
      return h
        .response({
          message: `Deleted ${deletedCount} comments, failed to delete ${failedDeletions.length} comments`,
          failedCommentIds: failedDeletions,
          remainingComments: remainingComments > 0 ? remainingComments : 0,
          token: credentials.token,
        })
        .code(207); // 207 Multi-Status untuk menunjukkan sebagian berhasil
    }

    return h
      .response({
        message: `Deleted ${deletedCount} comments`,
        remainingComments: remainingComments > 0 ? remainingComments : 0,
        token: credentials.token,
      })
      .code(200);
  } catch (error) {
    console.error("Error deleting all comments:", error);
    return h.response({ error: error.message }).code(500);
  }
};
module.exports = { getComments, deleteComment, deleteAllComments };