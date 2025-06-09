const { getVideos, syncVideosFromYouTube } = require("../handlers/video");

module.exports = [
  {
    method: "GET",
    path: "/api/{channelId}/videos",
    handler: getVideos,
 
  },
  {
    method: "GET",
    path: "/api/{channelId}/videos/sync",
    handler: syncVideosFromYouTube,
  
  },
];
