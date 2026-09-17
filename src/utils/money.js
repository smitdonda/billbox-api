// Money is stored as whole paise (1 rupee = 100 paise) to avoid
// floating point errors when adding up bills.

const isPaise = (value) => Number.isInteger(value) && value >= 0;

const toPaise = (value) => {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// percent of an amount, rounded to the nearest paisa
const percentOf = (amountPaise, percent) => {
  const pct = Number(percent);
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  return Math.round((amountPaise * pct) / 100);
};

module.exports = { isPaise, toPaise, percentOf };
