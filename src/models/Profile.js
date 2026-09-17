const mongoose = require("mongoose");

// Company details printed on the invoice, one per user
const ProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    companyname: { type: String, trim: true },
    cemail: { type: String, lowercase: true, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    pinno: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  {
    // old collection name from the "myprofile" model, keep it for existing data
    collection: "myprofiles",
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("Profile", ProfileSchema);
