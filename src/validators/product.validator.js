const ApiError = require("../utils/ApiError");

/*
 * What a client is allowed to write to a product, and what counts as a usable
 * value. `id` stays under the counter's control and `user` is never taken from
 * the body — a request that names an owner is ignored, not obeyed.
 *
 * `unitprice` is a whole number of paise, not rupees. See utils/money.js.
 */

const pick = (body = {}) => {
  const values = {};

  if (typeof body.productname === "string") {
    values.productname = body.productname.trim();
  }
  if (body.availableproductqty !== undefined) {
    values.availableproductqty = Math.trunc(Number(body.availableproductqty));
  }
  if (body.unitprice !== undefined) {
    values.unitprice = Math.trunc(Number(body.unitprice));
  }

  return values;
};

const hasInvalidNumber = (values) =>
  Object.entries(values).some(
    ([key, value]) =>
      key !== "productname" && (!Number.isFinite(value) || value < 0)
  );

/**
 * @param {object} body The request body.
 * @param {{ partial?: boolean }} options `partial` is an edit, where an
 *   omitted field means "leave it alone" rather than "clear it".
 */
const parseProductBody = (body, { partial = false } = {}) => {
  const values = pick(body);

  if (!partial && !values.productname) {
    throw ApiError.unprocessable("Product name is required");
  }
  if (hasInvalidNumber(values)) {
    throw ApiError.unprocessable(
      "Quantity and unit price must be zero or more"
    );
  }

  return values;
};

module.exports = { parseProductBody };
