const { Profile } = require("../models");

const getProfile = async ({ userId }) => Profile.findOne({ user: userId });

// Creates the profile the first time, updates it after that
const saveProfile = async ({ userId, values }) =>
  Profile.findOneAndUpdate(
    { user: userId },
    { $set: values, $setOnInsert: { user: userId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

module.exports = { getProfile, saveProfile };
