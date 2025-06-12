const { getAuthUrl, getTokens, getUserProfile } = require('../auth/oauth');
const { saveToken, getToken } = require('../auth/token');
const { oauth2Client } = require('../auth/oauth');
const db = require('../config/firebase');

const frontendUrl = process.env.FRONTEND_URL || "http://0.0.0.0:3000";

const loginHandler = async (request, h) => {
  const authUrl = getAuthUrl();
  return h.redirect(authUrl).code(302);
};

const callbackHandler = async (request, h) => {
  const { code } = request.query;
  if (!code) {
    return h.response({ error: 'Code not provided' }).code(400);
  }

  try {
    const tokens = await getTokens(code);
    console.log('Received Tokens in Callback:', tokens);
    const tokenInfo = await oauth2Client.getTokenInfo(tokens.access_token);
    console.log('Token Info:', tokenInfo);
    const userId = tokenInfo.sub;
    if (!userId || userId.trim() === '') {
      return h.response({ error: 'Invalid user ID from token info' }).code(400);
    }
    await saveToken(userId, tokens);
    console.log('Token saved for user:', userId);
    const profile = await getUserProfile(tokens);
    console.log('User Profile:', profile);
    return h.redirect(
      `${frontendUrl}/dashboard?token=${
        tokens.access_token
      }&userId=${userId}&name=${encodeURIComponent(profile.name)}`
    );
  } catch (error) {
    console.error('OAuth Error:', error.message);
    if (error.message.includes('invalid_grant')) {
      return h
        .response({
          error: 'Invalid authorization code, please try logging in again',
        })
        .code(401);
    }
    return h.response({ error: error.message }).code(500);
  }
};

const logoutHandler = async (request, h) => {
  console.log(request.route.settings.auth);

  const { credentials } = request.auth;
  console.log(credentials);

  const userId = credentials.userId;

  try {
    await db.collection('tokens').doc(userId).delete();
    return h.response({ message: 'Logout successful' }).code(200);
  } catch (error) {
    console.error('Logout Error:', error);
    return h.response({ error: 'Failed to logout' }).code(500);
  }
};

module.exports = { loginHandler, callbackHandler, logoutHandler };
