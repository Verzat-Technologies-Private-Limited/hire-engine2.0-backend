const express = require('express');
const companyController = require('../controllers/company.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/rbac.middleware');
const { resolveCountryContext } = require('../middlewares/countryContext.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createCompanySchema,
  updateCompanySchema,
  addTeamMemberSchema,
  updateTeamMemberSchema,
} = require('../validators/company.validator');

const router = express.Router();

// Public route to view company profile
router.get('/:id', companyController.getCompany);

// Protected routes
router.use(authenticate);

router.post(
  '/',
  resolveCountryContext({ required: true }),
  validate(createCompanySchema),
  companyController.registerCompany
);

router.patch('/:id', authorize('employer', 'admin'), validate(updateCompanySchema), companyController.updateCompany);

// Team member management routes (Owner only)
router.post('/:id/team', authorize('employer', 'admin'), validate(addTeamMemberSchema), companyController.addTeamMember);
router.patch('/:id/team/:userId', authorize('employer', 'admin'), validate(updateTeamMemberSchema), companyController.updateTeamMemberPermissions);
router.delete('/:id/team/:userId', authorize('employer', 'admin'), companyController.removeTeamMember);

module.exports = router;
