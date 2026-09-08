const { User } = require("../models");
const ApiError = require("../utils/ApiError");
const { hashPassword, verifyPassword } = require("../utils/password");
const { createToken } = require("../utils/token");

/** The account as the client is allowed to see it. Never includes the token. */
const toPublicUser = (user, expiresAt) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  ...(expiresAt ? { expiresAt } : {}),
});

const registerUser = async ({ email, username, password }) => {
  const existing = await User.findOne({ email });
  if (existing) throw ApiError.unprocessable("User Already Exists");

  try {
    await User.create({
      email,
      username,
      password: await hashPassword(password),
    });
  } catch (error) {
    // A racing signup trips the unique index instead of the check above.
    if (error?.code === 11000) {
      throw ApiError.unprocessable("User Already Exists");
    }
    throw error;
  }
};

/**
 * Proves a password and issues a session.
 *
 * Returns null rather than throwing when the credentials are wrong: the caller
 * has a failed attempt to charge against the throttle before it answers, and
 * that bookkeeping is not this function's job.
 */
const authenticate = async ({ email, password }) => {
  // `password` is `select: false` on the model, so ask for it explicitly.
  const user = await User.findOne({ email }).select("+password");

  const ok = user ? await verifyPassword(password, user.password) : false;
  if (!ok) return null;

  const { token, expiresAt } = createToken(user._id);
  return { user, token, expiresAt };
};

module.exports = { toPublicUser, registerUser, authenticate };
