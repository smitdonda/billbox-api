const ApiError = require("../utils/ApiError");
const { priceBill } = require("../utils/billing");

const pickCustomer = (body = {}) => {
  const values = {};

  if (typeof body.name === "string") values.name = body.name;
  if (typeof body.email === "string") values.email = body.email;
  if (body.phoneNo != null) values.phoneNo = String(body.phoneNo);
  if (typeof body.gstNo === "string") values.gstNo = body.gstNo;

  return values;
};

const parseBillBody = (body = {}) => {
  const { products, totalproductsprice } = priceBill(body);

  if (!products.length) {
    throw ApiError.unprocessable("Add at least one product");
  }

  return { customer: pickCustomer(body), products, totalproductsprice };
};

module.exports = { parseBillBody };
