const authService = require("./auth.service");
const genreService = require("./genre.service");
const theaterService = require("./theater.service");
const movieService = require("./movie.service");
const showtimeService = require("./showtime.service");
const redeemService = require("./redeem.service");
const recommendationService = require("./recommendation.service");

module.exports = {
  authService,
  genreService,
  theaterService,
  movieService,
  showtimeService,
  redeemService,
  recommendationService,
};
