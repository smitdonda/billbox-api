const jwt = require("jsonwebtoken");
const env = require("../config/env");

const createToken = (userId) => {
  const token = jwt.sign({ userId }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  });

  // expiry date for the cookie
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000) };
};

const verifyToken = (token) => jwt.verify(token, env.jwt.secret);

module.exports = { createToken, verifyToken };
