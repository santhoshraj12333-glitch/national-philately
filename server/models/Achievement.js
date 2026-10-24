const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    icon: { type: String, default: '🏅' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Achievement', achievementSchema);
