const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stamp: { type: mongoose.Schema.Types.ObjectId, ref: 'Stamp', required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

collectionSchema.index({ user: 1, stamp: 1 }, { unique: true });

module.exports = mongoose.model('Collection', collectionSchema);
