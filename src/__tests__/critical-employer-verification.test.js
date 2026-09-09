const { isFreeEmailProvider, validateCorporateEmail } = require('../utils/emailDomain');
const { getCountryPlugin } = require('../plugins/countries');
const BaseCountryPlugin = require('../plugins/countries/base.plugin');
const companyService = require('../services/company.service');
const jobService = require('../services/job.service');
const adminService = require('../services/admin.service');
const User = require('../models/User');
const Company = require('../models/Company');
const Subscription = require('../models/Subscription');
const Job = require('../models/Job');

// Mock Mongoose models for unit testing services
jest.mock('../models/User');
jest.mock('../models/Company');
jest.mock('../models/Subscription');
jest.mock('../models/Job');
jest.mock('../models/Pipeline', () => ({
  createDefaultPipeline: jest.fn().mockResolvedValue({}),
}));
jest.mock('../adapters/queue', () => ({
  getQueueAdapter: () => ({
    addJob: jest.fn().mockResolvedValue({}),
  }),
}));
jest.mock('../services/embedding.service', () => ({
  generateJobEmbedding: jest.fn().mockResolvedValue({}),
}));

describe('Critical Gaps & Multi-Country Verification Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Gap 2: Corporate Email Domain Utility', () => {
    it('should detect common consumer webmail domains globally and regionally', () => {
      expect(isFreeEmailProvider('user@gmail.com')).toBe(true);
      expect(isFreeEmailProvider('recruiter@yahoo.co.in')).toBe(true);
      expect(isFreeEmailProvider('hr@rediffmail.com')).toBe(true);
      expect(isFreeEmailProvider('owner@hotmail.com')).toBe(true);
      expect(isFreeEmailProvider('test@outlook.com')).toBe(true);
      expect(isFreeEmailProvider('test@yandex.com')).toBe(true);
    });

    it('should accept legitimate business/corporate email domains', () => {
      expect(isFreeEmailProvider('hr@monster.com')).toBe(false);
      expect(isFreeEmailProvider('careers@acme-corp.io')).toBe(false);
      expect(isFreeEmailProvider('recruiter@tcs.com')).toBe(false);
      expect(isFreeEmailProvider('hiring@google.com')).toBe(false);
    });

    it('validateCorporateEmail should reject personal emails with descriptive message', () => {
      const result = validateCorporateEmail('employer@gmail.com');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('business/corporate email address is required');
    });

    it('validateCorporateEmail should approve corporate emails', () => {
      const result = validateCorporateEmail('talent@techcorp.io');
      expect(result.valid).toBe(true);
    });
  });

  describe('Country Plugin Architecture: Multi-Country Contracts', () => {
    it('BaseCountryPlugin should expose default verification contracts', () => {
      class TestPlugin extends BaseCountryPlugin {
        get code() { return 'TEST'; }
        get name() { return 'Test Country'; }
        get currency() { return 'TST'; }
        get locale() { return 'en-TT'; }
        getCompanyRegistrationSchema() { return null; }
        getTaxConfiguration() { return { name: 'VAT', rate: 0.1 }; }
        getPaymentProvider() { return 'stripe'; }
        getDataPrivacyRules() { return {}; }
      }

      const plugin = new TestPlugin();
      expect(plugin.isCorporateEmailRequired()).toBe(true);
      expect(plugin.requiresVerificationForJobPosting()).toBe(true);
      expect(plugin.getVerificationRules().requiresEmailVerification).toBe(true);
      expect(plugin.getVerificationRules().requiresCorporateEmail).toBe(true);
      expect(plugin.getVerificationRules().requiresVerificationForJobPosting).toBe(true);
    });

    it('India Plugin (IN) should provide India-specific required documents', () => {
      const inPlugin = getCountryPlugin('IN');
      const docs = inPlugin.getRequiredCompanyDocuments();
      expect(Array.isArray(docs)).toBe(true);
      const docTypes = docs.map((d) => d.type);
      expect(docTypes).toContain('gst_certificate');
      expect(docTypes).toContain('pan_card');
    });

    it('US Plugin (US) should provide US-specific required documents', () => {
      const usPlugin = getCountryPlugin('US');
      const docs = usPlugin.getRequiredCompanyDocuments();
      expect(Array.isArray(docs)).toBe(true);
      const docTypes = docs.map((d) => d.type);
      expect(docTypes).toContain('ein_letter');
      expect(docTypes).toContain('articles_of_incorporation');
    });
  });

  describe('Gap 1 & Gap 2: Company Registration Gates', () => {
    it('should reject company registration if owner email is NOT verified (Gap 1)', async () => {
      User.findById.mockResolvedValue({
        _id: 'user123',
        email: 'recruiter@validcorp.com',
        isEmailVerified: false, // Unverified!
      });

      await expect(
        companyService.registerCompany('user123', {
          countryCode: 'US',
          name: 'Valid Corp',
          registrationDetails: { ein: '12-3456789', stateOfIncorporation: 'DE', businessType: 'corporation' },
        })
      ).rejects.toThrow('Email verification is required before registering an employer company profile');
    });

    it('should reject company registration if owner has a free personal email address (Gap 2)', async () => {
      User.findById.mockResolvedValue({
        _id: 'user123',
        email: 'recruiter@gmail.com', // Free consumer email!
        isEmailVerified: true,
      });

      await expect(
        companyService.registerCompany('user123', {
          countryCode: 'US',
          name: 'My Startup',
          registrationDetails: { ein: '12-3456789', stateOfIncorporation: 'DE', businessType: 'corporation' },
        })
      ).rejects.toThrow('business/corporate email address is required');
    });

    it('should proceed with registration when email is verified and has corporate domain', async () => {
      User.findById.mockResolvedValue({
        _id: 'user123',
        email: 'hr@validcompany.com',
        isEmailVerified: true,
      });

      Company.findOne.mockResolvedValue(null); // No existing company
      Company.create.mockResolvedValue({
        _id: 'comp123',
        name: 'Valid Company Inc',
        countryCode: 'US',
        verificationStatus: 'pending',
        toJSON: () => ({ _id: 'comp123', name: 'Valid Company Inc', verificationStatus: 'pending' }),
      });
      User.findByIdAndUpdate.mockResolvedValue({});

      const result = await companyService.registerCompany('user123', {
        countryCode: 'US',
        name: 'Valid Company Inc',
        registrationDetails: {
          einNumber: '12-3456789',
          stateOfIncorporation: 'DE',
          businessType: 'corporation',
          registeredAddress: {
            street: '123 Market St',
            city: 'Wilmington',
            state: 'DE',
            zipCode: '19801',
          },
        },
      });

      expect(result).toBeDefined();
      expect(result.verificationStatus).toBe('pending');
    });
  });

  describe('Gap 4: Country-Aware Document Upload & Verification Checklist', () => {
    it('should reject document upload if document type is not recognized by country plugin', async () => {
      Company.findById.mockResolvedValue({
        _id: 'comp123',
        countryCode: 'IN', // India requires gst_certificate, pan_card, cin_certificate
        isTeamMember: () => true,
        documents: [],
      });

      await expect(
        companyService.uploadCompanyDocument(
          'comp123',
          'user123',
          { path: 'https://cloud.com/doc.pdf', filename: 'doc123' },
          { type: 'unrecognized_random_doc' }
        )
      ).rejects.toThrow('Invalid document type "unrecognized_random_doc" for India');
    });

    it('should accept valid document upload and save to company documents', async () => {
      const mockCompany = {
        _id: 'comp123',
        countryCode: 'IN',
        isTeamMember: () => true,
        documents: [],
        save: jest.fn().mockResolvedValue(true),
      };
      Company.findById.mockResolvedValue(mockCompany);

      const result = await companyService.uploadCompanyDocument(
        'comp123',
        'user123',
        { path: 'https://cloud.com/gst.pdf', filename: 'doc_gst_123' },
        { type: 'gst_certificate', label: 'GST Certificate' }
      );

      expect(result.document.type).toBe('gst_certificate');
      expect(mockCompany.documents.length).toBe(1);
      expect(mockCompany.save).toHaveBeenCalled();
    });

    it('getCompanyDocuments should compute dynamic checklist from country plugin', async () => {
      Company.findById.mockResolvedValue({
        _id: 'comp123',
        countryCode: 'IN',
        verificationStatus: 'pending',
        isTeamMember: () => true,
        documents: [
          { type: 'gst_certificate', label: 'GST Certificate', fileUrl: 'https://cloud.com/gst.pdf' },
        ],
      });

      const result = await companyService.getCompanyDocuments('comp123', 'user123');
      expect(result.countryCode).toBe('IN');
      expect(result.countryName).toBe('India');
      expect(result.checklist).toBeDefined();

      const gstItem = result.checklist.find((c) => c.type === 'gst_certificate');
      const panItem = result.checklist.find((c) => c.type === 'pan_card');

      expect(gstItem.isUploaded).toBe(true);
      expect(panItem.isUploaded).toBe(false);
      expect(result.isComplete).toBe(false); // Pan card still missing
    });
  });

  describe('Gap 5: Job Publishing Verification Gate', () => {
    it('createJob should block publishing active job if company verificationStatus !== approved', async () => {
      Company.findById.mockResolvedValue({
        _id: 'comp123',
        countryCode: 'US',
        verificationStatus: 'pending', // NOT approved!
        isTeamMember: () => true,
      });

      Subscription.findOne.mockResolvedValue({
        status: 'active',
        hasJobPostQuota: () => true,
        jobPostsUsed: 0,
        save: jest.fn(),
      });

      await expect(
        jobService.createJob('user123', {
          companyId: 'comp123',
          title: 'Senior Engineer',
          description: 'Job description text...',
          employmentType: 'full-time',
          workplaceType: 'remote',
          publishNow: true, // Attempting to publish active!
        })
      ).rejects.toThrow('verification must be approved before publishing active job listings');
    });

    it('createJob should allow saving draft jobs even when company is pending verification', async () => {
      Company.findById.mockResolvedValue({
        _id: 'comp123',
        countryCode: 'US',
        verificationStatus: 'pending',
        isTeamMember: () => true,
      });

      const mockSub = {
        status: 'active',
        hasJobPostQuota: () => true,
        jobPostsUsed: 0,
        save: jest.fn().mockResolvedValue(true),
      };
      Subscription.findOne.mockResolvedValue(mockSub);

      Job.create.mockResolvedValue({
        _id: 'job123',
        status: 'draft',
        toJSON: () => ({ _id: 'job123', status: 'draft' }),
      });

      const result = await jobService.createJob('user123', {
        companyId: 'comp123',
        title: 'Draft Engineer',
        description: 'Job description text...',
        employmentType: 'full-time',
        workplaceType: 'remote',
        publishNow: false, // Draft!
        status: 'draft',
      });

      expect(result.job.status).toBe('draft');
    });

    it('updateJobStatus should block activating a job if company is not approved', async () => {
      Job.findById.mockResolvedValue({
        _id: 'job123',
        company: 'comp123',
        status: 'draft',
        save: jest.fn(),
      });

      Company.findById.mockResolvedValue({
        _id: 'comp123',
        countryCode: 'IN',
        verificationStatus: 'rejected',
        isTeamMember: () => true,
      });

      await expect(
        jobService.updateJobStatus('job123', 'user123', 'active')
      ).rejects.toThrow('Cannot publish job. Company account is currently "rejected"');
    });
  });

  describe('Gap 7: Admin Country-Agnostic Single Employer Review', () => {
    it('getEmployerById should populate company, owner, and dynamic country checklist', async () => {
      const mockCompanyDoc = {
        _id: 'comp123',
        name: 'US Tech Corp',
        countryCode: 'US',
        verificationStatus: 'pending',
        documents: [
          { type: 'ein_letter', label: 'EIN Confirmation', fileUrl: 'https://cloud.com/ein.pdf' },
        ],
        owner: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@ustech.com',
          isEmailVerified: true,
        },
        toJSON: function () {
          return {
            _id: this._id,
            name: this.name,
            countryCode: this.countryCode,
            verificationStatus: this.verificationStatus,
            documents: this.documents,
            owner: this.owner,
          };
        },
      };

      Company.findById.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        then: function (resolve) {
          resolve(mockCompanyDoc);
        },
      });

      const result = await adminService.getEmployerById('comp123');

      expect(result).toBeDefined();
      expect(result.name).toBe('US Tech Corp');
      expect(result.country).toBeDefined();
      expect(result.country.name).toBe('United States');
      expect(result.country.currency).toBe('USD');
      expect(result.country.documentChecklist).toBeDefined();

      const einItem = result.country.documentChecklist.find((d) => d.type === 'ein_letter');
      const articlesItem = result.country.documentChecklist.find((d) => d.type === 'articles_of_incorporation');

      expect(einItem.isUploaded).toBe(true);
      expect(articlesItem.isUploaded).toBe(false);
      expect(result.country.documentCompleteness.isComplete).toBe(false);
    });
  });
});
