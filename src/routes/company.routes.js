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
  inviteTeamMemberSchema,
  acceptInvitationSchema,
  matchDomainSchema,
  requestJoinSchema,
  uploadCompanyDocumentSchema,
  sendPhoneOtpSchema,
  verifyPhoneOtpSchema,
} = require('../validators/company.validator');
const { uploadDocument } = require('../middlewares/upload.middleware');

const router = express.Router();

// ── Public Routes (Domain lookup & Invitation acceptance) ────────
router.get('/lookup/domain', validate(matchDomainSchema), companyController.matchDomain);
router.get('/invitations/:token', companyController.getInvitationByToken);
router.post(
  '/invitations/:token/accept',
  validate(acceptInvitationSchema),
  companyController.acceptInvitation
);

// Public route to view company profile
router.get('/:id', companyController.getCompany);

// ── Protected Routes ──────────────────────────────────────────────
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

// Team invitation routes (Owner only)
router.post(
  '/:id/invitations',
  authorize('employer', 'admin'),
  validate(inviteTeamMemberSchema),
  companyController.inviteTeamMember
);
router.get('/:id/invitations', authorize('employer', 'admin'), companyController.getInvitations);
router.delete('/:id/invitations/:inviteId', authorize('employer', 'admin'), companyController.revokeInvitation);

// Domain join request
router.post('/:id/request-join', validate(requestJoinSchema), companyController.requestJoin);

module.exports = router;

