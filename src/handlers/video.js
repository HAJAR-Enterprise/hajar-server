const { google } = require("googleapis");
const db = require("../config/firebase");
const { oauth2Client } = require("../auth/oauth");

const getVideos = async (request, h) => {
  const { credentials } = request.auth;
  const { channelId } = request.params;

  try {
    const snapshot = await db
      .collection("videos")
      .where("channelId", "==", channelId)
      .get();
    if (snapshot.empty) {
      return h
        .response({
          message: "No videos found in database",
          videos: [],
          token: credentials.token,
        })
        .code(200);
    }

    const videos = [];
    snapshot.forEach((doc) => {
      videos.push(doc.data());
    });

    return h.response({ videos, token: credentials.token }).code(200);
  } catch (error) {
    console.error("Error fetching videos from DB:", error);
    return h.response({ error: error.message }).code(500);
  }
};

const syncVideosFromYouTube = async (request, h) => {
  const { credentials } = request.auth;
  const { channelId } = request.params;
  oauth2Client.setCredentials({ access_token: credentials.token });

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  try {
    // Langkah 1: Dapatkan daftar video ID dari search
    const searchResponse = await youtube.search.list({
      part: "snippet",
      channelId,
      maxResults: 50,
      order: "date",
      type: "video",
    });

    const videoIds = searchResponse.data.items
      .filter((item) => item.id.kind === "youtube#video")
      .map((item) => item.id.videoId);

    if (videoIds.length === 0) {
      return h
        .response({
          message: "No videos found",
          videos: [],
          token: credentials.token,
        })
        .code(200);
    }

    // Langkah 2: Dapatkan detail statistik (termasuk viewCount) dari videos.list
    const videosResponse = await youtube.videos.list({
      part: "snippet,statistics",
      id: videoIds.join(","),
    });

    // sekalian lah ya 

    const videos = videosResponse.data.items.map((item) => ({
      videoId: item.id,
      title: item.snippet.title,
      channelId,
      publishedAt: item.snippet.publishedAt,
      thumbnail:
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.default?.url,
      viewCount: item.statistics?.viewCount || 0, 
      likeCount: item.statistics?.likeCount || 0, 
      commentCount: item.statistics?.commentCount || 0,
    }));

    const batch = db.batch();
    videos.forEach((video) => {
      if (video.videoId) {
        const ref = db.collection("videos").doc(video.videoId);
        batch.set(ref, video, { merge: true });
      }
    });
    await batch.commit();

    return h.response({ videos, token: credentials.token }).code(200);
  } catch (error) {
    console.error("Error syncing videos from YouTube:", error);
    return h.response({ error: error.message }).code(500);
  }
};

module.exports = { getVideos, syncVideosFromYouTube };
