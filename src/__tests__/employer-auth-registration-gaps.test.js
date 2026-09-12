const mockSendEmail = jest.fn().mockResolvedValue({ success: true });
const mockSendBulkEmail = jest.fn().mockResolvedValue({ success: true });

jest.mock('../adapters/email', () => ({
  getEmailAdapter: () => ({
    sendEmail: mockSendEmail,
    sendBulkEmail: mockSendBulkEmail,
  }),
}));

const authService = require('../services/auth.service');
const companyService = require('../services/company.service');
const { authenticate, requireVerifiedCompany } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const { getCountryPlugin } = require('../plugins/countries');
const User = require('../models/User');
const Company = require('../models/Company');
const CompanyInvitation = require('../models/CompanyInvitation');
const { TeamPermission, VerificationStatus } = require('../utils/constants');
const { generateAccessToken } = require('../utils/tokens');

jest.mock('../models/User');
jest.mock('../models/Company');
jest.mock('../models/CompanyInvitation');
jest.mock('../models/Pipeline', () => ({
  createDefaultPipeline: jest.fn().mockResolvedValue({}),
}));
jest.mock('../adapters/queue', () => ({
  getQueueAdapter: () => ({
    addJob: jest.fn().mockResolvedValue({}),
  }),
}));

describe('Employer Registration, Login & Onboarding Suite (Gaps 1-10)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.hashToken = (t) => require('crypto').createHash('sha256').update(t).digest('hex');
  });

  // =========================================================================
  // GAP 1: req.companyMember and req.company in Auth Middleware
  // =========================================================================
  describe('GAP 1: req.companyMember in Auth Middleware & RBAC', () => {
    it('populates req.company and req.companyMember for company owner', async () => {
      const mockUser = {
        _id: 'user_owner_1',
        role: 'employer',
        company: 'comp_1',
        status: 'active',
      };
      const mockCompany = {
        _id: 'comp_1',
        owner: 'user_owner_1',
        teamMembers: [],
        verificationStatus: 'approved',
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      });
      Company.findById.mockResolvedValue(mockCompany);

      const token = generateAccessToken({ userId: 'user_owner_1', role: 'employer' });
      const req = {
        headers: { authorization: `Bearer ${token}` },
      };
      const res = {};

      await new Promise((resolve, reject) => {
        authenticate(req, res, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      expect(req.user).toBeDefined();
      expect(req.company).toBeDefined();
      expect(req.companyMember).toBeDefined();
      expect(req.companyMember.isOwner).toBe(true);
      expect(req.companyMember.permissions).toEqual(Object.values(TeamPermission));

      // Test requirePermission works with populated req.companyMember
      const permNext = jest.fn();
      requirePermission(TeamPermission.MANAGE_JOBS)(req, res, permNext);
      expect(permNext).toHaveBeenCalled();
    });

    it('populates req.companyMember for team member with specific permissions', async () => {
      const mockUser = {
        _id: 'user_recruiter_2',
        role: 'employer',
        company: 'comp_1',
        status: 'active',
      };
      const mockCompany = {
        _id: 'comp_1',
        owner: 'user_owner_1',
        teamMembers: [
          {
            user: 'user_recruiter_2',
            permissions: [TeamPermission.VIEW_APPLICATIONS],
          },
        ],
        verificationStatus: 'approved',
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      });
      Company.findById.mockResolvedValue(mockCompany);

      const token = generateAccessToken({ userId: 'user_recruiter_2', role: 'employer' });
      const req = {
        headers: { authorization: `Bearer ${token}` },
      };
      const res = {};

      await new Promise((resolve, reject) => {
        authenticate(req, res, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      expect(req.companyMember.isOwner).toBe(false);
      expect(req.companyMember.permissions).toEqual([TeamPermission.VIEW_APPLICATIONS]);

      // Permitted permission
      const allowNext = jest.fn();
      requirePermission(TeamPermission.VIEW_APPLICATIONS)(req, res, allowNext);
      expect(allowNext).toHaveBeenCalled();

      // Denied permission
      const denyNext = jest.fn();
      expect(() => {
        requirePermission(TeamPermission.MANAGE_BILLING)(req, res, denyNext);
      }).toThrow('Access denied. You need the "manage_billing" permission to perform this action.');
    });
  });

  // =========================================================================
  // GAP 2: Corporate Email Validation at POST /auth/register
  // =========================================================================
  describe('GAP 2: Corporate Email Validation for Employers', () => {
    it('rejects free consumer email providers when role is employer', async () => {
      User.findOne.mockResolvedValue(null);

      await expect(
        authService.register({
          email: 'recruiter@gmail.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'employer',
          countryCode: 'IN',
        })
      ).rejects.toThrow('A business/corporate email address is required');
    });

    it('allows jobseeker registration with consumer email', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: 'user_jobseeker_1',
        email: 'candidate@gmail.com',
        role: 'jobseeker',
        firstName: 'Jane',
        lastName: 'Doe',
        isEmailVerified: false,
        save: jest.fn().mockResolvedValue(true),
      });

      const result = await authService.register({
        email: 'candidate@gmail.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'jobseeker',
      });

      expect(result.user.email).toBe('candidate@gmail.com');
      expect(result.user.role).toBe('jobseeker');
    });

    it('allows employer registration with valid corporate email', async () => {
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: 'user_employer_1',
        email: 'talent@google.com',
        role: 'employer',
        firstName: 'Recruiter',
        lastName: 'Corp',
        isEmailVerified: false,
        save: jest.fn().mockResolvedValue(true),
      });

      const result = await authService.register({
        email: 'talent@google.com',
        password: 'Password123!',
        firstName: 'Recruiter',
        lastName: 'Corp',
        role: 'employer',
        countryCode: 'US',
      });

      expect(result.user.email).toBe('talent@google.com');
      expect(result.user.role).toBe('employer');
    });
  });

  // =========================================================================
  // GAP 3: POST /auth/resend-verification-email
  // =========================================================================
  describe('GAP 3: Resend Verification Email', () => {
    it('resends verification email for unverified user', async () => {
      User.findOne.mockResolvedValue({
        _id: 'user_unverified_1',
        email: 'hr@techcorp.io',
        isEmailVerified: false,
      });

      await authService.resendVerificationEmail('hr@techcorp.io');
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'hr@techcorp.io',
          subject: expect.stringMatching(/verify.*email/i),
        })
      );
    });

    it('rejects resend if user is already verified', async () => {
      User.findOne.mockResolvedValue({
        _id: 'user_verified_1',
        email: 'hr@techcorp.io',
        isEmailVerified: true,
      });

      await expect(
        authService.resendVerificationEmail('hr@techcorp.io')
      ).rejects.toThrow('This email address is already verified');
    });
  });

  // =========================================================================
  // GAP 5: Refresh Token Persistence, Validation & Rotation
  // =========================================================================
  describe('GAP 5: Refresh Token Persistence and Rotation', () => {
    it('validates stored refresh token and rotates it', async () => {
      const { generateRefreshToken } = require('../utils/tokens');
      const oldRefreshToken = generateRefreshToken({ userId: 'user_persist_1' });
      const hashedOld = User.hashToken(oldRefreshToken);

      const mockUser = {
        _id: 'user_persist_1',
        status: 'active',
        role: 'employer',
        refreshToken: hashedOld,
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const newTokens = await authService.refreshAccessToken(oldRefreshToken);
      expect(newTokens.accessToken).toBeDefined();
      expect(newTokens.refreshToken).toBeDefined();
      expect(mockUser.refreshToken).not.toBe(hashedOld); // Rotated
      expect(mockUser.save).toHaveBeenCalled();
    });

    it('rejects invalid or previously used/revoked refresh token', async () => {
      const { generateRefreshToken } = require('../utils/tokens');
      const refreshToken = generateRefreshToken({ userId: 'user_persist_2' });

      const mockUser = {
        _id: 'user_persist_2',
        status: 'active',
        role: 'employer',
        refreshToken: 'different_hash_value',
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        authService.refreshAccessToken(refreshToken)
      ).rejects.toThrow('Invalid, revoked or expired refresh token');
    });
  });

  // =========================================================================
  // GAP 6 & 7: Populated Company in Login & Verification Checks
  // =========================================================================
  describe('GAP 6 & 7: Company Context and Verification in Login', () => {
    it('populates company details and permissions on employer login', async () => {
      const mockUser = {
        _id: 'user_emp_10',
        authProvider: 'local',
        status: 'active',
        role: 'employer',
        company: 'comp_10',
        comparePassword: jest.fn().mockResolvedValue(true),
        toJSON: () => ({ _id: 'user_emp_10', role: 'employer' }),
        save: jest.fn().mockResolvedValue(true),
      };

      const mockCompany = {
        _id: 'comp_10',
        name: 'OmniCorp Solutions',
        slug: 'omnicorp-solutions',
        logoUrl: 'https://cdn.example.com/logo.png',
        countryCode: 'US',
        verificationStatus: 'approved',
        owner: 'user_emp_10',
        teamMembers: [],
      };

      User.findByEmailWithPassword.mockResolvedValue(mockUser);
      Company.findById.mockResolvedValue(mockCompany);

      const result = await authService.login('hr@omnicorp.com', 'ValidPassword123!');
      expect(result.user.company).toBeDefined();
      expect(result.user.company.name).toBe('OmniCorp Solutions');
      expect(result.user.company.isOwner).toBe(true);
      expect(result.user.company.isVerified).toBe(true);
      expect(result.user.company.permissions).toEqual(Object.values(TeamPermission));
    });

    it('rejects employer login if company verification is rejected', async () => {
      const mockUser = {
        _id: 'user_emp_11',
        authProvider: 'local',
        status: 'active',
        role: 'employer',
        company: 'comp_11',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      const mockCompany = {
        _id: 'comp_11',
        name: 'Rejected Corp',
        verificationStatus: 'rejected',
        verificationNotes: 'Fraudulent business registration documents provided',
        owner: 'user_emp_11',
      };

      User.findByEmailWithPassword.mockResolvedValue(mockUser);
      Company.findById.mockResolvedValue(mockCompany);

      await expect(
        authService.login('hr@rejectedcorp.com', 'ValidPassword123!')
      ).rejects.toThrow('Fraudulent business registration documents provided');
    });

    it('requireVerifiedCompany middleware blocks unapproved company profiles', () => {
      const reqPending = {
        company: { verificationStatus: 'pending' },
      };
      const reqApproved = {
        company: { verificationStatus: 'approved' },
      };
      const next = jest.fn();

      expect(() => {
        requireVerifiedCompany(reqPending, {}, next);
      }).toThrow('An approved company profile is required');

      requireVerifiedCompany(reqApproved, {}, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // GAP 8: Team Invitation Flow
  // =========================================================================
  describe('GAP 8: Team Member Invitation Lifecycle', () => {
    it('creates team invitation and dispatches invitation email', async () => {
      Company.findById.mockResolvedValue({
        _id: 'comp_inv_1',
        name: 'Stark Enterprises',
        owner: 'owner_stark',
        isTeamMember: () => false,
      });
      User.findOne.mockResolvedValue(null);
      User.findById.mockResolvedValue({
        _id: 'owner_stark',
        getFullName: () => 'Tony Stark',
      });
      CompanyInvitation.updateMany.mockResolvedValue({});
      CompanyInvitation.create.mockImplementation(async (data) => ({
        ...data,
        toJSON: () => data,
      }));

      const invite = await companyService.inviteTeamMember('comp_inv_1', 'owner_stark', {
        email: 'peter@starkenterprises.com',
        permissions: [TeamPermission.MANAGE_JOBS, TeamPermission.VIEW_APPLICATIONS],
      });

      expect(invite.email).toBe('peter@starkenterprises.com');
      expect(invite.token).toBeDefined();
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'peter@starkenterprises.com',
          subject: expect.stringContaining('Stark Enterprises'),
        })
      );
    });

    it('accepts team invitation and registers new team member', async () => {
      const mockInvite = {
        token: 'valid_invite_token_123',
        company: 'comp_inv_2',
        email: 'bruce@starkenterprises.com',
        permissions: [TeamPermission.MANAGE_JOBS],
        status: 'pending',
        isExpired: () => false,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockCompany = {
        _id: 'comp_inv_2',
        name: 'Stark Enterprises',
        countryCode: 'US',
        teamMembers: [],
        isTeamMember: () => false,
        save: jest.fn().mockResolvedValue(true),
        toJSON: () => ({ _id: 'comp_inv_2', name: 'Stark Enterprises' }),
      };

      CompanyInvitation.findOne.mockResolvedValue(mockInvite);
      Company.findById.mockResolvedValue(mockCompany);
      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue({
        _id: 'user_bruce_1',
        email: 'bruce@starkenterprises.com',
        role: 'employer',
        company: 'comp_inv_2',
        save: jest.fn().mockResolvedValue(true),
        toJSON: () => ({ _id: 'user_bruce_1', email: 'bruce@starkenterprises.com' }),
      });

      const result = await companyService.acceptInvitation('valid_invite_token_123', {
        firstName: 'Bruce',
        lastName: 'Banner',
        password: 'Password123!',
      });

      expect(mockInvite.status).toBe('accepted');
      expect(mockCompany.teamMembers).toHaveLength(1);
      expect(result.user.email).toBe('bruce@starkenterprises.com');
      expect(result.tokens).toBeDefined();
    });
  });

  // =========================================================================
  // GAP 9: GSTIN vs PAN Cross-Validation (India)
  // =========================================================================
  describe('GAP 9: GSTIN vs PAN Cross-Validation in IN Plugin', () => {
    const inPlugin = getCountryPlugin('IN');

    it('approves registration when characters 3-12 of GSTIN match PAN', () => {
      const validation = inPlugin.validateCompanyRegistration({
        gstNumber: '27AABCT1234F1Z5',
        panNumber: 'AABCT1234F',
        registeredAddress: {
          pincode: '400001',
          state: 'MH',
          city: 'Mumbai',
          street: '123 Marine Drive',
        },
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('rejects registration when characters 3-12 of GSTIN do NOT match PAN', () => {
      const validation = inPlugin.validateCompanyRegistration({
        gstNumber: '27AAAAA0000A1Z5', // PAN is AAAAA0000A
        panNumber: 'AABCT1234F',      // Mismatched PAN!
        registeredAddress: {
          pincode: '400001',
          state: 'MH',
          city: 'Mumbai',
          street: '123 Marine Drive',
        },
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors[0].field).toBe('gstNumber');
      expect(validation.errors[0].message).toContain('GSTIN PAN mismatch');
    });
  });

  // =========================================================================
  // GAP 10: Corporate Domain Auto-Matching & Join Flow
  // =========================================================================
  describe('GAP 10: Corporate Domain Auto-Matching & Join Request Flow', () => {
    it('matches an existing registered company by corporate domain', async () => {
      Company.findOne.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          _id: 'comp_domain_1',
          name: 'Acme Corporation',
          slug: 'acme-corporation',
          logoUrl: 'https://cdn.example.com/acme.png',
          countryCode: 'US',
          verificationStatus: 'approved',
        }),
      });

      const result = await companyService.matchCompanyByDomain('careers@acme-corp.com');
      expect(result.matched).toBe(true);
      expect(result.company.name).toBe('Acme Corporation');
    });

    it('ignores free consumer domains during domain lookup', async () => {
      const result = await companyService.matchCompanyByDomain('user@gmail.com');
      expect(result.matched).toBe(false);
      expect(result.reason).toBe('consumer_domain');
    });

    it('sends join request notification email to company owner', async () => {
      Company.findById.mockResolvedValue({
        _id: 'comp_domain_2',
        name: 'Nexus Dynamics',
        owner: 'user_owner_nexus',
        isTeamMember: () => false,
      });

      User.findById.mockImplementation(async (id) => {
        if (id === 'user_requester_1') {
          return {
            _id: 'user_requester_1',
            firstName: 'Natasha',
            lastName: 'Romanoff',
            email: 'natasha@nexusdynamics.io',
            getFullName: () => 'Natasha Romanoff',
          };
        }
        if (id === 'user_owner_nexus') {
          return {
            _id: 'user_owner_nexus',
            email: 'admin@nexusdynamics.io',
          };
        }
        return null;
      });

      const result = await companyService.requestToJoinCompany('comp_domain_2', 'user_requester_1');
      expect(result.success).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'admin@nexusdynamics.io',
          subject: expect.stringContaining('Team Join Request for Nexus Dynamics'),
        })
      );
    });
  });
});
