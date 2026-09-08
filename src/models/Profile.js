const mongoose = require("mongoose");

/*
 * The company letterhead printed on invoices. Exactly one per account, which
 * the unique index on `user` enforces rather than leaving it to the route.
 */
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
    // Identifiers, not quantities — keep them as text.
    pinno: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  {
    /*
     * The model used to be registered as "myprofile", which mongoose
     * pluralised into this collection. The model has a proper name now; the
     * collection keeps the old one, because renaming it here would point a
     * deployed database at an empty collection and read as lost data.
     */
    collection: "myprofiles",
    versionKey: false,
    timestamps: true,
  }
);

module.exports = mongoose.model("Profile", ProfileSchema);
