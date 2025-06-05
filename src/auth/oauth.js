const { google } = require("googleapis");
const { clientId, clientSecret, redirectUri } = require("../config/youtube");

const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri
);

const scopes = ["https://www.googleapis.com/auth/youtube.force-ssl"];

const getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });
};

const getTokens = async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

module.exports = { oauth2Client, getAuthUrl, getTokens };
