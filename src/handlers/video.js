const { google } = require("googleapis");
const db = require("../config/firebase");
const { oauth2Client } = require("../auth/oauth");

const getVideos = async (request, h) => {
  const { credentials } = request.auth;
  const { channelId } = request.params;
  oauth2Client.setCredentials({ access_token: credentials.token });

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  try {
    const response = await youtube.search.list({
      part: "snippet",
      channelId,
      maxResults: 50,
      order: "date",
      type: "video",
    });

    const videos = response.data.items
      .filter((item) => item.id.kind === "youtube#video")
      .map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channelId,
        publishedAt: item.snippet.publishedAt,
      }));

    if (videos.length === 0) {
      return h
        .response({
          message: "No videos found",
          videos: [],
          token: credentials.token,
        })
        .code(200);
    }

    const batch = db.batch();
    videos.forEach((video) => {
      if (video.videoId) {
        const ref = db.collection("videos").doc(video.videoId);
        batch.set(ref, {
          title: video.title,
          videoId: video.videoId,
          channelId,
          publishedAt: video.publishedAt,
        });
      }
    });
    await batch.commit();

    return h.response({ videos, token: credentials.token }).code(200);
  } catch (error) {
    console.error("Error fetching videos:", error);
    return h.response({ error: error.message }).code(500);
  }
};

module.exports = { getVideos };
