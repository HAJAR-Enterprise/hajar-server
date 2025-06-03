const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

const authMiddleware = async (request, h) => {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return h.response({ error: 'Missing or invalid Authorization header' }).code(401).takeover();
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Inject user data ke request.auth.credentials
    request.auth = {
      isAuthenticated: true,
      credentials: decoded,
    };

    return h.continue;
  } catch (err) {
    console.error('[JWT verification failed]', err);
    return h.response({ error: 'Invalid or expired token' }).code(401).takeover();
  }
};

module.exports = { authMiddleware };
