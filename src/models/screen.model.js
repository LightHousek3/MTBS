const mongoose = require("mongoose");
const { toJSON, paginate, softDelete } = require("./plugins");

const screenSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    theater: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theater",
      required: true,
    },

    seatCapacity: {
      type: Number,
      required: true,
      min: [1, "seatCapacity must be greater than 0"],
    },

    status: {
      type: String,
      enum: ["ACTIVE", "MAINTENANCE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

// Plugins
screenSchema.plugin(toJSON);
screenSchema.plugin(paginate);
screenSchema.plugin(softDelete);

const Screen = mongoose.model("Screen", screenSchema);

module.exports = Screen;