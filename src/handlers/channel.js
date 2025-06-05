const { google } = require("googleapis");
const db = require("../config/firebase");
const { oauth2Client } = require("../auth/oauth");

const getChannels = async (request, h) => {
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
    const channels = response.data.items;

    // Simpan metadata channel ke Firestore
    const batch = db.batch();
    channels.forEach((channel) => {
      const ref = db.collection("channels").doc(channel.id);
      batch.set(ref, {
        title: channel.snippet.title,
        description: channel.snippet.description,
        createdAt: new Date().toISOString(),
      });
    });
    await batch.commit();

    return h.response({ channels }).code(200);
  } catch (error) {
    return h.response({ error: error.message }).code(500);
  }
};

module.exports = { getChannels };
