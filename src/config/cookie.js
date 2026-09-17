const env = require("./env");

const TOKEN_COOKIE = env.cookie.name;

const baseOptions = () => ({
  httpOnly: true,
  sameSite: env.cookie.sameSite,
  secure: env.cookie.secure,
  path: "/",
  ...(env.cookie.domain ? { domain: env.cookie.domain } : {}),
});

const sessionCookieOptions = (expiresAt) => ({
  ...baseOptions(),
  ...(expiresAt ? { expires: new Date(expiresAt) } : {}),
});

// Clearing needs the same options the cookie was set with
const clearCookieOptions = () => baseOptions();

module.exports = { TOKEN_COOKIE, sessionCookieOptions, clearCookieOptions };
