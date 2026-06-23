const mongoose = require("mongoose");
const { toJSON, paginate, softDelete } = require("./plugins");

const screenSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },

    theater: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Theater",
      required: true
    },

    seatCapacity: {
      type: Number,
      required: true,
      min: [1, "seatCapacity must be greater than 0"]
    },

    createdAt: {
      type: Date,
      default: Date.now
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  }
);

// Plugins
screenSchema.plugin(toJSON);
screenSchema.plugin(paginate);
screenSchema.plugin(softDelete);

const Screen = mongoose.model("Screen", screenSchema);

module.exports = Screen;