const jwt = require("jsonwebtoken");
const env = require("./../config/env");

/** Signs a session token and reports when it stops being one. */
const createToken = (userId) => {
  const token = jwt.sign({ userId }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });

  // Decoding our own freshly signed token is the cheapest way to get the exact
  // expiry the cookie should be set against.
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000) };
};

/** Throws jsonwebtoken's own errors; requireAuth translates them to statuses. */
const verifyToken = (token) => jwt.verify(token, env.jwt.secret);

module.exports = { createToken, verifyToken };
