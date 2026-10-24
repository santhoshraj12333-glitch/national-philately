const express = require('express');
const {
  getStats,
  getUsers,
  toggleUserActive,
  getStamps,
  deleteStamp,
  getPosts,
  deletePost,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', protect, adminOnly, getStats);
router.get('/users', protect, adminOnly, getUsers);
router.put('/users/:id/toggle', protect, adminOnly, toggleUserActive);
router.get('/stamps', protect, adminOnly, getStamps);
router.delete('/stamps/:id', protect, adminOnly, deleteStamp);
router.get('/posts', protect, adminOnly, getPosts);
router.delete('/posts/:id', protect, adminOnly, deletePost);

module.exports = router;