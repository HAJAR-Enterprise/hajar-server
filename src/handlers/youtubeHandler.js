const { google } = require('googleapis');
const admin = require('../auth/firebaseAuth');
const db = admin.firestore();

function getYouTubeClient(access_token) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token });
  return google.youtube({ version: 'v3', auth: oauth2Client });
}

const getUserChannels = async (req, h) => {
  const { access_token } = req.auth.credentials;

  try {
    const youtube = getYouTubeClient(access_token);
    const res = await youtube.channels.list({ part: 'snippet', mine: true });

    const channels = (res.data.items || []).map((item) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.default?.url || '',
      publishedAt: item.snippet.publishedAt,
    }));

    return h.response({ channels }).code(200);
  } catch (err) {
    console.error('[Channel Fetch Error]', err);
    return h.response({ error: 'Failed to fetch channels' }).code(500);
  }
};

const getUserVideos = async (req, h) => {
  const { access_token } = req.auth.credentials;

  try {
    const youtube = getYouTubeClient(access_token);
    const channelRes = await youtube.channels.list({ part: 'id', mine: true });
    const channelId = channelRes.data?.items?.[0]?.id;

    if (!channelId) {
      return h.response({ error: 'Channel not found' }).code(404);
    }

    const videoRes = await youtube.search.list({
      part: 'snippet',
      channelId,
      maxResults: 10,
      order: 'date',
      type: 'video',
    });

    const videos = (videoRes.data.items || [])
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        title: item.snippet.title,
        videoId: item.id.videoId,
        thumbnail: item.snippet.thumbnails?.medium?.url || '',
        publishedAt: item.snippet.publishedAt,
      }));

    return h.response({ videos }).code(200);
  } catch (err) {
    console.error('[Video Fetch Error]', err);
    return h.response({ error: 'Failed to fetch videos' }).code(500);
  }
};

const getVideosByChannelId = async (req, h) => {
  const { access_token } = req.auth.credentials;
  const { channelId } = req.params;

  if (!channelId) {
    return h.response({ error: 'Missing channelId in path' }).code(400);
  }

  try {
    const youtube = getYouTubeClient(access_token);
    const videoRes = await youtube.search.list({
      part: 'snippet',
      channelId,
      maxResults: 10,
      order: 'date',
      type: 'video',
    });

    const videos = (videoRes.data.items || [])
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        title: item.snippet.title,
        videoId: item.id.videoId,
        thumbnail: item.snippet.thumbnails?.medium?.url || '',
        publishedAt: item.snippet.publishedAt,
      }));

    return h.response({ videos }).code(200);
  } catch (err) {
    console.error('[Video Fetch Error]', err);
    return h.response({ error: 'Failed to fetch videos' }).code(500);
  }
};

const getComments = async (req, h) => {
  const { access_token } = req.auth.credentials;
  const { videoId } = req.query;

  if (!videoId) {
    return h.response({ error: 'Missing videoId in query' }).code(400);
  }

  try {
    const youtube = getYouTubeClient(access_token);
    const res = await youtube.commentThreads.list({
      part: 'snippet',
      videoId,
      maxResults: 20,
      order: 'time',
    });

    const comments = (res.data.items || []).map((item) => {
      const snippet = item.snippet.topLevelComment.snippet;
      return {
        commentId: item.snippet.topLevelComment.id,
        text: snippet.textDisplay,
        author: snippet.authorDisplayName,
        publishedAt: snippet.publishedAt,
        likeCount: snippet.likeCount,
        authorImage: snippet.authorProfileImageUrl,
      };
    });

    return h.response({ comments }).code(200);
  } catch (err) {
    console.error('[Comment Fetch Error]', err);
    return h.response({ error: 'Failed to fetch comments' }).code(500);
  }
};

const deleteCommentsById = async (req, h) => {
  const { access_token } = req.auth.credentials;
  const { commentId } = req.query;

  if (!commentId) {
    return h.response({ error: 'Missing commentId in query' }).code(400);
  }

  try {
    const youtube = getYouTubeClient(access_token);
    await youtube.comments.delete({ id: commentId });
    return h.response({ success: true, message: 'Comment deleted' }).code(200);
  } catch (err) {
    console.error('[Comment Delete Error]', err);
    return h.response({ error: 'Failed to delete comment' }).code(500);
  }
};

const saveDeletedCommentById = async (req, h) => {
  const { commentId } = req.query;
  const { videoId, text, author, authorImage, publishedAt, likeCount } = req.payload;

  if (!commentId || !videoId || !text) {
    return h.response({ error: 'Missing required fields' }).code(400);
  }

  try {
    await db
      .collection('deletedComments')
      .doc(commentId)
      .set({
        commentId,
        videoId,
        text,
        author: author || null,
        authorImage: authorImage || null,
        publishedAt: publishedAt || null,
        likeCount: likeCount || 0,
        deletedAt: new Date().toISOString(),
      });

    return h.response({ success: true, message: 'Comment saved' }).code(200);
  } catch (err) {
    console.error('[Firestore Error]', err);
    return h.response({ error: 'Failed to save comment log' }).code(500);
  }
};

module.exports = {
  getUserVideos,
  getComments,
  getUserChannels,
  getVideosByChannelId,
  deleteCommentsById,
  saveDeletedCommentById,
};
