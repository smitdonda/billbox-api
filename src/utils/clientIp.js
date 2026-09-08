/**
 * The caller's address.
 *
 * Vercel sets `x-real-ip` itself at the edge, so prefer it;
 * `x-forwarded-for` is a client-supplied header everywhere else and only its
 * first entry is worth reading.
 */
const clientIp = (req) => {
  const real = req.headers["x-real-ip"];
  if (real) return String(real).trim();

  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();

  return req.ip || req.socket?.remoteAddress || "unknown";
};

module.exports = { clientIp };
