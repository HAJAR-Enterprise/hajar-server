const { saveUserData } = require('../handlers/userHandler');
const {
  getUserVideos,
  getComments,
  getUserChannels,
  getVideosByChannelId,
  deleteCommentsById,
  saveDeletedCommentById,
} = require('../handlers/youtubeHandler');
const { authMiddleware } = require('../middleware/authMiddleware');

const routes = [
  {
    method: 'GET',
    path: '/api/v1/{channelId}/videos',
    options: {
      pre: [{ method: authMiddleware }],
      log: {
        collect: true,
      },
    },

    handler: getVideosByChannelId,
  },
  {
    method: 'POST',
    path: '/api/v1/user/register',
    handler: saveUserData,
    options: {
      payload: {
        parse: true,
        allow: 'application/json',
      },
      log: {
        collect: true,
      },
    },
  },
  {
    method: 'GET',
    path: '/api/v1/youtube/comments',
    options: {
      pre: [{ method: authMiddleware }],
      log: {
        collect: true,
      },
    },

    handler: getComments,
  },
  {
    method: 'GET',
    path: '/api/v1/youtube/channels',
    options: {
      pre: [{ method: authMiddleware }],
      log: {
        collect: true,
      },
    },

    handler: getUserChannels,
  },
  {
    method: 'DELETE',
    path: '/api/v1/youtube/comments',
    options: {
      pre: [{ method: authMiddleware }],
      log: {
        collect: true,
      },
    },

    handler: deleteCommentsById,
  },
  {
    method: 'POST', 
    path: '/api/v1/youtube/comments/save', 
    options: {
      pre: [{ method: authMiddleware }],
      log: {
        collect: true,
      },
    },
    handler: saveDeletedCommentById,
  },

  // ... other routes
];

module.exports = routes;
