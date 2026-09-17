const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;

const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

// hash can be empty when the user does not exist
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash || "");

module.exports = { hashPassword, verifyPassword };
