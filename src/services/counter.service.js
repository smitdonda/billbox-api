const { Counter } = require("../models");

// Next id for a user's products, customers or bills
const nextCounterId = async (type, userId) => {
  if (!userId) throw new Error("nextCounterId needs a user id");

  const counter = await Counter.findOneAndUpdate(
    { type, user: userId },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).exec();

  return counter.seq;
};

module.exports = { nextCounterId };
