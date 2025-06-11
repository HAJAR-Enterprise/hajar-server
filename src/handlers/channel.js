const { google } = require('googleapis');
const db = require('../config/firebase');
const { oauth2Client } = require('../auth/oauth');

const getChannels = async (request, h) => {
  const { credentials } = request.auth;
  const userId = credentials.userId;
  if (!userId) {
    return h.response({ error: 'User not authenticated' }).code(401);
  }
  try {
    const snapshot = await db
      .collection('channels')
      .where('ownerId', '==', userId)
      .get();
    if (snapshot.empty) {
      return h
        .response({
          message: 'No channels found in database',
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
    console.error('Error fetching channels from DB:', error);
    return h.response({ error: error.message }).code(500);
  }
};

const syncChannelsFromYouTube = async (request, h) => {
  const { credentials } = request.auth;
  const userId = credentials.userId;
  if (!userId) {
    return h.response({ error: 'User not authenticated' }).code(401);
  }
  oauth2Client.setCredentials({ access_token: credentials.token });

  const youtube = google.youtube({
    version: 'v3',
    auth: oauth2Client,
  });

  try {
    const response = await youtube.channels.list({
      part: 'snippet,contentDetails,statistics',
      mine: true,
    });
    const channels = response.data.items.map((channel) => ({
      id: channel.id,
      title: channel.snippet.title,
      ownerId: userId,
      description: channel.snippet.description,
      createdAt: new Date().toISOString(),
      publishedAt: channel.snippet.publishedAt,
      thumbnail: channel.snippet.thumbnails?.high?.url || '',
      subscriberCount: channel.statistics?.subscriberCount || 0,
      videoCount: channel.statistics?.videoCount || 0,
      viewCount: channel.statistics?.viewCount || 0,
    }));

    if (channels.length === 0) {
      return h
        .response({
          message: 'No channels found',
          channels: [],
          token: credentials.token,
        })
        .code(200);
    }

    const batch = db.batch();
    channels.forEach((channel) => {
      const ref = db.collection('channels').doc(channel.id);
      batch.set(ref, channel, { merge: true });
    });
    await batch.commit();

    return h.response({ channels, token: credentials.token }).code(200);
  } catch (error) {
    console.error('Error syncing channels from YouTube:', error);
    return h.response({ error: error.message }).code(500);
  }
};

module.exports = { getChannels, syncChannelsFromYouTube };
