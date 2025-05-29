const { verifyIdToken } = require('../services/firebaseServices');

const verifyFirebaseUser = async (request, h) => {
  const idToken = request.headers.authorization?.replace('Bearer ', '');
  if (!idToken) return h.response({ message: 'Unauthorized' }).code(401);

  try {
    const user = await verifyIdToken(idToken);
    return h.response({ message: 'Authorized', user }).code(200);
  } catch (err) {
    return h.response({ message: 'Invalid token' }).code(401);
  }
};

module.exports = { verifyFirebaseUser };
