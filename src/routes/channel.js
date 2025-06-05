const { getChannels } = require("../handlers/channel");

module.exports = [
  {
    method: "GET",
    path: "/api/channel",
    handler: getChannels,
  },
];
