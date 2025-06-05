const { loginHandler, callbackHandler } = require("../handlers/auth");

module.exports = [
  {
    method: "GET",
    path: "/api/login",
    handler: loginHandler,
  },
  {
    method: "GET",
    path: "/api/login/callback",
    handler: callbackHandler,
  },
];
