const {
  loginHandler,
  callbackHandler,
  logoutHandler,
} = require("../handlers/auth");

module.exports = [
  {
    method: "GET",
    path: "/api/login",
    handler: loginHandler,
    options: { auth: false },
  },
  {
    method: "GET",
    path: "/api/login/callback",
    handler: callbackHandler,
    options: { auth: false },
  },
  {
    method: "POST",
    path: "/api/logout",
    handler: logoutHandler,
    options: { auth: "oauth" },
  },
];
