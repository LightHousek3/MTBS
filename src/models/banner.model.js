const mongoose = require("mongoose");
const { BANNER_TYPE } = require("../constants");
const { toJSON, paginate, softDelete } = require('./plugins');

const bannerSchema = new mongoose.Schema(
{
  type: {
    type: String,
    enum: Object.values(BANNER_TYPE),
    required: true
  },

  url: {
    type: String,
    required: true,
    unique: true
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
bannerSchema.plugin(toJSON);
bannerSchema.plugin(paginate);
bannerSchema.plugin(softDelete);
module.exports = mongoose.model("Banner", bannerSchema);