const express = require('express');
const authRoute = require('./auth.route');
const genreRoute = require('./genre.route');
const theaterRoute = require('./theater.route');

const router = express.Router();

const routes = [
    { path: '/auth', route: authRoute },
    { path: '/genres', route: genreRoute },
    { path: '/theaters', route: theaterRoute },
];

routes.forEach((route) => {
    router.use(route.path, route.route);
});

module.exports = router;
