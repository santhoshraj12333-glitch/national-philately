const jwt = require('jsonwebtoken');
const User = require('../models/User');

/** Pulls a bearer token out of the request, if there is one. */
const readToken = (req) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer')) return null;
  return header.split(' ')[1] || null;
};

const protect = async (req, res, next) => {
  try {
    const token = readToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account deactivated' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

/**
 * Attaches the user when a valid token is present, but never rejects the
 * request. Used by endpoints that are genuinely public - a profile page, for
 * instance - yet still want to personalise their answer ("is this you?",
 * "do you already own this?").
 */
const optionalAuth = async (req, res, next) => {
  const token = readToken(req);
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (user && user.isActive) {
      req.user = user;
    }
  } catch {
    // An invalid token is treated as "no token" on a public route.
  }
  return next();
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Not authorized as admin' });
  }
};

module.exports = { protect, optionalAuth, adminOnly };
