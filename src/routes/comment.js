const { getComments, deleteComment } = require("../handlers/comment");

module.exports = [
  {
    method: "GET",
    path: "/api/{channelId}/{videoId}/comments",
    handler: getComments,
  },
  {
    method: "DELETE",
    path: "/api/{channelId}/{videoId}/{commentId}",
    handler: deleteComment,
  },
];
