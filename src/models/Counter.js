const mongoose = require("mongoose");

// Last used id for each (user, type), e.g. Product #1, #2, ...
const CounterSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { collection: "counters", versionKey: false }
);

CounterSchema.index({ user: 1, type: 1 }, { unique: true });

module.exports = mongoose.model("Counter", CounterSchema);
