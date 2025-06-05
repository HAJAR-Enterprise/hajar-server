const { getVideos } = require("../handlers/video");

module.exports = [
  {
    method: "GET",
    path: "/api/{channelId}/video",
    handler: getVideos,
  },
];
