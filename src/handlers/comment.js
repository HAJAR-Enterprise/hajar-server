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

    // Simpan ke Firestore dengan status 'pending'
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

    return h.response({ comments: allComments }).code(200);
  } catch (error) {
    return h.response({ error: error.message }).code(500);
  }
};

module.exports = { getComments };
