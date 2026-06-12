const mongoose = require("mongoose");
const { toJSON, paginate, softDelete } = require("./plugins");
const { MOVIE_TYPE, AGE_RATING } = require("../constants");

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    genres: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Genre",
      },
    ],
    description: {
      type: String,
    },

    author: {
      type: String,
    },

    image: {
      url: String,
      publicId: String,
    },

    trailer: {
      url: String,
      publicId: String,
    },

    type: {
      type: String,
      enum: Object.values(MOVIE_TYPE),
      default: MOVIE_TYPE.TWO_D,
    },

    duration: {
      type: Number, // phút
    },

    origin: {
      type: String, // quốc gia
    },

    releaseDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

    ageRating: {
      type: String,
      enum: Object.values(AGE_RATING),
    },

    actors: [
      {
        type: String,
      },
    ],

    totalBookings: {
      type: Number,
      default: 0,
    },

    ratingAverage: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

// ─── Plugins ─────────────────────────────────────────────
movieSchema.plugin(toJSON);
movieSchema.plugin(paginate);
movieSchema.plugin(softDelete);

const Movie = mongoose.model("Movie", movieSchema);

module.exports = Movie;
