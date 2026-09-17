const mongoose = require("mongoose");
const { isPaise } = require("../utils/money");

// All amounts are stored in paise (whole numbers)
const paiseField = (label) => ({
  type: Number,
  default: 0,
  min: [0, `${label} cannot be negative`],
  validate: {
    validator: isPaise,
    message: `${label} must be a whole number of paise`,
  },
});

// Name and price are copied onto the bill, so editing a product later
// does not change old bills. productId is used for stock updates.
const LineItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    id: { type: Number },
    productname: { type: String, trim: true },
    unitprice: paiseField("Unit price"),
    quantity: { type: Number, default: 0, min: 0 },
    pandqtotal: paiseField("Line subtotal"),
    gsttex: paiseField("Line total"),
    gst: [
      {
        _id: false,
        title: { type: String },
        // percentage, e.g. 2.5
        value: { type: Number },
        taxAmount: paiseField("Tax amount"),
      },
    ],
  },
  { _id: false }
);

const BillInfoSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    id: { type: Number, required: true },
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phoneNo: { type: String, trim: true },
    gstNo: { type: String, trim: true, uppercase: true },
    totalproductsprice: paiseField("Bill total"),
    products: [LineItemSchema],
  },
  {
    collection: "billinfos",
    versionKey: false,
    timestamps: true,
  }
);

BillInfoSchema.index({ user: 1, id: 1 }, { unique: true });
BillInfoSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("BillInfo", BillInfoSchema);
