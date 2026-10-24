const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Follow = require('../models/Follow');
const Notification = require('../models/Notification');
const { checkAndUnlockAchievements } = require('../utils/achievements');
const { readPaging, setPagingHeaders } = require('../utils/pagination');

/**
 * The ids of private collectors whose posts this viewer must NOT see.
 *
 * A private profile is supposed to hide its posts from everyone except
 * approved followers, so the public feed has to apply the same rule as
 * /users/:username/posts - otherwise the profile page locks down while the
 * community feed quietly publishes the same content.
 *
 * Returns null when nobody is private, which means no restriction at all.
 */
const hiddenAuthorsFor = async (viewer) => {
  const privateUsers = await User.find({ isPrivate: true }).select('_id');
  const privateIds = privateUsers.map((u) => u._id);
  if (!privateIds.length) return null;

  let allowed = [];
  if (viewer) {
    const followed = await Follow.find({
      follower: viewer._id,
      following: { $in: privateIds },
    }).select('following');
    allowed = followed.map((f) => f.following);
  }

  const hidden = privateIds.filter((id) => {
    if (viewer && id.equals(viewer._id)) return false; // your own posts are yours
    return !allowed.some((a) => a.equals(id));
  });

  return hidden.length ? hidden : null;
};

/** Builds the Mongo filter that hides those authors. */
const authorFilter = (hidden) =>
  hidden && hidden.length ? { user: { $nin: hidden } } : {};

const getPosts = async (req, res) => {
  try {
    const hidden = await hiddenAuthorsFor(req.user);
    const filter = authorFilter(hidden);

    const { wantsPaging, page, limit, skip } = readPaging(req, 12);
    const total = await Post.countDocuments(filter);

    const posts = await Post.find(filter)
      .populate('user', 'name username profileImage')
      .populate('stamp', 'name image country countryName year category theme')
      .sort({ createdAt: -1 })
      .skip(wantsPaging ? skip : 0)
      .limit(wantsPaging ? limit : 0);

    if (wantsPaging) setPagingHeaders(res, { total, page, limit });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** GET /api/posts/:id - one post, used to open a post from a notification. */
const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'name username profileImage')
      .populate('stamp', 'name image country countryName year category theme');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (!(await canViewPost(post, req.user))) {
      return res.status(403).json({
        message: 'This post belongs to a private profile.',
        isPrivate: true,
      });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createPost = async (req, res) => {
  try {
    const { content, image, stamp } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }
    const post = await Post.create({
      user: req.user._id,
      content,
      image: image || '',
      stamp: stamp || null,
    });
    const populated = await post.populate([
      { path: 'user', select: 'name username profileImage' },
      { path: 'stamp', select: 'name image country year' },
    ]);

    await checkAndUnlockAchievements(req.user._id);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Removes a post and everything that pointed at it.
 *
 * Comments and notifications are deleted alongside the post: leaving them
 * behind creates rows that reference a document which no longer exists.
 */
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (post.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Comment.deleteMany({ post: post._id });
    await Notification.deleteMany({ link: `/community?post=${post._id}` });
    await post.deleteOne();
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const likeIndex = post.likes.indexOf(req.user._id);
    if (likeIndex === -1) {
      post.likes.push(req.user._id);
      // Respect the recipient's notifyLikes preference.
      const owner = await User.findById(post.user).select('notifyLikes');
      if (owner?.notifyLikes && post.user.toString() !== req.user._id.toString()) {
        await Notification.create({
          user: post.user,
          type: 'like',
          message: `${req.user.name} liked your post`,
          link: `/community?post=${post._id}`,
        });
      }
    } else {
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const savePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const saveIndex = post.savedBy.indexOf(req.user._id);
    if (saveIndex === -1) {
      post.savedBy.push(req.user._id);
    } else {
      post.savedBy.splice(saveIndex, 1);
    }

    await post.save();
    res.json({ savedBy: post.savedBy, saved: saveIndex === -1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSavedPosts = async (req, res) => {
  try {
    // A saved post whose author has since gone private should disappear too.
    const hidden = await hiddenAuthorsFor(req.user);
    const filter = {
      savedBy: req.user._id,
      ...authorFilter(hidden),
    };

    const { wantsPaging, page, limit, skip } = readPaging(req, 12);
    const total = await Post.countDocuments(filter);

    const posts = await Post.find(filter)
      .populate('user', 'name username profileImage')
      .populate('stamp', 'name image country countryName year category theme')
      .sort({ createdAt: -1 })
      .skip(wantsPaging ? skip : 0)
      .limit(wantsPaging ? limit : 0);

    if (wantsPaging) setPagingHeaders(res, { total, page, limit });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Can this viewer read (and therefore comment on) this post?
 *
 * A post on a public profile is readable by anyone, signed in or not. Only a
 * post whose author has gone private is restricted, and then it behaves
 * exactly like the profile page: the author and their approved followers.
 */
const canViewPost = async (post, viewer) => {
  const author = await User.findById(post.user).select('isPrivate');
  if (!author?.isPrivate) return true;
  if (!viewer) return false;
  if (post.user.toString() === viewer._id.toString()) return true;

  const follows = await Follow.exists({
    follower: viewer._id,
    following: post.user,
  });
  return Boolean(follows);
};

const getComments = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    // A private collector's post keeps its comments private too.
    if (!(await canViewPost(post, req.user))) {
      return res.status(403).json({
        message: 'This post belongs to a private profile.',
        isPrivate: true,
      });
    }

    const comments = await Comment.find({ post: post._id })
      .populate('user', 'name username profileImage')
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    if (!(await canViewPost(post, req.user))) {
      return res.status(403).json({
        message: 'This post belongs to a private profile.',
        isPrivate: true,
      });
    }

    const comment = await Comment.create({
      post: post._id,
      user: req.user._id,
      content,
    });
    const populated = await comment.populate('user', 'name username profileImage');

    // Respect the recipient's notifyComments preference.
    const owner = await User.findById(post.user).select('notifyComments');
    if (owner?.notifyComments && post.user.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: post.user,
        type: 'comment',
        message: `${req.user.name} commented on your post`,
        link: `/community?post=${post._id}`,
      });
    }

    await checkAndUnlockAchievements(req.user._id);

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    if (comment.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await comment.deleteOne();
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
