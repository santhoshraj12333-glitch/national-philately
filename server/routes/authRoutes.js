const express = require('express');
const {
  register,
  login,
  getMe,
  getProviders,
  startGoogleAuth,
  handleGoogleCallback,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();

// Failed sign-ins are throttled; successful ones are not blocked.
const loginLimiter = rateLimit({
  max: 10,
  windowMs: 15 * 60 * 1000,
  message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
});

router.get('/providers', getProviders);
router.get('/google', startGoogleAuth);
router.get('/google/callback', handleGoogleCallback);

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.get('/me', protect, getMe);

module.exports = router;
