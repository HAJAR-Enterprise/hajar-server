const db = require("../config/firebase");
const { encrypt, decrypt } = require("../utils/encrypt");

const saveToken = async (userId, tokens) => {
  const encryptedRefreshToken = encrypt(tokens.refresh_token);
  await db.collection("tokens").doc(userId).set({
    accessToken: tokens.access_token,
    refreshToken: encryptedRefreshToken,
    expiryDate: tokens.expiry_date,
    createdAt: new Date().toISOString(),
  });
};

const getToken = async (userId) => {
  const doc = await db.collection("tokens").doc(userId).get();
  if (!doc.exists) return null;
  const data = doc.data();
  return {
    ...data,
    refreshToken: decrypt(data.refreshToken),
  };
};

const updateToken = async (userId, tokens) => {
  const storedToken = await getToken(userId);
  const encryptedRefreshToken = encrypt(
    tokens.refresh_token || storedToken.refreshToken
  );
  await db.collection("tokens").doc(userId).update({
    accessToken: tokens.access_token,
    refreshToken: encryptedRefreshToken,
    expiryDate: tokens.expiry_date,
  });
};

module.exports = { saveToken, getToken, updateToken };
