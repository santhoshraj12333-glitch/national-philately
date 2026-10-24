const mongoose = require('mongoose');

/**
 * One row per "A follows B" edge.
 *
 * Replacing the old dual embedded arrays on User means:
 *   - follow counts can never drift out of sync, because there is one document
 *   - a unique index makes double-follows impossible without an application-level check
 *   - the graph can be queried by direction without loading whole user documents
 */
const followSchema = new mongoose.Schema(
  {
    follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    following: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

// A user may follow each other user only once, in a given direction.
followSchema.index({ follower: 1, following: 1 }, { unique: true });

followSchema.pre('validate', function preventSelfFollow(next) {
  if (this.follower && this.following && this.follower.equals(this.following)) {
    return next(new Error('You cannot follow yourself'));
  }
  next();
});

module.exports = mongoose.model('Follow', followSchema);