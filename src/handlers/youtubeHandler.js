const fetch = require('node-fetch');

const getUserVideos = async (req, h) => {
  const { access_token } = req.auth.credentials;

  try {
    // Get the user's YouTube channel ID
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!channelRes.ok) {
      const error = await channelRes.json();
      console.error('[Channel Fetch Error]', error);
      return h.response({ error: 'Failed to get channel info' }).code(403);
    }

    const channelData = await channelRes.json();
    const channelId = channelData?.items?.[0]?.id;

    if (!channelId) {
      console.warn('[Channel Not Found]', channelData);
      return h.response({ error: 'Channel not found' }).code(404);
    }

    // Get recent videos from the user's channel
    const videoRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=10&order=date&type=video`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!videoRes.ok) {
      const error = await videoRes.json();
      console.error('[ Video Fetch Error]', error);
      return h.response({ error: 'Failed to fetch videos' }).code(403);
    }

    const videoData = await videoRes.json();

    const videos = (videoData.items || [])
      .filter(item => item.id?.videoId) // skip non-video results just in case
      .map(item => ({
        title: item.snippet.title,
        videoId: item.id.videoId,
        thumbnail: item.snippet.thumbnails?.medium?.url || '', // use medium quality
        publishedAt: item.snippet.publishedAt,
      }));

    return h.response({ videos }).code(200);
  } catch (err) {
    console.error('[💥 Unexpected Error]', err);
    return h.response({ error: 'Internal server error' }).code(500);
  }
};

const getComments = async (req, h) => {
  const { access_token } = req.auth.credentials; // lebih aman ambil dari auth
  const { videoId } = req.query;

  if (!videoId) {
    return h.response({ error: 'Missing videoId in query' }).code(400);
  }

  try {
    const commentRes = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${encodeURIComponent(videoId)}&maxResults=20&order=time`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (!commentRes.ok) {
      const error = await commentRes.json();
      console.error('[Comment Fetch Error]', error);
      return h.response({ error: 'Failed to fetch comments' }).code(commentRes.status);
    }

    const commentData = await commentRes.json();

    const comments = (commentData.items || []).map(item => {
      const snippet = item.snippet.topLevelComment.snippet;
      return {
        text: snippet.textDisplay,
        author: snippet.authorDisplayName,
        publishedAt: snippet.publishedAt,
        likeCount: snippet.likeCount,
        authorImage: snippet.authorProfileImageUrl
      };
    });

    return h.response({ comments }).code(200);
  } catch (err) {
    console.error('[💥 Unexpected Error]', err);
    return h.response({ error: 'Internal server error' }).code(500);
  }
};


module.exports = { getUserVideos, getComments };
