const authValidator = require("./auth.validator");
const theaterValidator = require("./theater.validator");
const movieValidator = require("./movie.validator");
const showtimeValidator = require("./showtime.validator");
const screenValidator = require("./screen.validator");
const redeemValidator = require("./redeem.validator");
const recommendationValidator = require("./recommendation.validator");

module.exports = {
  authValidator,
  theaterValidator,
  movieValidator,
  showtimeValidator,
  screenValidator,
  redeemValidator,
  recommendationValidator,
};
