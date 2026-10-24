const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    profileImage: { type: String, default: '' },
    bio: { type: String, default: '' },
    interests: [{ type: String, trim: true }],
    isPrivate: { type: Boolean, default: false },
    notifyLikes: { type: Boolean, default: true },
    notifyComments: { type: Boolean, default: true },
    notifyFollows: { type: Boolean, default: true },
    notifyAchievements: { type: Boolean, default: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isActive: { type: Boolean, default: true },

    // Set only for accounts created through Google sign-in. Sparse + unique
    // so ordinary accounts are unaffected by the index.
    googleId: { type: String, default: undefined, sparse: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
