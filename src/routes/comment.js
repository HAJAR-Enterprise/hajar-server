const { getComments } = require("../handlers/comment");

module.exports = [
  {
    method: "GET",
    path: "/api/{channelId}/{videoId}/comments",
    handler: getComments,
  },
];
