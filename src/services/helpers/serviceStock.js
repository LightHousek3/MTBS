const { Service } = require('../../models');
const { ApiError } = require('../../utils');
const { messages, SERVICE_STATUS } = require('../../constants');

const assertServiceStockAvailable = (serviceInputs, serviceMap) => {
    for (const input of serviceInputs) {
        const service = serviceMap.get(input.serviceId);
        if (!service) {
            throw ApiError.notFound(messages.CRUD.NOT_FOUND('One or more services'));
        }
        if (service.quantity < input.quantity) {
            throw ApiError.conflict(messages.BOOKING.SERVICE_INSUFFICIENT(service.name));
        }
    }
};

const refundServiceReservations = async (reservations = []) => {
    if (!reservations.length) return;

    await Service.bulkWrite(
        reservations.map((reservation) => ({
            updateOne: {
                filter: { _id: reservation.serviceId },
                update: { $inc: { quantity: reservation.quantity } },
            },
        })),
    );
};

const reserveServiceQuantities = async (serviceInputs, serviceMap) => {
    const reservations = [];

    for (const input of serviceInputs) {
        const service = serviceMap.get(input.serviceId);
        const reserved = await Service.findOneAndUpdate(
            {
                _id: service._id,
                status: SERVICE_STATUS.AVAILABLE,
                quantity: { $gte: input.quantity },
            },
            { $inc: { quantity: -input.quantity } },
            { new: false },
        );

        if (reserved) {
            reservations.push({ serviceId: service._id, quantity: input.quantity });
            continue;
        }

        await refundServiceReservations(reservations);

        const freshService = await Service.findById(service._id);
        if (!freshService || freshService.status !== SERVICE_STATUS.AVAILABLE) {
            throw ApiError.conflict(messages.BOOKING.SERVICE_NOT_AVAILABLE);
        }
        throw ApiError.conflict(messages.BOOKING.SERVICE_INSUFFICIENT(freshService.name));
    }

    return reservations;
};

const refundBookingServices = async (booking) => {
    if (!booking?.services?.length) return;

    await Service.bulkWrite(
        booking.services.map((bookedService) => ({
            updateOne: {
                filter: { _id: bookedService.service },
                update: { $inc: { quantity: bookedService.quantity } },
            },
        })),
    );
};

module.exports = {
    assertServiceStockAvailable,
    reserveServiceQuantities,
    refundBookingServices,
    refundServiceReservations,
};
