<<<<<<< Updated upstream
const authValidator = require('./auth.validator');
const theaterValidator = require('./theater.validator');
const promotionValidator = require('./promotion.validator');
const movieValidator = require('./movie.validator');
const showtimeValidator = require('./showtime.validator');
const screenValidator = require('./screen.validator');
const redeemValidator = require('./redeem.validator');
const recommendationValidator = require('./recommendation.validator');
=======
const authValidator = require("./auth.validator");
const theaterValidator = require("./theater.validator");
const ticketPriceValidator = require("./ticketPrice.validator");
>>>>>>> Stashed changes

module.exports = {
  authValidator,
  theaterValidator,
<<<<<<< Updated upstream
  promotionValidator,
  movieValidator,
  showtimeValidator,
  screenValidator,
  redeemValidator,
  recommendationValidator,
=======
  ticketPriceValidator,
>>>>>>> Stashed changes
};
