const env = require("./env");

/*
 * The session cookie is httpOnly, so no script on the page can read the token
 * even if something manages to inject one. What its attributes should be is an
 * environment question, answered in config/env.js; this module only shapes
 * them into the options express expects.
 */
const TOKEN_COOKIE = env.cookie.name;

const baseOptions = () => ({
  httpOnly: true,
  sameSite: env.cookie.sameSite,
  secure: env.cookie.secure,
  path: "/",
  ...(env.cookie.domain ? { domain: env.cookie.domain } : {}),
});

/** Options for setting the session cookie, expiring with the token itself. */
const sessionCookieOptions = (expiresAt) => ({
  ...baseOptions(),
  ...(expiresAt ? { expires: new Date(expiresAt) } : {}),
});

/** Clearing has to repeat the same attributes or the browser keeps the cookie. */
const clearCookieOptions = () => baseOptions();

module.exports = { TOKEN_COOKIE, sessionCookieOptions, clearCookieOptions };
