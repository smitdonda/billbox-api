const { LoginAttempt } = require("../models");
const ApiError = require("../utils/ApiError");

const WINDOW_MS = 15 * 60 * 1000;

/*
 * Two independent budgets, because they stop different attacks:
 *
 *  - per email  — someone guessing one account's password. Tight.
 *  - per IP     — someone spraying one password across many accounts. Looser,
 *                 since a shop behind one NAT is many staff on one address.
 *
 * Keys are scoped ("login:", "signup:") so signing up cannot spend the budget
 * that protects signing in, or the other way round.
 */
const LIMITS = { email: 5, ip: 20 };

/** The keys one attempt spends budget against. */
const throttleKeys = ({ scope, ip, email }) => {
  const keys = [{ key: `${scope}:ip:${ip}`, limit: LIMITS.ip }];
  if (email) {
    keys.unshift({ key: `${scope}:email:${email}`, limit: LIMITS.email });
  }
  return keys;
};

/**
 * Whether this request may go ahead at all.
 * Returns `{ blocked, retryAfter }` — seconds until the tightest window ends.
 */
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

/** Charge one attempt to every key, opening a fresh window where none is live. */
const recordAttempt = async (keys) => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + WINDOW_MS);

  await Promise.all(
    keys.map(async ({ key }) => {
      // A window already running: add to it, keeping its original end time so
      // failures cannot extend the lockout indefinitely.
      const live = await LoginAttempt.findOneAndUpdate(
        { key, expiresAt: { $gt: now } },
        { $inc: { attempts: 1 } }
      );
      if (live) return;

      // No live window — start one. Overwrites any expired document still
      // waiting on the TTL sweep.
      await LoginAttempt.findOneAndUpdate(
        { key },
        { $set: { attempts: 1, expiresAt } },
        { upsert: true }
      );
    })
  );
};

/** A correct password wipes the slate for that email and address. */
const clearAttempts = async (keys) => {
  await LoginAttempt.deleteMany({ key: { $in: keys.map((k) => k.key) } });
};

/**
 * Refuses the request outright when the budget is spent.
 *
 * Returns the keys, so the caller can charge a failure or clear the slate
 * without rebuilding them.
 */
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
