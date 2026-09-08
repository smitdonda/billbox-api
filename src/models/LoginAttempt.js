const mongoose = require("mongoose");

/*
 * One document per throttled key ("login:email:someone@example.com",
 * "signup:ip:1.2.3.4") holding how many attempts that key has collected inside
 * the current window.
 *
 * Mongo expires the document itself once `expiresAt` passes, so the collection
 * cleans up without a cron. The TTL monitor only sweeps once a minute, though,
 * so every read still compares `expiresAt` rather than trusting the absence of
 * a document.
 */
const LoginAttemptSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { collection: "loginattempts", versionKey: false }
);

module.exports = mongoose.model("LoginAttempt", LoginAttemptSchema);
