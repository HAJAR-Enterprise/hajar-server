const { verifyFirebaseUser } = require('../auth/firebaseAuth');

module.exports = [
  {
    method: 'POST',
    path: '/auth/firebase',
    handler: verifyFirebaseUser,
    options: {
      auth: false, // tidak perlu login untuk akses ini
    },
  },
];
