/**
 * A small in-memory rate limiter for the auth routes.
 *
 * It exists to answer the obvious security question - "what stops someone
 * brute-forcing the password?" - without pulling in a dependency. Failed
 * logins are the thing worth throttling, so the counter resets on success.
 *
 * Note: state lives in this process. That is fine for a single-node app and
 * for the scale this project targets; a multi-instance deployment would move
 * the counters to Redis.
 */
const buckets = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10;

const sweep = (now) => {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

/**
 * @param {object} options
 * @param {number} options.max        attempts allowed inside the window
 * @param {number} options.windowMs   window length in milliseconds
 * @param {string} options.message    body returned once the limit is hit
 * @param {(req) => boolean} [options.skip] requests that should not count
 */
const rateLimit = ({ max = MAX_ATTEMPTS, windowMs = WINDOW_MS, message, skip } = {}) => {
  return (req, res, next) => {
    if (skip && skip(req)) return next();

    const now = Date.now();
    sweep(now);

    // Keyed by IP plus whatever identifier the caller supplied, so one
    // attacker cannot lock every user out by hammering a shared username.
    const key = `${req.ip}|${String(req.body?.email || req.body?.username || '').toLowerCase()}`;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    if (bucket.count >= max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        message: message || `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
      });
    }

    bucket.count += 1;
    return next();
  };
};

/** Called after a successful login so the counter starts fresh. */
const resetLimit = (req) => {
  const key = `${req.ip}|${String(req.body?.email || req.body?.username || '').toLowerCase()}`;
  buckets.delete(key);
};

module.exports = { rateLimit, resetLimit, MAX_ATTEMPTS, WINDOW_MS };
