require("dotenv").config();

module.exports = {
  clientId: process.env.YOUTUBE_CLIENT_ID,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  redirectUri: process.env.YOUTUBE_REDIRECT_URI,
};
