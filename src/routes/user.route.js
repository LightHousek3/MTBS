const express = require('express');
const { userController } = require('../controllers');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const validate = require('../middlewares/validate.middleware');
const { authValidator } = require('../validators');
const { USER_ROLE } = require('../constants');

const router = express.Router();

router.get('/me/profile', authenticate, userController.getProfile);
router.patch('/me/profile', authenticate, upload.single('avatar'), validate(authValidator.updateProfile), userController.updateProfile);
router.patch('/me/change-password', authenticate, validate(authValidator.changePassword), userController.changePassword);

router.get('/', authenticate, authorize(USER_ROLE.ADMIN), userController.getUserList);
router.patch('/:id/status', authenticate, authorize(USER_ROLE.ADMIN), validate(authValidator.updateUserStatus), userController.updateUserStatus);

module.exports = router;
