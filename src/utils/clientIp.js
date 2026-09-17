const clientIp = (req) => {
  // set by Vercel
  const real = req.headers["x-real-ip"];
  if (real) return String(real).trim();

  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();

  return req.ip || req.socket?.remoteAddress || "unknown";
};

module.exports = { clientIp };
