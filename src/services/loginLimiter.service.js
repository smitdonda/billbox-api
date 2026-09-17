const { LoginAttempt } = require("../models");
const ApiError = require("../utils/ApiError");

const WINDOW_MS = 15 * 60 * 1000;

// Max attempts per window. The IP limit is higher because a whole shop
// can share one IP address.
const LIMITS = { email: 5, ip: 20 };

const throttleKeys = ({ scope, ip, email }) => {
  const keys = [{ key: `${scope}:ip:${ip}`, limit: LIMITS.ip }];
  if (email) {
    keys.unshift({ key: `${scope}:email:${email}`, limit: LIMITS.email });
  }
  return keys;
};

// Returns how many seconds are left if any key is over its limit
const checkLimit = async (keys) => {
  const now = new Date();
  const records = await LoginAttempt.find({
    key: { $in: keys.map((entry) => entry.key) },
    expiresAt: { $gt: now },
  }).lean();

  const byKey = new Map(records.map((record) => [record.key, record]));

  let retryAfter = 0;
  for (const { key, limit } of keys) {
    const record = byKey.get(key);
    if (record && record.attempts >= limit) {
      const seconds = Math.ceil((record.expiresAt - now) / 1000);
      retryAfter = Math.max(retryAfter, seconds);
    }
  }

  return { blocked: retryAfter > 0, retryAfter };
};

const recordAttempt = async (keys) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + WINDOW_MS);

  await Promise.all(
    keys.map(async ({ key }) => {
      // add to the current window without moving its end time
      const live = await LoginAttempt.findOneAndUpdate(
        { key, expiresAt: { $gt: now } },
        { $inc: { attempts: 1 } }
      );
      if (live) return;

      // otherwise start a new window
      await LoginAttempt.findOneAndUpdate(
        { key },
        { $set: { attempts: 1, expiresAt } },
        { upsert: true }
      );
    })
  );
};

const clearAttempts = async (keys) => {
  await LoginAttempt.deleteMany({ key: { $in: keys.map((k) => k.key) } });
};

// Throws a 429 when the limit is reached, otherwise returns the keys
const enforceLimit = async ({ scope, ip, email, message }) => {
  const keys = throttleKeys({ scope, ip, email });
  const { blocked, retryAfter } = await checkLimit(keys);

  if (blocked) {
    throw ApiError.tooManyRequests(
      message(Math.ceil(retryAfter / 60)),
      retryAfter
    );
  }

  return keys;
};

module.exports = { enforceLimit, recordAttempt, clearAttempts };
