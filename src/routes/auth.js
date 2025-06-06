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
  },
  {
    method: "GET",
    path: "/api/login/callback",
    handler: callbackHandler,
  },
  {
    method: "POST",
    path: "/api/logout",
    handler: logoutHandler,
    options: {
      auth: "jwt", // Pastikan middleware auth aktif untuk endpoint ini
    },
  },
];
