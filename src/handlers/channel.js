const { google } = require("googleapis");
const db = require("../config/firebase");
const { oauth2Client } = require("../auth/oauth");

const getChannels = async (request, h) => {
  const { credentials } = request.auth;

  try {
    const snapshot = await db.collection("channels").get();
    if (snapshot.empty) {
      return h
        .response({
          message: "No channels found in database",
          channels: [],
          token: credentials.token,
        })
        .code(200);
    }

    const channels = [];
    snapshot.forEach((doc) => {
      channels.push(doc.data());
    });

    return h.response({ channels, token: credentials.token }).code(200);
  } catch (error) {
    console.error("Error fetching channels from DB:", error);
    return h.response({ error: error.message }).code(500);
  }
};

const syncChannelsFromYouTube = async (request, h) => {
  const { credentials } = request.auth;
  oauth2Client.setCredentials({ access_token: credentials.token });

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  try {
    const response = await youtube.channels.list({
      part: "snippet,contentDetails",
      mine: true,
    });
    const channels = response.data.items.map((channel) => ({
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      createdAt: new Date().toISOString(),
    }));

    if (channels.length === 0) {
      return h
        .response({
          message: "No channels found",
          channels: [],
          token: credentials.token,
        })
        .code(200);
    }

    const batch = db.batch();
    channels.forEach((channel) => {
      const ref = db.collection("channels").doc(channel.id);
      batch.set(ref, channel, { merge: true });
    });
    await batch.commit();

    return h.response({ channels, token: credentials.token }).code(200);
  } catch (error) {
    console.error("Error syncing channels from YouTube:", error);
    return h.response({ error: error.message }).code(500);
  }
};

module.exports = { getChannels, syncChannelsFromYouTube };
