const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Follow = require('../models/Follow');
const Collection = require('../models/Collection');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { checkAndUnlockAchievements, getUserAchievements } = require('../utils/achievements');
const { readPaging, setPagingHeaders } = require('../utils/pagination');

const getUserByUsername = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password -email');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isSelf = req.user ? req.user._id.equals(user._id) : false;

    const [collectionCount, postCount, earned, followerCount, followingCount, isFollowing] =
      await Promise.all([
        Collection.countDocuments({ user: user._id }),
        Post.countDocuments({ user: user._id }),
        getUserAchievements(user._id),
        Follow.countDocuments({ following: user._id }),
        Follow.countDocuments({ follower: user._id }),
        req.user
          ? Follow.exists({ follower: req.user._id, following: user._id }).then(Boolean)
          : Promise.resolve(false),
      ]);

    // A private profile hides collections and posts until the viewer follows them.
    // This must stay in step with resolveVisibleUser, otherwise the profile card
    // would promise content the collection/posts endpoints then refuse.
    const canView = !user.isPrivate || isSelf || isFollowing;

    res.json({
      ...user.toObject(),
      collectionCount,
      postCount,
      achievements: earned.filter((e) => e.achievement).map((e) => e.achievement),
      achievementCount: earned.length,
      followerCount,
      followingCount,
      isFollowing,
      isSelf,
      canView,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMeProfile = async (req, res) => {
  try {
    const [user, earned, followers, following] = await Promise.all([
      User.findById(req.user._id).select('-password'),
      getUserAchievements(req.user._id),
      Follow.find({ following: req.user._id })
        .populate('follower', 'name username profileImage')
        .sort({ createdAt: -1 }),
      Follow.find({ follower: req.user._id })
        .populate('following', 'name username profileImage')
        .sort({ createdAt: -1 }),
    ]);

    const collectionCount = await Collection.countDocuments({ user: user._id });
    const postCount = await Post.countDocuments({ user: user._id });

    res.json({
      ...user.toObject(),
      collectionCount,
      postCount,
      achievements: earned.filter((e) => e.achievement).map((e) => e.achievement),
      achievementCount: earned.length,
      followerCount: followers.length,
      followingCount: following.length,
      // Kept as lightweight lists for the profile UI; counts above are authoritative.
      followers: followers.map((f) => f.follower).filter(Boolean),
      following: following.map((f) => f.following).filter(Boolean),
      isSelf: true,
      canView: true,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Resolves the :username route param, and enforces the private-profile rule.
 * Returns null after sending the response when the viewer is not allowed.
 *
 * A public profile is readable by anyone, including a signed-out visitor; a
 * private one is readable only by its owner and approved followers.
 */
const resolveVisibleUser = async (req, res) => {
  const user = await User.findOne({ username: req.params.username }).select(
    '_id username name isPrivate'
  );
  if (!user) {
    res.status(404).json({ message: 'User not found' });
    return null;
  }

  if (user.isPrivate) {
    const isOwner = req.user && user._id.equals(req.user._id);
    if (!isOwner) {
      const isFollower = req.user
        ? await Follow.exists({ follower: req.user._id, following: user._id })
        : null;
      if (!isFollower) {
        res.status(403).json({
          message: 'This collector has a private profile. Follow them to see their content.',
          isPrivate: true,
        });
        return null;
      }
    }
  }

  return user;
};

const getUserCollection = async (req, res) => {
  try {
    const user = await resolveVisibleUser(req, res);
    if (!user) return;

    const { wantsPaging, page, limit, skip } = readPaging(req, 24);
    const total = await Collection.countDocuments({ user: user._id });

    const items = await Collection.find({ user: user._id })
      .populate('stamp')
      .sort({ addedAt: -1 })
      .skip(wantsPaging ? skip : 0)
      .limit(wantsPaging ? limit : 0);

    if (wantsPaging) setPagingHeaders(res, { total, page, limit });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const user = await resolveVisibleUser(req, res);
    if (!user) return;

    const { wantsPaging, page, limit, skip } = readPaging(req, 24);
    const total = await Post.countDocuments({ user: user._id });

    const posts = await Post.find({ user: user._id })
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

const updateProfile = async (req, res) => {
  try {
    const { name, bio, profileImage, interests } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (profileImage !== undefined) updates.profileImage = profileImage;
    if (interests !== undefined) {
      if (!Array.isArray(interests)) {
        return res.status(400).json({ message: 'Interests must be an array' });
      }
      updates.interests = interests.map((i) => String(i).trim()).filter(Boolean).slice(0, 20);
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** PUT /api/users/settings/change-password */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Please provide currentPassword and newPassword' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    if (currentPassword === newPassword) {
      return res
        .status(400)
        .json({ message: 'New password must be different from the current password' });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    user.password = await bcrypt.hash(newPassword, await bcrypt.genSalt(10));
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** PUT /api/users/settings/privacy */
const updatePrivacy = async (req, res) => {
  try {
    const { isPrivate } = req.body;
    if (typeof isPrivate !== 'boolean') {
      return res.status(400).json({ message: 'isPrivate must be a boolean' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isPrivate },
      { new: true }
    ).select('-password');

    res.json({ isPrivate: user.isPrivate });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/** PUT /api/users/settings/notifications */
const updateNotifications = async (req, res) => {
  try {
    const keys = ['notifyLikes', 'notifyComments', 'notifyFollows', 'notifyAchievements'];
    const updates = {};

    for (const key of keys) {
      if (req.body[key] === undefined) continue;
      if (typeof req.body[key] !== 'boolean') {
        return res.status(400).json({ message: `${key} must be a boolean` });
      }
      updates[key] = req.body[key];
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({ message: 'No notification preferences provided' });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
    }).select('-password');

    res.json({
      notifyLikes: user.notifyLikes,
      notifyComments: user.notifyComments,
      notifyFollows: user.notifyFollows,
      notifyAchievements: user.notifyAchievements,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select(
      'interests isPrivate notifyLikes notifyComments notifyFollows notifyAchievements'
    );
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const followUser = async (req, res) => {
  try {
    const targetId = req.params.id;
    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot follow yourself' });
    }

    const target = await User.findById(targetId);
    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existing = await Follow.findOne({ follower: req.user._id, following: targetId });

    if (existing) {
      await existing.deleteOne();
    } else {
      await Follow.create({ follower: req.user._id, following: targetId });
      if (target.notifyFollows) {
        await Notification.create({
          user: targetId,
          type: 'follow',
          message: `${req.user.name} started following you`,
          link: `/profile/${target.username}`,
        });
      }
    }

    const [followerCount, followingCount] = await Promise.all([
      Follow.countDocuments({ following: targetId }),
      Follow.countDocuments({ follower: req.user._id }),
    ]);

    await checkAndUnlockAchievements(req.user._id);

    res.json({ following: !existing, followerCount, followingCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/users/:username/followers | /following
 *
 * Serves both directions from one query builder; the route decides which by
 * passing an explicit side, so the endpoint can never silently answer with
 * the opposite list.
 */
const getFollowList = (side) => async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('_id');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // "followers" = people who follow this user; "following" = people they follow.
    const filter = side === 'followers' ? { following: user._id } : { follower: user._id };
    const field = side === 'followers' ? 'follower' : 'following';

    const follows = await Follow.find(filter)
      .populate(field, 'name username profileImage bio')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(follows.map((f) => f[field]).filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUserByUsername,
  getMeProfile,
  getUserCollection,
  getUserPosts,
  updateProfile,
  getSettings,
  changePassword,
  updatePrivacy,
  updateNotifications,
  getFollowers: getFollowList('followers'),
  getFollowing: getFollowList('following'),
  followUser,
};
