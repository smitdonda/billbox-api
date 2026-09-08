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
  const ip = clientIp(req);

  /*
   * Throttled on the address alone, and charged before the account is created
   * rather than after a failure: creating accounts is the thing being limited
   * here, so every attempt counts.
   */
  const keys = await limiter.enforceLimit({
    scope: "signup",
    ip,
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

  /*
   * Budget is spent per email and per address, and checked before the password
   * is ever compared, so a locked-out guesser gets no timing signal either.
   */
  const keys = await limiter.enforceLimit({
    scope: "login",
    ip: clientIp(req),
    email,
    message: (minutes) =>
      `Too many failed attempts. Try again in ${minutes} minutes.`,
  });

  const session = await authService.authenticate({ email, password });

  // One message for both "no such user" and "wrong password" — telling them
  // apart lets an attacker enumerate which emails are registered.
  if (!session) {
    await limiter.recordAttempt(keys);
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Proving the password clears the lockout for this email and address.
  await limiter.clearAttempts(keys);

  /*
   * The token goes in an httpOnly cookie and nowhere else. Handing it to
   * JavaScript — the old behaviour, stored with js-cookie — meant any injected
   * script on the page could read a seven-day session and walk off with it.
   */
  res.cookie(
    TOKEN_COOKIE,
    session.token,
    sessionCookieOptions(session.expiresAt)
  );

  return sendSuccess(res, {
    data: authService.toPublicUser(session.user, session.expiresAt),
  });
});

/** Who the cookie belongs to. The client bootstraps its session from this. */
const me = (req, res) =>
  sendSuccess(res, { data: authService.toPublicUser(req.user) });

/*
 * Logging out has to happen server-side: the client cannot delete an httpOnly
 * cookie itself. Always 200 — an expired session logging out is not an error,
 * and telling the caller otherwise only leaks whether it was valid.
 */
const logout = (req, res) => {
  res.clearCookie(TOKEN_COOKIE, clearCookieOptions());
  return sendSuccess(res, { message: "Signed out" });
};

module.exports = { signup, login, me, logout };
