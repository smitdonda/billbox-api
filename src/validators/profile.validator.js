const ApiError = require("../utils/ApiError");

const FIELDS = [
  "companyname",
  "cemail",
  "address",
  "city",
  "state",
  "country",
  "pinno",
  "phone",
];

const pick = (body = {}) =>
  Object.fromEntries(
    FIELDS.filter((field) => body[field] !== undefined).map((field) => [
      field,
      String(body[field]),
    ])
  );

const parseProfileBody = (body) => {
  const values = pick(body);

  if (!values.companyname) {
    throw ApiError.unprocessable("Company name is required");
  }

  return values;
};

module.exports = { parseProfileBody };
