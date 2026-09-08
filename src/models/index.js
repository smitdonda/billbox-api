/*
 * Every model in one place, so a consumer writes
 *
 *   const { Product, BillInfo } = require("../models");
 *
 * rather than a column of single-file requires that drift apart in spelling.
 * Requiring this module also registers every schema with mongoose, which is
 * what makes `ref` lookups and index sync work regardless of import order.
 */
module.exports = {
  BillInfo: require("./BillInfo"),
  Counter: require("./Counter"),
  Customer: require("./Customer"),
  LoginAttempt: require("./LoginAttempt"),
  Product: require("./Product"),
  Profile: require("./Profile"),
  User: require("./User"),
};
