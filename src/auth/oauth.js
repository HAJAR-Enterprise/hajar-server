const { google } = require("googleapis");
require("dotenv").config();

const oauth2Client = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  process.env.YOUTUBE_REDIRECT_URI
);

const scopes = [
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "profile", // Tambah scope untuk informasi pengguna
];

const getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
};

const getTokens = async (code) => {
  try {
    console.log("Received Code:", code);
    const { tokens } = await oauth2Client.getToken(code);
    console.log("Received Tokens:", tokens);
    return tokens;
  } catch (error) {
    console.error("OAuth Token Error:", error.response?.data || error.message);
    throw new Error(
      `Failed to get tokens: ${error.response?.data?.error || error.message}`
    );
  }
};

module.exports = { oauth2Client, getAuthUrl, getTokens };
