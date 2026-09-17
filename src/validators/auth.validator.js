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

// No format checks on login, wrong details just fail with 401
const parseLoginBody = (body = {}) => ({
  email: email(body.email),
  password: String(body.password || ""),
});

module.exports = { parseSignupBody, parseLoginBody };
