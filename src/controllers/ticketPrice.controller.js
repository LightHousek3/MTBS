const { messages } = require("../constants");
const { ticketPriceService } = require("../services");
const { asyncHandler, ResponseHandler, pick } = require("../utils");

const createTicketPrice = asyncHandler(async (req, res) => {
  const ticketPrice = await ticketPriceService.createTicketPrice(req.body);
  ResponseHandler.created(res, {
    message: messages.CRUD.CREATED("TicketPrice"),
    ticketPrice,
  });
});

const getTicketPrices = asyncHandler(async (req, res) => {
  const filter = {};
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await ticketPriceService.getTicketPrices(filter, options);
  ResponseHandler.paginated(res, {
    message: messages.CRUD.LIST_FETCHED("TicketPrices"),
    data: result.results,
    meta: result.meta,
  });
});

const getTicketPriceByID = asyncHandler(async (req, res) => {
  const ticketPrice = await ticketPriceService.getTicketPriceById(
    req.params.id,
  );
  ResponseHandler.success(res, {
    message: messages.CRUD.FETCHED("TicketPrice by ID"),
    data: ticketPrice,
  });
});

const updateTicketPrice = asyncHandler(async (req, res) => {
  const ticketPrice = await ticketPriceService.updateTicketPriceById(
    req.params.id,
    req.body,
  );
  ResponseHandler.success(res, {
    message: messages.CRUD.UPDATED("TicketPrice"),
    data: ticketPrice,
  });
});

const deleteTicketPrice = asyncHandler(async (req, res) => {
  await ticketPriceService.deleteTicketPriceById(req.params.id);
  ResponseHandler.success(res, {
    message: messages.CRUD.DELETED("TicketPrice"),
  });
});

module.exports = {
  createTicketPrice,
  getTicketPrices,
  getTicketPriceByID,
  updateTicketPrice,
  deleteTicketPrice,
};
