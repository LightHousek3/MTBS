const express = require("express");

const { seatController } = require("../controllers");
const { authenticate, authorize, validate } = require("../middlewares");
const { seatValidator } = require("../validators");
const { USER_ROLE } = require("../constants");

const router = express.Router();

/**
 * @route   POST /api/v1/seats/bulk
 * @access  Admin
 */
router.post(
  "/bulk",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(seatValidator.createSeatsBulk),
  seatController.createSeatsBulk,
);

/**
 * @route   PUT /api/v1/seats/bulk
 * @access  Admin
 */
router.put(
  "/bulk",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(seatValidator.updateSeatsBulk),
  seatController.updateSeatsBulk,
);

/**
 * @route   DELETE /api/v1/seats/bulk
 * @access  Admin
 */
router.delete(
  "/bulk",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(seatValidator.deleteSeatsBulk),
  seatController.deleteSeatsBulk,
);

/**
 * @route   GET /api/v1/seats
 * @access  Public
 */
router.get("/", validate(seatValidator.getSeats), seatController.getSeats);

/**
 * @route   GET /api/v1/seats/:id
 * @access  Public
 */
router.get("/:id", validate(seatValidator.getSeat), seatController.getSeat);

/**
 * @route   POST /api/v1/seats
 * @access  Admin
 */
router.post(
  "/",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(seatValidator.createSeat),
  seatController.createSeat,
);

/**
 * @route   PUT /api/v1/seats/:id
 * @access  Admin
 */
router.put(
  "/:id",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(seatValidator.updateSeat),
  seatController.updateSeat,
);

/**
 * @route   DELETE /api/v1/seats/:id
 * @access  Admin
 */
router.delete(
  "/:id",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(seatValidator.deleteSeat),
  seatController.deleteSeat,
);

// /**
//  * @route   PATCH /api/v1/seats/:id/status
//  * @access  Admin
//  */
// router.patch(
//   "/:id/status",
//   authenticate,
//   authorize(USER_ROLE.ADMIN),
//   validate(seatValidator.updateSeatStatus),
//   seatController.updateSeatStatus,
// );
router.patch(
  "/:id/status",
  authenticate,
  authorize(USER_ROLE.ADMIN),
  validate(seatValidator.updateSeatStatus),
  seatController.updateSeatStatus,
);

module.exports = router;
