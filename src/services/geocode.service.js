const https = require('https');
const { ApiError } = require('../utils');
const { httpStatus, messages } = require('../constants');

const NOMINATIM_URL = 'nominatim.openstreetmap.org';
const USER_AGENT = 'MTBS/1.0 (movie-ticket-booking-system)';

/**
 * Geocode an address string to coordinates using OpenStreetMap Nominatim API.
 * @param {string} address - The address to geocode
 * @returns {Promise<{ lat: number, lng: number }>} Resolved coordinates
 * @throws {ApiError} If address cannot be resolved or service is unavailable
 */
const geocodeAddress = (address) => {
    return new Promise((resolve, reject) => {
        const query = encodeURIComponent(address);
        const path = `/search?q=${query}&format=json&limit=1&addressdetails=0`;

        const options = {
            hostname: NOMINATIM_URL,
            path,
            method: 'GET',
            headers: {
                'User-Agent': USER_AGENT,
                'Accept-Language': 'en',
            },
        };

        const req = https.request(options, (res) => {
            let raw = '';

            res.on('data', (chunk) => {
                raw += chunk;
            });

            res.on('end', () => {
                try {
                    const results = JSON.parse(raw);

                    if (!Array.isArray(results) || results.length === 0) {
                        return reject(
                            new ApiError(
                                httpStatus.UNPROCESSABLE_ENTITY,
                                messages.THEATER.GEOCODE_NOT_FOUND,
                            ),
                        );
                    }

                    const { lat, lon } = results[0];
                    resolve({ lat: parseFloat(lat), lng: parseFloat(lon) });
                } catch {
                    reject(
                        new ApiError(
                            httpStatus.INTERNAL_SERVER_ERROR,
                            messages.SERVER.INTERNAL_ERROR,
                        ),
                    );
                }
            });
        });

        req.on('error', () => {
            reject(
                new ApiError(
                    httpStatus.SERVICE_UNAVAILABLE,
                    messages.THEATER.GEOCODE_SERVICE_ERROR,
                ),
            );
        });

        req.setTimeout(8000, () => {
            req.destroy();
            reject(
                new ApiError(
                    httpStatus.SERVICE_UNAVAILABLE,
                    messages.THEATER.GEOCODE_SERVICE_ERROR,
                ),
            );
        });

        req.end();
    });
};

module.exports = { geocodeAddress };
