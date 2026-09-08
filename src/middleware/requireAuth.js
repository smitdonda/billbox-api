const { TOKEN_COOKIE } = require("../config/cookie");
const { User } = require("../models");
const ApiError = require("../utils/ApiError");
const { verifyToken } = require("../utils/token");
const { asyncHandler } = require("./asyncHandler");

/**
 * The session token, preferring the httpOnly cookie the browser sends on its
 * own. The Authorization header is still read so non-browser API clients keep
 * working.
 */
const readToken = (req) => {
  const cookie = req.cookies?.[TOKEN_COOKIE];
  if (cookie) return String(cookie).trim();

  const header = req.headers?.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
};

/** jsonwebtoken's failures, as statuses a client can act on. */
const asApiError = (error) => {
  if (error.name === "TokenExpiredError") {
    return ApiError.unauthorized("Session expired, please sign in again");
  }
  if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
    return ApiError.unauthorized();
  }
  return error;
};

/** Puts the signed-in account on `req.user`, or refuses the request. */
const requireAuth = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized();

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    throw asApiError(error);
  }

  // Only the fields the app needs downstream — the hash is `select: false`
  // anyway, but there is no reason to carry the rest of the document either.
  const user = await User.findById(decoded.userId).select("_id username email");
  if (!user) throw ApiError.unauthorized();

  req.user = user;
  next();
});

module.exports = { requireAuth };
