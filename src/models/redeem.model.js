const mongoose = require("mongoose");
const { toJSON, paginate, softDelete } = require("./plugins");
const { REDEEM_STATUS } = require("../constants");

const redeemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 255,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 255,
      default: "",
    },
    pointsRequired: {
      type: Number,
      required: true,
      min: 1,
    },
    image: {
      url: String,
      publicId: String,
    },
    quantity: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(REDEEM_STATUS),
      default: REDEEM_STATUS.AVAILABLE,
    },
  },
  {
    timestamps: true,
  },
);

// ─── Plugins ─────────────────────────────────────────────
redeemSchema.plugin(toJSON);
redeemSchema.plugin(paginate);
redeemSchema.plugin(softDelete);

const Redeem = mongoose.model("Redeem", redeemSchema);

module.exports = Redeem;
