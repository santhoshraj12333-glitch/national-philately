const mongoose = require('mongoose');

/**
 * A stamp series is a numbered set issued together by one country
 * (for example a 4-stamp "Wildlife" definitive set).
 * Collection Gaps is computed against these: "you own 8 of 12".
 */
const seriesSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    category: { type: String, required: true, trim: true },
    theme: { type: String, required: true, trim: true },
    issuedFrom: { type: Number, default: null },
    issuedTo: { type: Number, default: null },
    totalStamps: { type: Number, default: 0 },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

seriesSchema.index({ name: 1, country: 1 });
seriesSchema.index({ country: 1, theme: 1 });

module.exports = mongoose.model('Series', seriesSchema);
