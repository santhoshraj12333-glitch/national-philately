const User = require('../models/User');
const Stamp = require('../models/Stamp');
const Post = require('../models/Post');
const Collection = require('../models/Collection');
const {
  deleteStamp: deleteStampCascade,
} = require('./stampController');
const {
  deletePost: deletePostCascade,
} = require('./postController');

const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStamps = await Stamp.countDocuments();
    const totalPosts = await Post.countDocuments();
    const totalCollections = await Collection.countDocuments();
    res.json({ totalUsers, totalStamps, totalPosts, totalCollections });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot deactivate admin' });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: `User ${user.isActive ? 'activated' : 'deactivated'}`, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getStamps = async (req, res) => {
  try {
    const stamps = await Stamp.find().sort({ createdAt: -1 });
    res.json(stamps);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Admin removal of a stamp.
 *
 * This delegates to the one delete handler rather than re-implementing it,
 * so the admin path and the ordinary path can never drift apart and leave
 * orphaned collection rows behind.
 */
const deleteStamp = async (req, res) => deleteStampCascade(req, res);

/**
 * Admin removal of a post. Also delegated, so the post's comments and
 * notifications are cleaned up here exactly as they are for the author.
 */
const deletePost = async (req, res) => deletePostCascade(req, res);

const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'name username profileImage')
      .populate('stamp', 'name image country countryName year')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getStats, getUsers, toggleUserActive, getStamps, deleteStamp, getPosts, deletePost };
