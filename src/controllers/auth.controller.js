const {
  TOKEN_COOKIE,
  sessionCookieOptions,
  clearCookieOptions,
} = require("../config/cookie");
const { asyncHandler } = require("../middleware/asyncHandler");
const authService = require("../services/auth.service");
const limiter = require("../services/loginLimiter.service");
const { sendSuccess } = require("../utils/apiResponse");
const ApiError = require("../utils/ApiError");
const { clientIp } = require("../utils/clientIp");
const {
  parseSignupBody,
  parseLoginBody,
} = require("../validators/auth.validator");

const signup = asyncHandler(async (req, res) => {
  // every sign-up counts towards the limit, not just failed ones
  const keys = await limiter.enforceLimit({
    scope: "signup",
    ip: clientIp(req),
    message: (minutes) =>
      `Too many sign-ups from this address. Try again in ${minutes} minutes.`,
  });
  await limiter.recordAttempt(keys);

  const values = parseSignupBody(req.body);
  await authService.registerUser(values);

  return sendSuccess(res, {
    status: 201,
    message: "User SignUp Successful",
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = parseLoginBody(req.body);

  const keys = await limiter.enforceLimit({
    scope: "login",
    ip: clientIp(req),
    email,
    message: (minutes) =>
      `Too many failed attempts. Try again in ${minutes} minutes.`,
  });

  const session = await authService.authenticate({ email, password });

  // same message for a wrong password and an unknown email
  if (!session) {
    await limiter.recordAttempt(keys);
    throw ApiError.unauthorized("Invalid email or password");
  }

  await limiter.clearAttempts(keys);

  res.cookie(
    TOKEN_COOKIE,
    session.token,
    sessionCookieOptions(session.expiresAt)
  );

  return sendSuccess(res, {
    data: authService.toPublicUser(session.user, session.expiresAt),
  });
});

const me = (req, res) =>
  sendSuccess(res, { data: authService.toPublicUser(req.user) });

const logout = (req, res) => {
  res.clearCookie(TOKEN_COOKIE, clearCookieOptions());
  return sendSuccess(res, { message: "Signed out" });
};

module.exports = { signup, login, me, logout };
