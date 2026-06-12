const Joi = require("joi");
const { MOVIE_TYPE, AGE_RATING } = require("../constants");

const createMovie = {
  body: Joi.object().keys({
    title: Joi.string().trim().min(1).max(255).required(),

    genres: Joi.array().items(
      Joi.string().hex().length(24),
    ).unique().default([]),

    description: Joi.string().trim().allow("").default(""),

    author: Joi.string().trim().allow("").default(""),

    image: Joi.object({
      url: Joi.string().uri().required(),
      publicId: Joi.string().required(),
    }).optional(),

    trailer: Joi.object({
      url: Joi.string().uri().required(),
      publicId: Joi.string().required(),
    }).optional(),

    type: Joi.string().valid(...Object.values(MOVIE_TYPE)).default(MOVIE_TYPE.TWO_D),

    duration: Joi.number().integer().min(1).required(),

    origin: Joi.string().trim().allow("").default(""),

    releaseDate: Joi.date().required(),

    endDate: Joi.date().greater(Joi.ref("releaseDate")).required().messages({
      "date.greater": "endDate must be greater than releaseDate",
    }),

    ageRating: Joi.string().valid(...Object.values(AGE_RATING)).required(),

    actors: Joi.array().items(Joi.string().trim().min(1)).unique().default([]),
  }),
};

const updateMovie = {
  params: Joi.object().keys({
    id: Joi.string().hex().length(24).required(),
  }),

  body: Joi.object()
    .keys({
      title: Joi.string().trim().min(1).max(255),

      genres: Joi.array().items(Joi.string().hex().length(24)).unique(),

      description: Joi.string().trim().allow(""),

      author: Joi.string().trim().allow(""),

      image: Joi.object({
        url: Joi.string().uri().required(),
        publicId: Joi.string().required(),
      }).allow(null),

      trailer: Joi.object({
        url: Joi.string().uri().required(),
        publicId: Joi.string().required(),
      }).allow(null),

      type: Joi.string().valid(...Object.values(MOVIE_TYPE)),

      duration: Joi.number().integer().min(1),

      origin: Joi.string().trim().allow(""),

      releaseDate: Joi.date(),

      endDate: Joi.date(),

      ageRating: Joi.string().valid(...Object.values(AGE_RATING)),

      actors: Joi.array().items(Joi.string()),
    })
    .custom((value, helpers) => {
      if (value.releaseDate && value.endDate) {
        const releaseDate = new Date(value.releaseDate);
        const endDate = new Date(value.endDate);

        if (endDate <= releaseDate) {
          return helpers.message("endDate must be greater than releaseDate");
        }
      }

      return value;
    })
    .min(1),
};

const deleteMovie = {
  params: Joi.object().keys({
    id: Joi.string().hex().length(24).required(),
  }),
};

const getMovie = deleteMovie;

const getMovies = {
  query: Joi.object().keys({
    keyword: Joi.string(),
    title: Joi.string(),
    genres: Joi.string(),
    type: Joi.string().valid(...Object.values(MOVIE_TYPE)),
    origin: Joi.string(),
    ageRating: Joi.string().valid(...Object.values(AGE_RATING)),
    releaseDate: Joi.date(),
    endDate: Joi.date(),
    location: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    populate: Joi.string(),
  }),
};

const getNowShowingMovies = {
  query: Joi.object().keys({
    location: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    populate: Joi.string(),
  }),
};

const getUpcomingMovies = {
  query: Joi.object().keys({
    location: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    populate: Joi.string(),
  }),
};

module.exports = {
  createMovie,
  updateMovie,
  deleteMovie,
  getMovie,
  getMovies,
  getNowShowingMovies,
  getUpcomingMovies,
};
