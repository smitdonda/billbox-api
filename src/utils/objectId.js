const mongoose = require("mongoose");
const ApiError = require("./ApiError");

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const parseObjectId = (value) => {
  if (!isObjectId(value)) {
    throw ApiError.unprocessable("Invalid Id");
  }
  return value;
};

module.exports = { parseObjectId, isObjectId };
