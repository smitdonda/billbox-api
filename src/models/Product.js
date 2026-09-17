const mongoose = require("mongoose");
const { isPaise } = require("../utils/money");

const ProductSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    id: { type: Number, required: true },
    productname: {
      type: String,
      trim: true,
    },
    availableproductqty: {
      type: Number,
      default: 0,
      min: [0, "Stock cannot go below zero"],
    },
    // price in paise
    unitprice: {
      type: Number,
      default: 0,
      min: [0, "Unit price cannot be negative"],
      validate: {
        validator: isPaise,
        message: "Unit price must be a whole number of paise",
      },
    },
  },
  {
    collection: "products",
    versionKey: false,
    timestamps: true,
  }
);

ProductSchema.index({ user: 1, id: 1 }, { unique: true });
ProductSchema.index({ user: 1, productname: 1 });
ProductSchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model("Product", ProductSchema);
