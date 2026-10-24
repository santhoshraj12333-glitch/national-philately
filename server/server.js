require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const stampRoutes = require('./routes/stampRoutes');
const countryRoutes = require('./routes/countryRoutes');
const seriesRoutes = require('./routes/seriesRoutes');
const collectionRoutes = require('./routes/collectionRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors());
// Raised so the admin stamp form can post an image as a data URL.
app.use(express.json({ limit: '6mb' }));

connectDB();

// Stamp scans live on disk and are read-only; they are served under /api so
// the Vite dev proxy forwards them without any extra configuration.
app.use(
  '/api/stamps/files',
  express.static(path.join(__dirname, 'public', 'stamps'), { dotfiles: 'deny', index: false })
);

app.use('/api/auth', authRoutes);
app.use('/api/countries', countryRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/stamps', stampRoutes);
app.use('/api/collection', collectionRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to National Philately API' });
});

/**
 * Unknown API routes answer with JSON, not Express's default HTML page.
 * A client that asked for JSON must never be handed a web page - that is
 * exactly how "Could not load the community feed" happens with no clue why.
 */
app.use('/api', (req, res) => {
  res.status(404).json({
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

/**
 * The single place errors are turned into a response.
 *
 * Controllers signal an expected failure by setting `err.status`; anything
 * else is an unexpected fault and is reported as a generic 500 so that
 * database internals, stack traces and file paths never reach the browser.
 */
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  const status = err.status || err.statusCode || 500;

  if (status >= 500) {
    console.error(`[${req.method} ${req.originalUrl}]`, err);
  }

  const body = { message: err.message || 'Something went wrong' };

  // A duplicate-key failure is a user mistake, not a crash: say which field
  // clashed instead of leaking the Mongo index name.
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    res.status(409).json({ message: `That ${field} is already taken` });
    return;
  }

  res.status(status).json(body);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
