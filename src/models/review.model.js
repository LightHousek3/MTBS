const mongoose = require("mongoose");
const { toJSON, paginate, softDelete } = require("./plugins");
const { REVIEW_STATUS } = require("../constants");

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },
    content: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(REVIEW_STATUS),
      default: REVIEW_STATUS.PENDING,
      index: true,
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    aiScores: {
      toxicity: Number,
      insult: Number,
      profanity: Number,
      spam: Number,
    },
  },
  {
    timestamps: true,
  },
);

reviewSchema.index(
  { user: 1, movie: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } },
);

reviewSchema.plugin(toJSON);
reviewSchema.plugin(paginate);
reviewSchema.plugin(softDelete);

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
