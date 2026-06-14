const { serviceService } = require('../services');
const { asyncHandler, ResponseHandler, pick } = require('../utils');
const { messages } = require('../constants');

const createService = asyncHandler(async (req, res) => {
    const service = await serviceService.createService(req.body);
    ResponseHandler.created(res, {
        message: messages.CRUD.CREATED('Service'),
        data: service,
    });
});

const getServices = asyncHandler(async (req, res) => {
    const filter = pick(req.query, ['theater', 'type', 'status', 'search']);
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'select', 'populate']);
    const result = await serviceService.getServices(filter, options);

    ResponseHandler.paginated(res, {
        message: messages.CRUD.LIST_FETCHED('Services'),
        data: result.results,
        meta: result.meta,
    });
});

const getService = asyncHandler(async (req, res) => {
    const service = await serviceService.getServiceById(req.params.id);
    ResponseHandler.success(res, {
        message: messages.CRUD.FETCHED('Service'),
        data: service,
    });
});

const updateService = asyncHandler(async (req, res) => {
    const service = await serviceService.updateServiceById(req.params.id, req.body);
    ResponseHandler.success(res, {
        message: messages.CRUD.UPDATED('Service'),
        data: service,
    });
});

const updateServiceStatus = asyncHandler(async (req, res) => {
    const service = await serviceService.updateServiceStatus(req.params.id, req.body.status);
    ResponseHandler.success(res, {
        message: messages.CRUD.UPDATED('Service status'),
        data: service,
    });
});

const deleteService = asyncHandler(async (req, res) => {
    await serviceService.deleteServiceById(req.params.id);
    ResponseHandler.success(res, {
        message: messages.CRUD.DELETED('Service'),
    });
});

module.exports = {
    createService,
    getServices,
    getService,
    updateService,
    updateServiceStatus,
    deleteService,
};
