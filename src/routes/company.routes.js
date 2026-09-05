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
  uploadCompanyDocumentSchema,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
} = require('../validators/company.validator');
const { uploadDocument } = require('../middlewares/upload.middleware');

const router = express.Router();

// Public route to view company profile
router.get('/:id', companyController.getCompany);

// Protected routes
router.use(authenticate);

// Gap 3: Phone verification OTP routes
router.post('/phone/send-otp', validate(sendPhoneOtpSchema), companyController.sendPhoneOtp);
router.post(
  '/:id/phone/verify-otp',
  authorize('employer', 'admin'),
  validate(verifyPhoneOtpSchema),
  companyController.verifyPhoneOtp
);

router.post(
  '/',
  resolveCountryContext({ required: true }),
  validate(createCompanySchema),
  companyController.registerCompany
);

router.patch('/:id', authorize('employer', 'admin'), validate(updateCompanySchema), companyController.updateCompany);

// Document upload & verification checklist routes
router.post(
  '/:id/documents',
  authorize('employer', 'admin'),
  uploadDocument,
  validate(uploadCompanyDocumentSchema),
  companyController.uploadDocument
);
router.get('/:id/documents', authorize('employer', 'admin'), companyController.getDocuments);

// Team member management routes (Owner only)
router.post('/:id/team', authorize('employer', 'admin'), validate(addTeamMemberSchema), companyController.addTeamMember);
router.patch('/:id/team/:userId', authorize('employer', 'admin'), validate(updateTeamMemberSchema), companyController.updateTeamMemberPermissions);
router.delete('/:id/team/:userId', authorize('employer', 'admin'), companyController.removeTeamMember);

module.exports = router;
