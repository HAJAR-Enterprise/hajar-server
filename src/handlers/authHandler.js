const { verifyIdToken } = require('../services/firebaseService');

const verifyFirebaseUser = async (request, h) => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  const user = await verifyIdToken(token); 
  return h.response({ message: 'Authorized', user });
};

module.exports = { verifyFirebaseUser };