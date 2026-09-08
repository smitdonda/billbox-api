const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;

const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

/**
 * The empty-string fallback is for the "no account with that email" case:
 * bcrypt throws on an undefined hash, and a caller that has to guard against
 * that ends up with two code paths where the point is to have one answer.
 */
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash || "");

module.exports = { hashPassword, verifyPassword };
