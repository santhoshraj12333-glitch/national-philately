const mongoose = require('mongoose');
const Achievement = require('../models/Achievement');
const UserAchievement = require('../models/UserAchievement');
const User = require('../models/User');
const Collection = require('../models/Collection');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const Stamp = require('../models/Stamp');

/**
 * Every rule is called as: check(ctx) where ctx carries the raw counts,
 * so a rule can never silently bind to the wrong argument.
 */
const checkAndUnlockAchievements = async (userId) => {
  try {
    const user = await User.findById(userId).select('notifyAchievements');
    if (!user) return [];

    const [collectionCount, postCount, stamps] = await Promise.all([
      Collection.countDocuments({ user: userId }),
      Post.countDocuments({ user: userId }),
      Collection.find({ user: userId }).populate('stamp', 'category theme series country'),
    ]);

    const ownedStamps = stamps.map((c) => c.stamp).filter(Boolean);

    const ctx = {
      collectionCount,
      postCount,
      wildlifeCount: ownedStamps.filter((s) => s.theme === 'Wildlife').length,
      countryCount: new Set(ownedStamps.map((s) => String(s.country?._id ?? s.country))).size,
      historicalCount: ownedStamps.filter((s) => s.category === 'Historical').length,
      completedSeries: await countCompletedSeries(userId),
    };

    const RULES = [
      { name: 'First Stamp', check: (c) => c.collectionCount >= 1 },
      { name: 'First Post', check: (c) => c.postCount >= 1 },
      { name: '10 Stamps', check: (c) => c.collectionCount >= 10 },
      { name: '50 Stamps', check: (c) => c.collectionCount >= 50 },
      { name: '100 Stamps', check: (c) => c.collectionCount >= 100 },
      { name: 'Community Contributor', check: (c) => c.postCount >= 3 },
      { name: 'History Explorer', check: (c) => c.historicalCount >= 1 },
      { name: 'Wildlife Collector', check: (c) => c.wildlifeCount >= 3 },
      { name: 'International Collector', check: (c) => c.countryCount >= 5 },
      { name: 'First Series', check: (c) => c.completedSeries >= 1 },
    ];

    const allAchievements = await Achievement.find();
    const alreadyEarned = await UserAchievement.find({ user: userId }).select('achievement');
    const earned = new Set(alreadyEarned.map((a) => String(a.achievement)));
    const newlyUnlocked = [];

    for (const achievement of allAchievements) {
      if (earned.has(String(achievement._id))) continue;
      const rule = RULES.find((r) => r.name === achievement.name);
      if (!rule || !rule.check(ctx)) continue;

      // The unique index makes this idempotent, but a concurrent request that
      // wins the race throws E11000 here. Handle it per row so one duplicate
      // can neither abort the remaining unlocks nor discard the notification.
      try {
        await UserAchievement.create({ user: userId, achievement: achievement._id });
      } catch (error) {
        if (error && error.code === 11000) {
          earned.add(String(achievement._id));
          continue;
        }
        throw error;
      }
      earned.add(String(achievement._id));
      newlyUnlocked.push(achievement);
    }

    // Notify the collector, unless they opted out of achievement notifications.
    if (newlyUnlocked.length && user.notifyAchievements) {
      await Notification.insertMany(
        newlyUnlocked.map((a) => ({
          user: userId,
          type: 'achievement',
          message: `You unlocked the "${a.name}" achievement`,
          link: '/profile',
        }))
      );
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Achievement check error:', error.message);
    return [];
  }
};

/** How many series does this user own every stamp in? */
const countCompletedSeries = async (userId) => {
  const owned = await Collection.find({ user: userId }).select('stamp');
  const ownedIds = new Set(owned.map((c) => String(c.stamp)));

  const stamps = await Stamp.find({ series: { $ne: null } }).select('series');
  const totals = new Map();
  for (const s of stamps) {
    const key = String(s.series);
    totals.set(key, (totals.get(key) || 0) + 1);
  }

  const ownedPerSeries = new Map();
  for (const id of ownedIds) {
    const s = stamps.find((x) => String(x._id) === id);
    if (!s) continue;
    const key = String(s.series);
    ownedPerSeries.set(key, (ownedPerSeries.get(key) || 0) + 1);
  }

  let completed = 0;
  for (const [key, have] of ownedPerSeries) {
    if (have >= (totals.get(key) || Infinity)) completed += 1;
  }
  return completed;
};

/** Badges a user has earned, with the achievement document joined in. */
const getUserAchievements = async (userId) =>
  UserAchievement.find({ user: userId })
    .populate('achievement')
    .sort({ earnedAt: -1 });

module.exports = { checkAndUnlockAchievements, countCompletedSeries, getUserAchievements };
