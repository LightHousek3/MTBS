const mongoose = require("mongoose");
const { toJSON, paginate, softDelete } = require('./plugins');

const newsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },

    content: {
      type: String,
      required: true
    },

    image: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
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

newsSchema.plugin(toJSON);
newsSchema.plugin(paginate);
newsSchema.plugin(softDelete);

module.exports = mongoose.model("News", newsSchema);
