const mongoose = require('mongoose');

/**
 * One row per (user, achievement) pair, recording when it was earned.
 *
 * Replacing the old embedded array of achievement ids on User means:
 *   - the unlock timestamp becomes queryable, so a profile can show "earned 3 days ago"
 *   - the unique index makes a badge impossible to grant twice
 *   - badges can be revoked or audited independently of the user document
 */
const userAchievementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    achievement: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true },
    earnedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// A user may only earn a given achievement once.
userAchievementSchema.index({ user: 1, achievement: 1 }, { unique: true });

module.exports = mongoose.model('UserAchievement', userAchievementSchema);