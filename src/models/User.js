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
    // bcrypt hash, not returned unless asked for with select("+password")
    password: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    collection: "users",
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
