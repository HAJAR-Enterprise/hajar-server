const { getToken, updateToken } = require("../auth/token");
const { oauth2Client } = require("../auth/oauth");
const db = require("../config/firebase");

const authMiddleware = async (request, h) => {
  // Skip middleware untuk endpoint login/callback
  if (request.path === "/api/login/callback") {
    return h.continue;
  }
  if (request.path === "/api/login") {
    return h.continue;
  }

  //check header
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return h
      .response({ error: "Authorization header missing or invalid" })
      .code(401)
      .takeover();
  }

  const token = authHeader.split(" ")[1];
  oauth2Client.setCredentials({ access_token: token });

  try {
    const tokenInfo = await oauth2Client.getTokenInfo(token);

    const userId = tokenInfo.sub;
    if (!userId || userId.trim() === "") {
      throw new Error("User ID not found in token info");
    }

    const storedToken = await getToken(userId);
    if (!storedToken) {
      return h
        .response({ error: "Token tidak terdaftar" })
        .code(401)
        .takeover();
    }

    oauth2Client.setCredentials({
      access_token: token,
      refresh_token: storedToken.refreshToken,
    });

    request.auth = { credentials: { userId, token: tokenInfo.token || token } };
    
    
    return h.continue;
  } catch (error) {
    console.error(
      "Middleware Auth Error:",
      error.response?.data || error.message
    );
    if (error.response?.status === 401 || error.response?.status === 400) {
      try {
        console.log("Attempting to refresh token...");
        const tokenInfo = await oauth2Client.getTokenInfo(token);
        const userId = tokenInfo.sub;
        if (!userId || userId.trim() === "") {
          throw new Error("User ID not found in token info during refresh");
        }

        const storedToken = await getToken(userId);
        if (!storedToken) {
          return h
            .response({ error: "Token tidak terdaftar" })
            .code(401)
            .takeover();
        }

        oauth2Client.setCredentials({
          access_token: token,
          refresh_token: storedToken.refreshToken,
        });

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
        if (refreshError.response?.data?.error === "invalid_grant") {
          const tokenInfo = await oauth2Client
            .getTokenInfo(token)
            .catch(() => ({}));
          const userId = tokenInfo.sub || "unknown";
          await db.collection("tokens").doc(userId).delete();
          return h
            .response({ error: "Refresh token invalid, please login again" })
            .code(401)
            .takeover();
        }
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
