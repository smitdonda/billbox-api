const mongoose = require("mongoose");

// Attempt count per key, e.g. "login:email:someone@example.com".
// MongoDB deletes the document after expiresAt (TTL index).
const LoginAttemptSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { collection: "loginattempts", versionKey: false }
);

module.exports = mongoose.model("LoginAttempt", LoginAttemptSchema);
