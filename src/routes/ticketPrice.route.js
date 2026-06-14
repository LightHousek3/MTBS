const express = require("express");
const { ticketPriceController } = require("../controllers");
const { authenticate, authorize, validate } = require("../middlewares");
const { ticketPriceValidator } = require("../validators");
const { USER_ROLE } = require("../constants");

const router = express.Router();

/**
 * @route   GET /api/v1/ticket-prices
 * @access  Public
 */
router.get("/", ticketPriceController.getTicketPrices);

/**
 * @route   POST /api/v1/ticket-prices
 * @access  Admin
 */
router.post(
  "/",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(ticketPriceValidator.createTicketPrice),
  ticketPriceController.createTicketPrice,
);

/**
 * @route   GET /api/v1/ticket-prices/:id
 * @access  Public
 */
router.get(
  "/:id",
  validate(ticketPriceValidator.getTicketPrice),
  ticketPriceController.getTicketPriceByID,
);

/**
 * @route   PUT /api/v1/ticket-prices/:id
 * @access  Admin
 */
router.put(
  "/:id",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(ticketPriceValidator.updateTicketPrice),
  ticketPriceController.updateTicketPrice,
);

/**
 * @route   DELETE /api/v1/ticket-prices/:id
 * @access  Admin
 */
router.delete(
  "/:id",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(ticketPriceValidator.deleteTicketPrice),
  ticketPriceController.deleteTicketPrice,
);

module.exports = router;
