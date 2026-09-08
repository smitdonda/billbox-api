const ApiError = require("../utils/ApiError");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const email = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const parseSignupBody = (body = {}) => {
  const values = {
    email: email(body.email),
    password: String(body.password || ""),
    username: String(body.username || "").trim(),
  };

  if (!EMAIL_RE.test(values.email)) {
    throw ApiError.unprocessable("Enter a valid email address");
  }
  if (values.password.length < MIN_PASSWORD_LENGTH) {
    throw ApiError.unprocessable(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    );
  }
  if (!values.username) {
    throw ApiError.unprocessable("Username is required");
  }

  return values;
};

/**
 * Login is deliberately lax: the credentials are either right or they are not,
 * and telling a caller that its email was malformed is a fact about the
 * account list it has no business learning.
 */
const parseLoginBody = (body = {}) => ({
  email: email(body.email),
  password: String(body.password || ""),
});

module.exports = { parseSignupBody, parseLoginBody };
