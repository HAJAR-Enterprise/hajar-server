const { getToken, updateToken } = require("../auth/token");
const { oauth2Client } = require("../auth/oauth");

const authMiddleware = async (request, h) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return h
      .response({ error: "Authorization header missing or invalid" })
      .code(401)
      .takeover();
  }

  const token = authHeader.split(" ")[1];
  const userId = "user1"; // Sementara, nanti ganti dengan ID dari token

  const storedToken = await getToken(userId);
  if (!storedToken) {
    return h.response({ error: "Token not found" }).code(401).takeover();
  }

  // Set credentials dengan refresh_token untuk memungkinkan refresh
  oauth2Client.setCredentials({
    access_token: token,
    refresh_token: storedToken.refreshToken,
  });

  try {
    const tokenInfo = await oauth2Client.getAccessToken();
    console.log("Token Info:", tokenInfo.token); // Debug
    request.auth = { credentials: { userId, token: tokenInfo.token || token } };
    return h.continue;
  } catch (error) {
    console.error(
      "Middleware Auth Error:",
      error.response?.data || error.message
    );
    if (error.response?.status === 401) {
      try {
        console.log("Attempting to refresh token...");
        const refreshedTokens = await oauth2Client.refreshAccessToken();
        console.log("Refreshed Tokens:", refreshedTokens.credentials);
        oauth2Client.setCredentials(refreshedTokens.credentials);
        await updateToken(userId, {
          access_token: refreshedTokens.credentials.access_token,
          expiry_date: refreshedTokens.credentials.expiry_date,
          refresh_token:
            refreshedTokens.credentials.refresh_token ||
            storedToken.refreshToken,
        });
        request.auth = {
          credentials: {
            userId,
            token: refreshedTokens.credentials.access_token,
          },
        };
        return h.continue;
      } catch (refreshError) {
        console.error(
          "Token Refresh Error:",
          refreshError.response?.data || refreshError.message
        );
        return h
          .response({ error: "Failed to refresh token" })
          .code(401)
          .takeover();
      }
    }
    return h.response({ error: "Invalid credentials" }).code(401).takeover();
  }
};

module.exports = { authMiddleware };
