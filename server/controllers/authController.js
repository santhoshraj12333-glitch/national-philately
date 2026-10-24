const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Follow = require('../models/Follow');
const { getUserAchievements } = require('../utils/achievements');
const { resetLimit } = require('../middleware/rateLimit');

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const generateToken = (id, remember = true) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: remember ? '30d' : '12h',
  });

/** The shape the client stores and the auth context expects. */
const publicUser = (user) => ({
  _id: user._id,
  name: user.name,
  username: user.username,
  email: user.email,
  profileImage: user.profileImage,
  bio: user.bio,
  role: user.role,
  token: generateToken(user._id),
});

const register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
    });

    res.status(201).json(publicUser(user));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Signs a collector in with either their email address or their username.
 *
 * The username column is already unique, so accepting both costs nothing and
 * removes the need to remember which of the two a person registered with.
 */
const login = async (req, res) => {
  try {
    const { email, username, password, remember = true } = req.body;
    const identifier = String(email || username || '').trim().toLowerCase();

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Please provide your email or username and password' });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(400).json({ message: 'Account has been deactivated' });
    }

    // A successful sign-in clears the throttle counter for this identity.
    resetLimit(req);

    res.json({ ...publicUser(user), token: generateToken(user._id, remember) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const [user, earned, followerCount, followingCount] = await Promise.all([
      User.findById(req.user._id).select('-password'),
      getUserAchievements(req.user._id),
      Follow.countDocuments({ following: req.user._id }),
      Follow.countDocuments({ follower: req.user._id }),
    ]);

    res.json({
      ...user.toObject(),
      achievements: earned.filter((e) => e.achievement).map((e) => e.achievement),
      achievementCount: earned.length,
      followerCount,
      followingCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/* -------------------------------------------------------------------------
 * Google sign-in
 *
 * Implemented directly against Google's OAuth 2.0 endpoints with the
 * built-in fetch, so the project needs no extra dependency. Everything is
 * optional: if the client id/secret are absent from .env the sign-in button
 * is hidden by the client and these routes report that plainly.
 * ---------------------------------------------------------------------- */

const googleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const googleRedirectUri =
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';

// Short-lived CSRF state for the OAuth round trip.
const oauthStates = new Map();
const STATE_TTL_MS = 10 * 60 * 1000;

const pruneStates = () => {
  const now = Date.now();
  for (const [key, expiry] of oauthStates) {
    if (expiry <= now) oauthStates.delete(key);
  }
};

/** Tells the client which sign-in methods are actually available. */
const getProviders = (req, res) => {
  res.json({ google: googleConfigured() });
};

const startGoogleAuth = (req, res) => {
  if (!googleConfigured()) {
    return res.status(503).json({
      message:
        'Google sign-in is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to server/.env',
    });
  }

  pruneStates();
  const state = require('crypto').randomBytes(16).toString('hex');
  oauthStates.set(state, Date.now() + STATE_TTL_MS);

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

const handleGoogleCallback = async (req, res) => {
  const { code, state } = req.query;

  const expiry = state && oauthStates.get(state);
  oauthStates.delete(state);
  if (!expiry || expiry <= Date.now()) {
    return res.redirect(`${CLIENT_URL}/login?error=oauth_state`);
  }
  if (!code) {
    return res.redirect(`${CLIENT_URL}/login?error=oauth_no_code`);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: googleRedirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`token exchange failed with ${tokenRes.status}`);
    }
    const { access_token: accessToken } = await tokenRes.json();

    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!infoRes.ok) {
      throw new Error(`userinfo failed with ${infoRes.status}`);
    }
    const profile = await infoRes.json();

    const email = String(profile.email || '').toLowerCase();
    if (!email) throw new Error('Google account has no email address');

    let user = await User.findOne({ googleId: profile.sub });

    if (!user) {
      const existing = await User.findOne({ email });
      if (existing) {
        // Same person, now signing in with Google too. Link the account
        // rather than creating a duplicate.
        existing.googleId = profile.sub;
        if (!existing.profileImage && profile.picture) {
          existing.profileImage = profile.picture;
        }
        await existing.save();
        user = existing;
      } else {
        const base =
          String(email.split('@')[0])
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, '')
            .slice(0, 20) || 'collector';

        let username = base;
        let suffix = 1;
        while (await User.exists({ username })) {
          username = `${base}${suffix}`;
          suffix += 1;
        }

        user = await User.create({
          name: profile.name || base,
          username,
          email,
          // A random password: the account is usable through Google, but has
          // no password anyone could guess or reuse from a data breach.
          password: await bcrypt.hash(require('crypto').randomBytes(24).toString('hex'), 10),
          profileImage: profile.picture || '',
          googleId: profile.sub,
        });
      }
    }

    if (!user.isActive) {
      return res.redirect(`${CLIENT_URL}/login?error=account_deactivated`);
    }

    const token = generateToken(user._id);
    return res.redirect(`${CLIENT_URL}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (error) {
    console.error('Google sign-in error:', error.message);
    return res.redirect(`${CLIENT_URL}/login?error=oauth_failed`);
  }
};

module.exports = {
  register,
  login,
  getMe,
  getProviders,
  startGoogleAuth,
  handleGoogleCallback,
};
