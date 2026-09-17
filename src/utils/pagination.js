const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 500;

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePaging = (query = {}) => {
  const page = Math.max(1, Math.trunc(Number(query.page)) || 1);
  const requested = Math.trunc(Number(query.limit)) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, requested));

  return { page, limit, skip: (page - 1) * limit };
};

const pageMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  pageCount: Math.max(1, Math.ceil(total / limit)),
});

// Case-insensitive search on the given fields. A number also matches `id`.
const searchFilter = (term, fields = [], { numericField = "id" } = {}) => {
  const trimmed = String(term || "").trim();
  if (!trimmed) return null;

  const pattern = new RegExp(escapeRegex(trimmed), "i");
  const or = fields.map((field) => ({ [field]: pattern }));

  const asNumber = Number(trimmed);
  if (numericField && Number.isFinite(asNumber)) {
    or.push({ [numericField]: asNumber });
  }

  return or.length ? { $or: or } : null;
};

// Only sorts on allowed fields. _id is added so paging stays stable.
const parseSort = (query = {}, allowed = [], fallback = { updatedAt: -1 }) => {
  const key = String(query.sort || "");
  const direction = String(query.dir || "").toLowerCase() === "asc" ? 1 : -1;

  if (allowed.includes(key)) return { [key]: direction, _id: direction };
  return { ...fallback, _id: -1 };
};

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  escapeRegex,
  parsePaging,
  pageMeta,
  searchFilter,
  parseSort,
};
