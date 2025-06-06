const { getAuthUrl, getTokens } = require("../auth/oauth");
const { saveToken, getToken } = require("../auth/token");
const { oauth2Client } = require("../auth/oauth");

const loginHandler = async (request, h) => {
  const authUrl = getAuthUrl();
  return h.redirect(authUrl).code(302);
};

const callbackHandler = async (request, h) => {
  const { code } = request.query;
  if (!code) {
    return h.response({ error: "Code not provided" }).code(400);
  }

  try {
    const tokens = await getTokens(code);
    console.log("Received Tokens in Callback:", tokens); // Debug
    const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
    console.log("Token Info:", tokenInfo); // Debug
    const userId = tokenInfo.sub;
    if (!userId || userId.trim() === "") {
      return h.response({ error: "Invalid user ID from token info" }).code(400);
    }
    await saveToken(userId, tokens);
    return h
      .response({
        message: "Login successful",
        tokens: { accessToken: tokens.access_token },
      })
      .code(200);
  } catch (error) {
    console.error("OAuth Error:", error.message);
    if (error.message.includes("invalid_grant")) {
      return h
        .response({
          error: "Invalid authorization code, please try logging in again",
        })
        .code(401);
    }
    return h.response({ error: error.message }).code(500);
  }
};

module.exports = { loginHandler, callbackHandler };
