const mongoose = require("mongoose");
const { toJSON, paginate, softDelete } = require('./plugins');

const festivalSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },

    image: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },

    content: {
      type: String,
      required: true
    },

    startTime: {
      type: Date,
      required: true
    },

    endTime: {
      type: Date,
      required: true
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

festivalSchema.plugin(toJSON);
festivalSchema.plugin(paginate);
festivalSchema.plugin(softDelete);

module.exports = mongoose.model("Festival", festivalSchema);
