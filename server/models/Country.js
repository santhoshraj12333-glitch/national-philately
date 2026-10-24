const mongoose = require('mongoose');

/**
 * A real country record so the catalogue is a genuine international
 * catalogue rather than a free-text field on every stamp.
 */
const countrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    iso2: { type: String, required: true, unique: true, trim: true, uppercase: true },
    iso3: { type: String, required: true, unique: true, trim: true, uppercase: true },
    flag: { type: String, default: '' },
    region: { type: String, required: true, trim: true },
    currency: { type: String, default: '' },
    firstIssueYear: { type: Number, default: null },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

countrySchema.index({ region: 1 });
countrySchema.index({ name: 'text' });

module.exports = mongoose.model('Country', countrySchema);
