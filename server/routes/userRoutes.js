const express = require('express');
const {
  getUserByUsername,
  getMeProfile,
  getUserCollection,
  getUserPosts,
  updateProfile,
  getSettings,
  changePassword,
  updatePrivacy,
  updateNotifications,
  getFollowers,
  getFollowing,
  followUser,
} = require('../controllers/userController');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Settings routes must be declared before '/:username', otherwise
// "settings" would be captured as a username.
router.get('/settings', protect, getSettings);
router.put('/settings/change-password', protect, changePassword);
router.put('/settings/privacy', protect, updatePrivacy);
router.put('/settings/notifications', protect, updateNotifications);

router.put('/profile', protect, updateProfile);
router.get('/me', protect, getMeProfile);

// A public profile is readable without signing in. optionalAuth attaches the
// viewer when a token is present so the response can personalise itself
// ("is this you?", "do you already follow them?").
router.get('/:username', optionalAuth, getUserByUsername);
router.get('/:username/followers', optionalAuth, getFollowers);
router.get('/:username/following', optionalAuth, getFollowing);
router.get('/:username/collection', optionalAuth, getUserCollection);
router.get('/:username/posts', optionalAuth, getUserPosts);
router.post('/:id/follow', protect, followUser);

module.exports = router;