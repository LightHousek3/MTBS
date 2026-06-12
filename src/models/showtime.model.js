const mongoose = require("mongoose");
const { toJSON, paginate, softDelete } = require("./plugins");
const { SHOWTIME_STATUS } = require("../constants");

const resolveShowtimeStatus = ({ startTime, endTime }) => {
  const now = new Date();
  const normalizedStart = new Date(startTime);
  const normalizedEnd = new Date(endTime);

  if (normalizedEnd <= now) {
    return SHOWTIME_STATUS.ENDED;
  }

  if (normalizedStart > now) {
    return SHOWTIME_STATUS.UPCOMING;
  }

  return SHOWTIME_STATUS.NOW_SHOWING;
};

const showtimeSchema = new mongoose.Schema(
  {
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    screen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Screen",
      required: true,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        // Always override potential legacy persisted `status` value from DB.
        ret.status = resolveShowtimeStatus({
          startTime: ret.startTime,
          endTime: ret.endTime,
        });
      },
    },
    toObject: { virtuals: true },
  },
);

showtimeSchema.virtual("status").get(function getStatus() {
  return resolveShowtimeStatus({
    startTime: this.startTime,
    endTime: this.endTime,
  });
});

// ─── Plugins ─────────────────────────────────────────────
showtimeSchema.plugin(toJSON);
showtimeSchema.plugin(paginate);
showtimeSchema.plugin(softDelete);

const Showtime = mongoose.model("Showtime", showtimeSchema);

module.exports = Showtime;
