const { Profile } = require("../models");

/*
 * The company profile is a singleton per account: one letterhead, printed on
 * every invoice. It has no id of its own in the API for that reason — "the
 * profile of whoever is signed in" is the whole address.
 */

/** The account's profile, or null when it has never been filled in. */
const getProfile = async ({ userId }) => Profile.findOne({ user: userId });

/**
 * Writes the profile, creating it on first save.
 *
 * An upsert rather than a create-or-update pair: the unique index on `user`
 * already makes a second document impossible, and a check-then-write would
 * lose a race to it and fail a save that should have succeeded.
 */
const saveProfile = async ({ userId, values }) =>
  Profile.findOneAndUpdate(
    { user: userId },
    { $set: values, $setOnInsert: { user: userId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

module.exports = { getProfile, saveProfile };
