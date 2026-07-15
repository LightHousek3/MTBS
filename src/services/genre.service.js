const { Genre, Movie } = require('../models');
const { ApiError } = require('../utils');
const { httpStatus, messages } = require('../constants');

const createGenre = async (body) => {
    const existing = await Genre.findOne({
        name: {
            $regex: `^${body.name.trim()}$`,
            $options: 'i',
        },
    });
    if (existing) {
        throw ApiError.conflict(messages.CRUD.ALREADY_EXISTS('Genre'));
    }
    return Genre.create(body);
};

const getGenres = async (filter, options) => {
    const queryFilter = {};

    // Text search
    if (filter.search) {
        queryFilter.$or = [{ name: { $regex: filter.search, $options: 'i' } }];
    }
    return Genre.paginate(queryFilter, options);
};

const getGenreById = async (id) => {
    const genre = await Genre.findById(id);
    if (!genre) {
        throw ApiError.notFound(messages.CRUD.NOT_FOUND('Genre'));
    }
    return genre;
};

const updateGenreById = async (id, updateBody) => {
    const genre = await Genre.findByIdAndUpdate(id, updateBody, { new: true });
    return genre;
};

const deleteGenreById = async (id) => {
    await getGenreById(id);

    const movieUsingGenre = await Movie.findOne({ genres: id }).select('_id');
    if (movieUsingGenre) {
        throw ApiError.conflict(messages.GENRE.IN_USE_BY_MOVIE);
    }

    return Genre.softDeleteById(id);
};

module.exports = {
    createGenre,
    getGenres,
    getGenreById,
    updateGenreById,
    deleteGenreById,
};
