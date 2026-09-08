const mongoose = require("mongoose");
const ApiError = require("./ApiError");

/**
 * A path parameter as an id the database can be asked about.
 *
 * Throws rather than returning a flag: a malformed id is not a condition every
 * caller has to remember to check, it is a 422 the error handler already knows
 * how to answer.
 */
const parseObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw ApiError.unprocessable("Invalid Id");
  }
  return value;
};

/** Whether a value could be an ObjectId, for code that has to branch on it. */
const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

module.exports = { parseObjectId, isObjectId };
