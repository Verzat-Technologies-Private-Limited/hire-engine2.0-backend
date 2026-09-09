const mockSendEmail = jest.fn().mockResolvedValue({ success: true });
const mockSendBulkEmail = jest.fn().mockResolvedValue({ success: true });

jest.mock('../adapters/email', () => ({
  getEmailAdapter: () => ({
    sendEmail: mockSendEmail,
    sendBulkEmail: mockSendBulkEmail,
  }),
}));

const companyService = require('../services/company.service');
const adminService = require('../services/admin.service');
const notificationService = require('../services/notification.service');
const emailService = require('../services/email.service');
const smsService = require('../services/sms.service');
const User = require('../models/User');
const Company = require('../models/Company');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { VerificationStatus, NotificationType } = require('../utils/constants');
const { createCompanySchema } = require('../validators/company.validator');
const { verifyEmployerSchema } = require('../validators/admin.validator');

// Mock Mongoose models and third-party dependencies
jest.mock('../models/User');
jest.mock('../models/Company');
jest.mock('../models/Notification');
jest.mock('../models/AuditLog');
jest.mock('../models/Pipeline', () => ({
  createDefaultPipeline: jest.fn().mockResolvedValue({}),
}));

describe('High Severity Employer Registration & Verification Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  // =========================================================================
  // GAP 3: Company Registration Phone Number & Contact Verification
  // =========================================================================
  describe('GAP 3: Business Phone & Contact Verification', () => {
    it('createCompanySchema validation requires phone number', () => {
      const payloadWithoutPhone = {
        name: 'Tech Innovations Pvt Ltd',
        countryCode: 'IN',
      };
      const { error } = createCompanySchema.body.validate(payloadWithoutPhone);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('Business phone number is required');
    });

    it('should save phone and contactName during registration', async () => {
      User.findById.mockResolvedValue({
        _id: 'user_owner_1',
        email: 'hr@techinnovations.in',
        isEmailVerified: true,
      });
      Company.findOne.mockResolvedValue(null);
      Company.create.mockImplementation(async (data) => ({
        ...data,
        _id: 'comp_1',
        toJSON: () => ({ ...data, _id: 'comp_1' }),
      }));
      User.findByIdAndUpdate.mockResolvedValue({});

      const regData = {
        name: 'Tech Innovations Pvt Ltd',
        countryCode: 'IN',
        phone: '+919876543210',
        contactName: 'Jane Doe',
        registrationDetails: {
          gstNumber: '27AAAAA0000A1Z5',
          panNumber: 'ABCDE1234F',
          registeredAddress: {
            street: 'MG Road',
            city: 'Mumbai',
            state: 'MH',
            pincode: '400001',
          },
        },
      };

      const result = await companyService.registerCompany('user_owner_1', regData);
      expect(result.phone).toBe('+919876543210');
      expect(result.contactName).toBe('Jane Doe');
      expect(result.isPhoneVerified).toBe(false);
      expect(Company.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '+919876543210',
          contactName: 'Jane Doe',
          isPhoneVerified: false,
        })
      );
    });

    it('should verify phone on registration if valid phoneOtp is provided', async () => {
      User.findById.mockResolvedValue({
        _id: 'user_owner_2',
        email: 'founder@techcorp.io',
        isEmailVerified: true,
      });
      Company.findOne.mockResolvedValue(null);
      Company.create.mockImplementation(async (data) => ({
        ...data,
        _id: 'comp_2',
        toJSON: () => ({ ...data, _id: 'comp_2' }),
      }));
      User.findByIdAndUpdate.mockResolvedValue({});

      // Generate OTP in SMS store
      const testMobile = '+15551234567';
      await smsService.generateAndSendOtp(testMobile);
      const storedOtp = smsService._otpStore.get(testMobile).otp;

      const regData = {
        name: 'TechCorp Solutions',
        countryCode: 'US',
        phone: testMobile,
        phoneOtp: storedOtp,
        registrationDetails: {
          einNumber: '12-3456789',
          stateOfIncorporation: 'CA',
          businessType: 'llc',
          registeredAddress: {
            street: '100 Pine St',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94111',
          },
        },
      };

      const result = await companyService.registerCompany('user_owner_2', regData);
      expect(result.isPhoneVerified).toBe(true);
      expect(result.verifiedPhone).toBe(true);
    });

    it('should allow phone OTP verification after registration via verifyCompanyPhoneOtp', async () => {
      const testMobile = '+919811223344';
      await smsService.generateAndSendOtp(testMobile);
      const storedOtp = smsService._otpStore.get(testMobile).otp;

      const mockCompany = {
        _id: 'comp_3',
        owner: 'user_owner_3',
        phone: '',
        isPhoneVerified: false,
        isTeamMember: (uid) => uid === 'user_owner_3',
        save: jest.fn().mockResolvedValue(true),
        toJSON() {
          return {
            _id: this._id,
            phone: this.phone,
            isPhoneVerified: this.isPhoneVerified,
            verifiedPhone: this.verifiedPhone,
          };
        },
      };
      Company.findById.mockResolvedValue(mockCompany);

      const updated = await companyService.verifyCompanyPhoneOtp(
        'comp_3',
        'user_owner_3',
        testMobile,
        storedOtp
      );

      expect(updated.isPhoneVerified).toBe(true);
      expect(updated.verifiedPhone).toBe(true);
      expect(updated.phone).toBe(testMobile);
      expect(mockCompany.save).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // GAP 8: Verification Decision Multi-State ("information_required", "under_review")
  // =========================================================================
  describe('GAP 8: Multi-State Verification Decision', () => {
    it('verifyEmployerSchema accepts all VerificationStatus enum values', () => {
      const allowed = ['approved', 'rejected', 'information_required', 'under_review'];
      for (const status of allowed) {
        const { error } = verifyEmployerSchema.body.validate({ status, notes: 'Test notes' });
        expect(error).toBeUndefined();
      }

      const { error: invalidErr } = verifyEmployerSchema.body.validate({ status: 'unknown_status' });
      expect(invalidErr).toBeDefined();
    });

    it('setting status to information_required records timestamp and notes', async () => {
      const mockCompany = {
        _id: 'comp_8',
        name: 'Acme Info Corp',
        owner: 'user_owner_8',
        verificationStatus: 'pending',
        save: jest.fn().mockResolvedValue(true),
        toJSON() {
          return { ...this };
        },
      };
      Company.findById.mockResolvedValue(mockCompany);
      User.findById.mockResolvedValue({
        _id: 'user_owner_8',
        email: 'owner@acme.com',
        firstName: 'Alice',
      });
      Notification.create.mockResolvedValue({});
      AuditLog.log = jest.fn().mockResolvedValue({});

      const notes = 'Please upload a clearer copy of your Certificate of Incorporation';
      await adminService.verifyEmployer('comp_8', 'admin_1', {
        status: VerificationStatus.INFORMATION_REQUIRED,
        notes,
      });

      expect(mockCompany.verificationStatus).toBe('information_required');
      expect(mockCompany.infoRequestedAt).toBeInstanceOf(Date);
      expect(mockCompany.infoRequestedNotes).toBe(notes);
      expect(mockCompany.save).toHaveBeenCalled();

      // Check audit log action
      expect(AuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'company.information_requested',
          details: { status: 'information_required', notes },
        })
      );
    });

    it('getPendingEmployers queries pending, under_review, and information_required by default', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      Company.find.mockReturnValue(mockQuery);
      Company.countDocuments.mockResolvedValue(0);

      await adminService.getPendingEmployers({});
      expect(Company.find).toHaveBeenCalledWith(
        expect.objectContaining({
          verificationStatus: { $in: ['pending', 'under_review', 'information_required'] },
        })
      );
    });
  });

  // =========================================================================
  // GAP 9: Admin Notification & Review SLA on New Registrations
  // =========================================================================
  describe('GAP 9: Admin Review SLA & Dashboard Notification', () => {
    it('sets reviewDeadlineAt driven by country plugin SLA (24h for US, 48h for IN)', async () => {
      User.findById.mockResolvedValue({
        _id: 'user_owner_9',
        email: 'ops@cloudscale.io',
        isEmailVerified: true,
      });
      Company.findOne.mockResolvedValue(null);
      Company.create.mockImplementation(async (data) => ({
        ...data,
        _id: 'comp_9',
        toJSON: () => ({ ...data, _id: 'comp_9' }),
      }));
      User.findByIdAndUpdate.mockResolvedValue({});

      // US Plugin specifies 24 hours SLA
      const beforeUS = Date.now() + 24 * 60 * 60 * 1000;
      const resultUS = await companyService.registerCompany('user_owner_9', {
        name: 'CloudScale Technologies US',
        countryCode: 'US',
        phone: '+15559876543',
        registrationDetails: {
          einNumber: '33-4455667',
          stateOfIncorporation: 'DE',
          businessType: 'corporation',
          registeredAddress: {
            street: '100 Main St',
            city: 'Dover',
            state: 'DE',
            zipCode: '19901',
          },
        },
      });

      expect(resultUS.reviewDeadlineAt).toBeDefined();
      const diffMsUS = Math.abs(new Date(resultUS.reviewDeadlineAt).getTime() - beforeUS);
      expect(diffMsUS).toBeLessThan(5000); // within 5s of 24h

      // India Plugin specifies 48 hours SLA
      const beforeIN = Date.now() + 48 * 60 * 60 * 1000;
      const resultIN = await companyService.registerCompany('user_owner_9', {
        name: 'CloudScale Technologies India',
        countryCode: 'IN',
        phone: '+919876543210',
        registrationDetails: {
          gstNumber: '27AABCT1234F1Z5',
          panNumber: 'AABCT1234F',
          registeredAddress: {
            street: '100 Main St',
            city: 'Mumbai',
            state: 'MH',
            pincode: '400001',
          },
        },
      });

      expect(resultIN.reviewDeadlineAt).toBeDefined();
      const diffMsIN = Math.abs(new Date(resultIN.reviewDeadlineAt).getTime() - beforeIN);
      expect(diffMsIN).toBeLessThan(5000); // within 5s of 48h
    });

    it('notifyAdmins sends notifications to all admin users', async () => {
      User.find.mockResolvedValue([{ _id: 'admin_1' }, { _id: 'admin_2' }]);
      Notification.insertMany.mockResolvedValue([{}, {}]);

      const sent = await notificationService.notifyAdmins(
        NotificationType.COMPANY_PENDING_REVIEW,
        'New Employer Registration',
        'Company ABC is awaiting verification',
        { relatedModel: 'Company', relatedId: 'comp_abc' }
      );

      expect(sent).toHaveLength(2);
      expect(Notification.insertMany).toHaveBeenCalledWith([
        expect.objectContaining({
          user: 'admin_1',
          type: 'company_pending_review',
        }),
        expect.objectContaining({
          user: 'admin_2',
          type: 'company_pending_review',
        }),
      ]);
    });
  });

  // =========================================================================
  // GAP 10: Verification Notes Communication to Employer
  // =========================================================================
  describe('GAP 10: Verification Decision Communication to Employer', () => {
    it('dispatches both in-app notification and decision email with reviewer notes', async () => {
      const mockCompany = {
        _id: 'comp_10',
        name: 'Apex Robotics',
        countryCode: 'IN',
        owner: 'user_owner_10',
        verificationStatus: 'pending',
        save: jest.fn().mockResolvedValue(true),
        toJSON() {
          return { ...this };
        },
      };
      Company.findById.mockResolvedValue(mockCompany);

      const mockOwner = {
        _id: 'user_owner_10',
        email: 'ceo@apexrobotics.com',
        firstName: 'Robert',
      };
      User.findById.mockResolvedValue(mockOwner);

      const notifSpy = jest.spyOn(notificationService, 'createNotification').mockResolvedValue({});
      const emailSpy = jest.spyOn(emailService, 'sendCompanyVerificationDecision').mockResolvedValue({});

      const notes = 'All submitted GST and PAN documents verified successfully.';
      await adminService.verifyEmployer('comp_10', 'admin_1', {
        status: VerificationStatus.APPROVED,
        notes,
      });

      // Assert In-app notification was created for owner
      expect(notifSpy).toHaveBeenCalledWith(
        'user_owner_10',
        expect.objectContaining({
          type: NotificationType.COMPANY_VERIFIED,
          title: expect.stringContaining('Approved'),
        })
      );

      // Assert Email was dispatched with decision notes and resolved country plugin
      expect(emailSpy).toHaveBeenCalledWith(
        mockOwner,
        mockCompany,
        'approved',
        notes,
        expect.anything()
      );

      emailSpy.mockRestore();
      notifSpy.mockRestore();
    });

    it('sendCompanyVerificationDecision formats email with reviewer notes callout', async () => {
      await emailService.sendCompanyVerificationDecision(
        { email: 'founder@startup.io', firstName: 'Sam' },
        { name: 'Startup IO', countryCode: 'IN' },
        'information_required',
        'GST certificate is expired. Please upload the latest renewal.'
      );

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'founder@startup.io',
          subject: expect.stringContaining('Action Required'),
          html: expect.stringContaining('GST certificate is expired'),
        })
      );
    });
  });

  // =========================================================================
  // GAP 11: Fraud & Duplicate Company Detection
  // =========================================================================
  describe('GAP 11: Duplicate & Fraudulent Company Detection', () => {
    it('rejects registration if another company with the same name exists (case-insensitive)', async () => {
      User.findById.mockResolvedValue({
        _id: 'user_11',
        email: 'admin@acme-corp.com',
        isEmailVerified: true,
      });

      // Mock existing company with same name
      Company.findOne.mockImplementation(async (query) => {
        if (query.name) return { _id: 'existing_comp_id', name: 'Acme Corporation' };
        return null;
      });

      await expect(
        companyService.registerCompany('user_11', {
          name: 'acme corporation', // Same name, lowercase
          countryCode: 'US',
          phone: '+15550001111',
          registrationDetails: {
            einNumber: '99-8877665',
            stateOfIncorporation: 'DE',
            businessType: 'corporation',
            registeredAddress: {
              street: '123 Test St',
              city: 'Dover',
              state: 'DE',
              zipCode: '19901',
            },
          },
        })
      ).rejects.toThrow('A company with the name "acme corporation" is already registered');
    });

    it('rejects registration if another company has the same GST number (India)', async () => {
      User.findById.mockResolvedValue({
        _id: 'user_12',
        email: 'recruiter@uniquecompany.in',
        isEmailVerified: true,
      });

      Company.findOne.mockImplementation(async (query) => {
        if (query['registrationDetails.gstNumber']) {
          return { _id: 'dup_gst_comp', name: 'Other Corp' };
        }
        return null;
      });

      await expect(
        companyService.registerCompany('user_12', {
          name: 'Brand New Company',
          countryCode: 'IN',
          phone: '+919988776655',
          registrationDetails: {
            gstNumber: '29AAAAA0000A1Z5',
            panNumber: 'ABCDE5678G',
            registeredAddress: {
              street: 'Brigade Road',
              city: 'Bengaluru',
              state: 'KA',
              pincode: '560001',
            },
          },
        })
      ).rejects.toThrow('A company with this GST number is already registered in the system');
    });

    it('rejects registration if another company has the same PAN number (India)', async () => {
      User.findById.mockResolvedValue({
        _id: 'user_13',
        email: 'recruiter@uniquecompany.in',
        isEmailVerified: true,
      });

      Company.findOne.mockImplementation(async (query) => {
        if (query['registrationDetails.panNumber']) {
          return { _id: 'dup_pan_comp', name: 'Other Corp' };
        }
        return null;
      });

      await expect(
        companyService.registerCompany('user_13', {
          name: 'Unique Corp',
          countryCode: 'IN',
          phone: '+919988776655',
          registrationDetails: {
            gstNumber: '29AAAAA0000A1Z5',
            panNumber: 'ABCDE5678G',
            registeredAddress: {
              street: 'Brigade Road',
              city: 'Bengaluru',
              state: 'KA',
              pincode: '560001',
            },
          },
        })
      ).rejects.toThrow('A company with this PAN number is already registered in the system');
    });

    it('rejects registration if another company has the same EIN number (US)', async () => {
      User.findById.mockResolvedValue({
        _id: 'user_14',
        email: 'ops@usbrand.com',
        isEmailVerified: true,
      });

      Company.findOne.mockImplementation(async (query) => {
        if (query.$or) {
          return { _id: 'dup_ein_comp', name: 'Existing US Corp' };
        }
        return null;
      });

      await expect(
        companyService.registerCompany('user_14', {
          name: 'New US Entity',
          countryCode: 'US',
          phone: '+15554443333',
          registrationDetails: {
            einNumber: '11-2233445',
            stateOfIncorporation: 'NY',
            businessType: 'llc',
            registeredAddress: {
              street: '5th Ave',
              city: 'New York',
              state: 'NY',
              zipCode: '10001',
            },
          },
        })
      ).rejects.toThrow('A company with this EIN is already registered in the system');
    });
  });

  // =========================================================================
  // Adapter & Country Plugin Integration Checks
  // =========================================================================
  describe('Adapter & Country Plugin Architecture', () => {
    it('SmsAdapter interface and factory should be available and load properly', () => {
      const { getSmsAdapter } = require('../adapters/sms');
      const SmsAdapter = require('../adapters/sms/sms.adapter');
      const adapter = getSmsAdapter();

      expect(adapter).toBeInstanceOf(SmsAdapter);
      expect(typeof adapter.sendSms).toBe('function');
      expect(typeof adapter.sendOtp).toBe('function');
    });

    it('ConsoleSmsAdapter and DoveSoftSmsAdapter implement sendSms and sendOtp', async () => {
      const ConsoleSmsAdapter = require('../adapters/sms/console.adapter');
      const DoveSoftSmsAdapter = require('../adapters/sms/dovesoft.adapter');

      const consoleAdapter = new ConsoleSmsAdapter();
      const dovesoftAdapter = new DoveSoftSmsAdapter();

      const consoleRes = await consoleAdapter.sendOtp({ to: '+919999999999', otp: '123456' });
      expect(consoleRes.status).toBe('success');

      const dovesoftRes = await dovesoftAdapter.sendOtp({ to: '+919999999999', otp: '123456' });
      expect(dovesoftRes.status).toBe('success');
    });

    it('IndiaPlugin should enforce Indian mobile phone formatting and unique fields', () => {
      const { getCountryPlugin } = require('../plugins/countries');
      const inPlugin = getCountryPlugin('IN');

      // Valid Indian mobile
      expect(inPlugin.validatePhoneNumber('+919876543210').valid).toBe(true);
      expect(inPlugin.validatePhoneNumber('9876543210').valid).toBe(true);

      // Invalid Indian mobile
      expect(inPlugin.validatePhoneNumber('12345').valid).toBe(false);
      expect(inPlugin.validatePhoneNumber('1234567890').valid).toBe(false); // starts with 1

      // Rules & contracts
      const rules = inPlugin.getVerificationRules();
      expect(rules.requiresPhoneVerification).toBe(true);
      expect(rules.slaHours).toBe(48);
      expect(rules.uniqueRegistrationFields.map((f) => f.field)).toEqual(
        expect.arrayContaining(['gstNumber', 'panNumber', 'cinNumber'])
      );
    });

    it('USPlugin should enforce US phone formatting, 24h SLA, and EIN unique field', () => {
      const { getCountryPlugin } = require('../plugins/countries');
      const usPlugin = getCountryPlugin('US');

      // Valid US phone
      expect(usPlugin.validatePhoneNumber('+15551234567').valid).toBe(true);
      expect(usPlugin.validatePhoneNumber('5551234567').valid).toBe(true);

      // Invalid US phone
      expect(usPlugin.validatePhoneNumber('000123').valid).toBe(false);

      // Rules & contracts
      const rules = usPlugin.getVerificationRules();
      expect(rules.requiresPhoneVerification).toBe(false);
      expect(rules.slaHours).toBe(24);
      expect(rules.uniqueRegistrationFields.map((f) => f.field)).toContain('einNumber');
    });
  });
});
