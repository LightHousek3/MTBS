const mongoose = require("mongoose");
const { toJSON, paginate, softDelete } = require("./plugins");
const { REDEEMGIFT_STATUS } = require("../constants");

const redeemGiftSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    redeem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Redeem",
      required: true,
    },
    transactionNo: {
      type: String,
      trim: true,
      unique: true,
      required: true,
    },
    amount: {
      type: Number,
      min: 1,
      default: 1,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 255,
      default: "",
    },
    expectedDeliveryDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(REDEEMGIFT_STATUS),
      default: REDEEMGIFT_STATUS.PENDING,
    },
  },
  {
    timestamps: true,
  },
);

// ─── Plugins ─────────────────────────────────────────────
redeemGiftSchema.plugin(toJSON);
redeemGiftSchema.plugin(paginate);
redeemGiftSchema.plugin(softDelete);

const RedeemGift = mongoose.model("RedeemGift", redeemGiftSchema);

module.exports = RedeemGift;
