const mongoose = require("mongoose");
const { toJSON, paginate, softDelete } = require("./plugins");
const {
  TICKET_TYPE_SEAT,
  TICKET_TYPE_MOVIE,
  TICKET_DAY_TYPE,
} = require("../constants");

// moved enum-like constants to src/constants

const ticketPriceSchema = new mongoose.Schema(
  {
    typeSeat: {
      type: String,
      enum: Object.values(TICKET_TYPE_SEAT),
      required: true,
    },

    typeMovie: {
      type: String,
      enum: Object.values(TICKET_TYPE_MOVIE),
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 1,
    },

    dayType: {
      type: String,
      enum: Object.values(TICKET_DAY_TYPE),
      required: true,
    },

    startTime: {
      type: String, // "18:00"
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },

    endTime: {
      type: String, // "22:00"
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  },
);

// apply plugins if needed (e.g. toJSON, paginate etc.)
ticketPriceSchema.plugin(toJSON);
ticketPriceSchema.plugin(paginate);
ticketPriceSchema.plugin(softDelete);

ticketPriceSchema.index(
  { typeSeat: 1, typeMovie: 1, dayType: 1, startTime: 1, endTime: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

const TicketPrice = mongoose.model("TicketPrice", ticketPriceSchema);

module.exports = TicketPrice;
