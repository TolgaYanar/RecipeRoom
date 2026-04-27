const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'reciperoom_secret';

function getTokenFromHeader(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function requireLogin(req, res, next) {
  const token = getTokenFromHeader(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: payload.user_id,
      user_type: payload.user_type,
      username: payload.username,
      email: payload.email,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.user_type)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return next();
  };
}

module.exports = { requireLogin, requireRole, JWT_SECRET };
