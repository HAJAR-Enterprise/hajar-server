const { getReport } = require("../handlers/report");

module.exports = [
  {
    method: "GET",
    path: "/api/report",
    handler: getReport,
  },
];
