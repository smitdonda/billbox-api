const { User } = require("../models");
const ApiError = require("../utils/ApiError");
const { hashPassword, verifyPassword } = require("../utils/password");
const { createToken } = require("../utils/token");

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
    // two sign-ups with the same email at the same time
    if (error?.code === 11000) {
      throw ApiError.unprocessable("User Already Exists");
    }
    throw error;
  }
};

// Returns null for wrong credentials so the controller can count the attempt
const authenticate = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  const ok = user ? await verifyPassword(password, user.password) : false;
  if (!ok) return null;

  const { token, expiresAt } = createToken(user._id);
  return { user, token, expiresAt };
};

module.exports = { toPublicUser, registerUser, authenticate };
