const db = require("../config/firebase");

const saveToken = async (userId, tokens) => {
  await db.collection("tokens").doc(userId).set({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token, // Simpan plain text
    expiryDate: tokens.expiry_date,
    createdAt: new Date().toISOString(),
  });
};

const getToken = async (userId) => {
  const doc = await db.collection("tokens").doc(userId).get();
  if (!doc.exists) return null;
  return doc.data();
};

const updateToken = async (userId, tokens) => {
  const storedToken = await getToken(userId);
  await db
    .collection("tokens")
    .doc(userId)
    .update({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || storedToken.refreshToken, // Simpan plain text
      expiryDate: tokens.expiry_date,
    });
};

module.exports = { saveToken, getToken, updateToken };
