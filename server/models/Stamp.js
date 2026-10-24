const mongoose = require('mongoose');

const stampSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Two independent axes, per the locked spec:
    //   category = philatelic class  (Commemorative, Definitive, ...)
    //   theme    = subject matter    (Space, Independence, ...)
    category: { type: String, required: true, trim: true },
    theme: { type: String, required: true, trim: true },

    country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', required: true },
    countryName: { type: String, required: true, trim: true },
    year: { type: Number, required: true },

    series: { type: mongoose.Schema.Types.ObjectId, ref: 'Series', default: null },
    seriesNumber: { type: Number, default: null },

    denomination: { type: String, default: '' },
    person: { type: String, default: '' },        // depicted person, for search
    description: { type: String, default: '' },
    story: { type: String, default: '' },
    designNote: { type: String, default: '' },    // "what the stamp represents"
    image: { type: String, default: '' },

    // Attribution for images that are not our own generated artwork.
    source: { type: String, default: '' },
    sourceUrl: { type: String, default: '' },
    credit: { type: String, default: '' },
    license: { type: String, default: '' },
    licenseUrl: { type: String, default: '' },

    viewCount: { type: Number, default: 0 },      // drives "Popular" sorting
  },
  { timestamps: true }
);

stampSchema.index({ category: 1, theme: 1 });
stampSchema.index({ country: 1, year: 1 });
stampSchema.index({ year: 1 });
stampSchema.index({ series: 1, seriesNumber: 1 });
stampSchema.index({ viewCount: -1 });
stampSchema.index({ name: 'text', person: 'text', description: 'text' });

module.exports = mongoose.model('Stamp', stampSchema);
