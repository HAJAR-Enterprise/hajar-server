const {
  getComments,
  syncCommentsFromYouTube,
  deleteComment,
  deleteAllComments,
} = require("../handlers/comment");

module.exports = [
  {
    method: "GET",
    path: "/api/{channelId}/{videoId}/comments",
    handler: getComments,
   
  },
  {
    method: "POST",
    path: "/api/{channelId}/{videoId}/comments/sync",
    handler: syncCommentsFromYouTube,
 
  },
  {
    method: "DELETE",
    path: "/api/{channelId}/{videoId}/{commentId}",
    handler: deleteComment,
  
  },
  {
    method: "DELETE",
    path: "/api/{channelId}/{videoId}/comments",
    handler: deleteAllComments,
   
  },
];
