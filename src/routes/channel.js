const {
  getChannels,
  syncChannelsFromYouTube,
} = require("../handlers/channel");

module.exports = [
  {
    method: "GET",
    path: "/api/channels",
    handler: getChannels,
  
  },
  {
    method: "PUT",
    path: "/api/channels/sync",
    handler: syncChannelsFromYouTube,
   
  },
];
