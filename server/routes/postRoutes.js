const express = require('express');
const {
  getPosts,
  getPost,
  createPost,
  deletePost,
  likePost,
  savePost,
  getSavedPosts,
  getComments,
  addComment,
  deleteComment,
} = require('../controllers/postController');
const { protect, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// The feed is public, but a signed-in viewer sees the posts of the private
// collectors they actually follow.
router.get('/', optionalAuth, getPosts);
router.get('/saved', protect, getSavedPosts);
router.get('/:id', optionalAuth, getPost);
router.post('/', protect, createPost);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, likePost);
router.post('/:id/save', protect, savePost);
router.get('/:id/comments', optionalAuth, getComments);
router.post('/:id/comments', protect, addComment);
router.delete('/comments/:id', protect, deleteComment);

module.exports = router;
