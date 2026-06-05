const express = require('express');
const authRoute = require('./auth.route');
const genreRoute = require('./genre.route');

const router = express.Router();

const routes = [
    { path: '/auth', route: authRoute },
    { path: '/genres', route: genreRoute },
];

routes.forEach((route) => {
    router.use(route.path, route.route);
});

module.exports = router;
