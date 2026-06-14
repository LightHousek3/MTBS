<<<<<<< Updated upstream
const express = require('express');
const authRoute = require('./auth.route');
const genreRoute = require('./genre.route');
const theaterRoute = require('./theater.route');
const promotionRoute = require('./promotion.routes');
const movieRoute = require('./movie.route');
const showtimeRoute = require('./showtime.route');
const screenRoute = require('./screen.route');
const redeemRoute = require('./redeem.route');
const redeemGiftRoute = require('./redeemGift.route');
const recommendationRoute = require('./recommendation.route');
=======
const express = require("express");
const authRoute = require("./auth.route");
const genreRoute = require("./genre.route");
const theaterRoute = require("./theater.route");
const ticketPriceRoute = require("./ticketPrice.route");
>>>>>>> Stashed changes

const router = express.Router();

const routes = [
<<<<<<< Updated upstream
  { path: '/auth', route: authRoute },
  { path: '/genres', route: genreRoute },
  { path: '/theaters', route: theaterRoute },
  { path: '/promotions', route: promotionRoute },
  { path: '/movies', route: movieRoute },
  { path: '/showtimes', route: showtimeRoute },
  { path: '/screens', route: screenRoute },
  { path: '/redeems', route: redeemRoute },
  { path: '/redeem-gifts', route: redeemGiftRoute },
  { path: '/recommendations', route: recommendationRoute },
=======
  { path: "/auth", route: authRoute },
  { path: "/genres", route: genreRoute },
  { path: "/theaters", route: theaterRoute },
  { path: "/ticket-prices", route: ticketPriceRoute },
>>>>>>> Stashed changes
];

routes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
