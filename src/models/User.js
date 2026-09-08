const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      required: true,
      unique: true,
      index: true,
    },
    // Always a bcrypt hash. `select: false` keeps it out of every query that
    // does not explicitly ask for it, so it cannot leak through a route that
    // returns a user document.
    password: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    // Named rather than derived. Mongoose pluralises the model name to reach a
    // collection, so renaming a model would otherwise point it at an empty one
    // and the data would look deleted.
    collection: "users",
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
