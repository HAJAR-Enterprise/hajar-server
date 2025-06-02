const admin = require('firebase-admin');
const path = require('path');

admin.initializeApp({
  credential: admin.credential.cert(
    require(path.resolve('../hajar-server/src/config/serviceAccountKey.json'))
  ),
});

const verifyIdToken = async (token) => {
  return await admin.auth().verifyIdToken(token);
};



module.exports = { verifyIdToken };
