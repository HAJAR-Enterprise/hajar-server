const { saveUserData } = require('../handlers/userHandler');
const { getUserVideos } = require('../handlers/youtubeHandler');
const { authMiddleware } = require('../middleware/authMiddleware');

const routes = [
  {
    method: 'POST',
    path: '/youtube/videos',
    options: {
      pre: [{ method: authMiddleware }],
      log: {
        collect: true,
      },
    },

    handler: getUserVideos,
  },
  {
    method: 'POST',
    path: '/user/register',
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

  // ... other routes
];

module.exports = routes;
