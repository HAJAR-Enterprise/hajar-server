const { getAuthUrl, getTokens } = require("../auth/oauth");
const { saveToken, getToken } = require("../auth/token");

const loginHandler = async (request, h) => {
  const userId = "user1"; // Sementara, nanti ganti dengan ID pengguna
  const existingToken = await getToken(userId);

  if (existingToken) {
    return h
      .response({
        message: "User already logged in",
        token: existingToken.accessToken,
      })
      .code(200);
  }

  const authUrl = getAuthUrl();
  return h.redirect(authUrl).code(302); // Redirect ke Google OAuth
};

const callbackHandler = async (request, h) => {
  const { code } = request.query;
  if (!code) {
    return h.response({ error: "Code not provided" }).code(400);
  }

  try {
    const tokens = await getTokens(code);
    const userId = "user1"; // Sementara, nanti ganti dengan ID pengguna
    await saveToken(userId, tokens);
    return h
      .response({
        message: "Login successful",
        tokens: { accessToken: tokens.access_token },
      })
      .code(200);
  } catch (error) {
    console.error("OAuth Error:", error); // Tambah logging untuk debug
    return h.response({ error: error.message }).code(500);
  }
};

module.exports = { loginHandler, callbackHandler };
