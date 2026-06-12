const mongoose = require("mongoose");
const { toJSON, paginate, softDelete } = require("./plugins");
const { LOYALTY_TRANSACTION_TYPE } = require("../constants");

const loyaltyTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: Object.values(LOYALTY_TRANSACTION_TYPE),
      required: true,
    },
    points: {
      type: Number,
      required: true,
      min: 0,
    },

    balanceBefore: {
      type: Number,
      required: true,
      min: 0,
    },

    balanceAfter: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 255,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// ─── Plugins ─────────────────────────────────────────────
loyaltyTransactionSchema.plugin(toJSON);
loyaltyTransactionSchema.plugin(paginate);
loyaltyTransactionSchema.plugin(softDelete);

const LoyaltyTransaction = mongoose.model(
  "LoyaltyTransaction",
  loyaltyTransactionSchema,
);

module.exports = LoyaltyTransaction;
