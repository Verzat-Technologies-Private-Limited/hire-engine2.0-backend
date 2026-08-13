const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateProfileSchema, toggleVisibilitySchema } = require('../validators/user.validator');

const router = express.Router();

router.use(authenticate);

router.get('/me', userController.getProfile);
router.patch('/me', validate(updateProfileSchema), userController.updateProfile);
router.patch('/me/visibility', validate(toggleVisibilitySchema), userController.toggleVisibility);
router.delete('/me', userController.deleteAccount);

module.exports = router;
