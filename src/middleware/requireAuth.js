const { TOKEN_COOKIE } = require("../config/cookie");
const { User } = require("../models");
const ApiError = require("../utils/ApiError");
const { verifyToken } = require("../utils/token");
const { asyncHandler } = require("./asyncHandler");

// Token from the cookie, or from the Authorization header for API clients
const readToken = (req) => {
  const cookie = req.cookies?.[TOKEN_COOKIE];
  if (cookie) return String(cookie).trim();

  const header = req.headers?.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : header.trim();
};

const asApiError = (error) => {
  if (error.name === "TokenExpiredError") {
    return ApiError.unauthorized("Session expired, please sign in again");
  }
  if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
    return ApiError.unauthorized();
  }
  return error;
};

const requireAuth = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized();

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    throw asApiError(error);
  }

  const user = await User.findById(decoded.userId).select("_id username email");
  if (!user) throw ApiError.unauthorized();

  req.user = user;
  next();
});

module.exports = { requireAuth };
