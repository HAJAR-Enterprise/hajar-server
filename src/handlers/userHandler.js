const jwt = require('jsonwebtoken');
const admin = require('../auth/firebaseAuth');
const db = admin.firestore();
const hash = require('object-hash');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'; // fallback buat dev

const saveUserData = async (req, h) => {
  const { userInfo, accessToken } = req.payload;

  try {
    // Hash user sub 
    const hashSub = hash(userInfo.sub.toString());

    // Simpan ke Firestore
    await db.collection('users').doc(userInfo.email).set({
      hash_sub: hashSub,
      email_verified: !!userInfo.email_verified,
      family_name: userInfo.family_name || '',
      given_name: userInfo.given_name || '',
      name: userInfo.name || '',
      picture: userInfo.picture || '',
      access_token: accessToken || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Buat payload JWT
    const payload = {
      email_verified: userInfo.email_verified,
      family_name: userInfo.family_name,
      given_name: userInfo.given_name,
      name: userInfo.name,
      picture: userInfo.picture,
      access_token: accessToken,
    };

    // Buat token (valid 1 jam)
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    return h.response({
      success: true,
      token, // ← ✅ JWT dikirim ke frontend
    }).code(200);
  } catch (error) {
    console.error('[ Error saving user data]', error);
    return h.response({ error: 'Failed to save user data' }).code(500);
  }
};

module.exports = { saveUserData };
