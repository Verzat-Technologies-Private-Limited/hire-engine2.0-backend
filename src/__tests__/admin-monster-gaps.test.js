const mockSendEmail = jest.fn().mockResolvedValue({ success: true });
const mockSendBulkEmail = jest.fn().mockResolvedValue({ success: true });



jest.mock('../adapters/email', () => ({
  getEmailAdapter: () => ({
    sendEmail: mockSendEmail,
    sendBulkEmail: mockSendBulkEmail,
  }),
}));

const mockCacheGet = jest.fn().mockResolvedValue(null);
const mockCacheSet = jest.fn().mockResolvedValue(true);

jest.mock('../adapters/cache', () => ({
  getCacheAdapter: () => ({
    get: mockCacheGet,
    set: mockCacheSet,
  }),
}));

const adminService = require('../services/admin.service');
const Job = require('../models/Job');
const Company = require('../models/Company');
const User = require('../models/User');
const Flag = require('../models/Flag');
const Application = require('../models/Application');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');
const {
  adminGetJobsSchema,
  adminJobStatusSchema,
  adminBulkJobActionSchema,
  adminGetEmployersSchema,
  adminGetTransactionsSchema,
  adminExecutiveReportSchema,
} = require('../validators/admin.validator');
const { JobStatus, VerificationStatus, TransactionStatus, PaymentProvider } = require('../utils/constants');

jest.mock('../models/Job');
jest.mock('../models/Company');
jest.mock('../models/User');
jest.mock('../models/Flag');
jest.mock('../models/Application');
jest.mock('../models/Transaction');
jest.mock('../models/AuditLog');
jest.mock('../models/Plan');
jest.mock('../services/notification.service', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}));

function mockPaginate(Model, docs = []) {
  Model.countDocuments.mockResolvedValue(docs.length);
  Model.find.mockImplementation(() => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(docs),
  }));
}

describe('Monster Jobs Admin Gaps Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // GAP 1: Global Job Moderation & Search
  // =========================================================================
  describe('Gap 1: Global Job Moderation & Search', () => {
    it('adminGetJobsSchema should validate and sanitize search query parameters', () => {
      const validQuery = {
        page: 1,
        limit: 25,
        status: JobStatus.ACTIVE,
        country: 'US',
        isSponsored: 'true',
        search: 'Full Stack Node Developer',
        hasFlags: 'true',
      };
      const { error, value } = adminGetJobsSchema.query.validate(validQuery);
      expect(error).toBeUndefined();
      expect(value.country).toBe('US');
      expect(value.isSponsored).toBe(true);
      expect(value.hasFlags).toBe(true);
    });

    it('getAllJobs should populate company and poster, and attach pending flag counts', async () => {
      const mockJobDoc = {
        _id: '507f191e810c19729de860ea',
        title: 'Senior React Developer',
        status: 'active',
        toJSON: () => ({
          _id: '507f191e810c19729de860ea',
          title: 'Senior React Developer',
          status: 'active',
        }),
      };

      mockPaginate(Job, [mockJobDoc]);

      Flag.aggregate.mockResolvedValue([
        { _id: '507f191e810c19729de860ea', count: 2 },
      ]);

      const result = await adminService.getAllJobs({ status: 'active' });

      expect(result.docs).toHaveLength(1);
      expect(result.docs[0].pendingFlagsCount).toBe(2);
      expect(result.meta.pagination.totalDocs).toBe(1);
    });

    it('getJobById should return full inspection data with flags and application stats', async () => {
      const mockJob = {
        _id: '507f191e810c19729de860ea',
        title: 'Lead Architect',
        company: { _id: '507f191e810c19729de860eb', name: 'Monster Corp', countryCode: 'US' },
        postedBy: { _id: '507f191e810c19729de860ec', firstName: 'John', lastName: 'Recruiter' },
        toJSON() {
          return {
            _id: this._id,
            title: this.title,
            company: this.company,
            postedBy: this.postedBy,
          };
        },
      };

      Job.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockJob),
        }),
      });

      Flag.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([{ _id: 'flag1', reason: 'scam', status: 'pending' }]),
        }),
      });

      Application.aggregate.mockResolvedValue([
        { _id: 'submitted', count: 10 },
        { _id: 'interview', count: 2 },
      ]);

      const result = await adminService.getJobById('507f191e810c19729de860ea');

      expect(result.title).toBe('Lead Architect');
      expect(result.flags).toHaveLength(1);
      expect(result.applicationStats.total).toBe(12);
      expect(result.applicationStats.byStatus.submitted).toBe(10);
      expect(result.countryInfo).toBeDefined();
      expect(result.countryInfo.code).toBe('US');
    });
  });

  // =========================================================================
  // GAP 2: Admin Force Actions on Jobs
  // =========================================================================
  describe('Gap 2: Admin Force Actions on Jobs', () => {
    it('adminJobStatusSchema should require a reason min 3 chars and at least one property', () => {
      const invalidNoReason = { status: 'closed' };
      const { error: err1 } = adminJobStatusSchema.body.validate(invalidNoReason);
      expect(err1).toBeDefined();
      expect(err1.details[0].message).toContain('reason');
      expect(err1.details[0].message).toContain('required');

      const validPayload = { status: 'closed', reason: 'Suspected fake recruitment fees' };
      const { error: err2 } = adminJobStatusSchema.body.validate(validPayload);
      expect(err2).toBeUndefined();
    });

    it('updateJobStatus should change job status, create audit log, and send notification', async () => {
      const mockJob = {
        _id: '507f191e810c19729de860ea',
        title: 'Data Analyst',
        status: 'active',
        isSponsored: false,
        postedBy: '507f191e810c19729de860ec',
        company: { name: 'Acme Corp', countryCode: 'US' },
        location: { country: 'US' },
        save: jest.fn().mockResolvedValue(true),
        toJSON() {
          return { _id: this._id, title: this.title, status: this.status };
        },
      };

      Job.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockJob),
      });

      User.findById.mockResolvedValue({
        _id: '507f191e810c19729de860ec',
        email: 'recruiter@acme.com',
        firstName: 'Alice',
      });

      AuditLog.log = jest.fn().mockResolvedValue({});

      const reqMock = { ip: '127.0.0.1', headers: { 'user-agent': 'Jest' } };
      const updated = await adminService.updateJobStatus(
        '507f191e810c19729de860ea',
        'admin_123',
        { status: 'closed', reason: 'Violation of Terms of Service' },
        reqMock
      );

      expect(mockJob.status).toBe('closed');
      expect(mockJob.save).toHaveBeenCalled();
      expect(AuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          performedBy: 'admin_123',
          action: 'job.closed',
          targetModel: 'Job',
        })
      );
      expect(mockSendEmail).toHaveBeenCalled();
      expect(updated.status).toBe('closed');
    });
  });

  // =========================================================================
  // GAP 3: Bulk Job Operations
  // =========================================================================
  describe('Gap 3: Bulk Job Operations', () => {
    it('adminBulkJobActionSchema should validate jobIds array, allowed actions and reason', () => {
      const validBulk = {
        jobIds: ['507f191e810c19729de860ea', '507f191e810c19729de860eb'],
        action: 'close',
        reason: 'Bulk closure of spam listings',
      };
      const { error } = adminBulkJobActionSchema.body.validate(validBulk);
      expect(error).toBeUndefined();

      const invalidAction = {
        jobIds: ['507f191e810c19729de860ea'],
        action: 'invalid_action',
        reason: 'test reason',
      };
      const { error: errAction } = adminBulkJobActionSchema.body.validate(invalidAction);
      expect(errAction).toBeDefined();
    });

    it('bulkJobAction should execute batch status updates and create audit log', async () => {
      const mockJobs = [
        { _id: '507f191e810c19729de860ea', title: 'Job 1', status: 'active' },
        { _id: '507f191e810c19729de860eb', title: 'Job 2', status: 'active' },
      ];

      Job.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockJobs),
      });

      Job.updateMany.mockResolvedValue({
        matchedCount: 2,
        modifiedCount: 2,
      });

      AuditLog.log = jest.fn().mockResolvedValue({});

      const result = await adminService.bulkJobAction(
        'admin_123',
        {
          jobIds: ['507f191e810c19729de860ea', '507f191e810c19729de860eb'],
          action: 'close',
          reason: 'Company account suspended',
        },
        {}
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('close');
      expect(result.affectedCount).toBe(2);
      expect(AuditLog.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'job.bulk_action',
          performedBy: 'admin_123',
        })
      );
    });
  });

  // =========================================================================
  // GAP 4: Full Employer Directory Search
  // =========================================================================
  describe('Gap 4: Full Employer Directory Search', () => {
    it('adminGetEmployersSchema should validate status, country, and date filters', () => {
      const validQuery = {
        page: 1,
        limit: 20,
        verificationStatus: VerificationStatus.APPROVED,
        countryCode: 'IN',
        search: 'Infosys',
      };
      const { error } = adminGetEmployersSchema.query.validate(validQuery);
      expect(error).toBeUndefined();
    });

    it('getAllEmployers should list all employers with job counts and country metadata', async () => {
      const mockCompany = {
        _id: '507f191e810c19729de860eb',
        name: 'Tech Corp Global',
        countryCode: 'US',
        verificationStatus: 'approved',
        toJSON() {
          return {
            _id: this._id,
            name: this.name,
            countryCode: this.countryCode,
            verificationStatus: this.verificationStatus,
          };
        },
      };

      mockPaginate(Company, [mockCompany]);

      Job.aggregate.mockResolvedValue([
        { _id: '507f191e810c19729de860eb', totalJobs: 5, activeJobs: 3 },
      ]);

      const result = await adminService.getAllEmployers({ countryCode: 'US' });

      expect(result.docs).toHaveLength(1);
      expect(result.docs[0].totalJobs).toBe(5);
      expect(result.docs[0].activeJobs).toBe(3);
      expect(result.docs[0].country).toBeDefined();
      expect(result.docs[0].country.code).toBe('US');
    });

    it('getEmployerJobs should paginate all jobs for a specific company', async () => {
      Company.findById.mockResolvedValue({ _id: '507f191e810c19729de860eb', name: 'Test Corp' });
      mockPaginate(Job, [
        { _id: 'job_1', title: 'Developer' },
        { _id: 'job_2', title: 'Designer' },
      ]);

      const result = await adminService.getEmployerJobs('507f191e810c19729de860eb', { page: 1 });
      expect(result.docs).toHaveLength(2);
      expect(result.meta.pagination.totalDocs).toBe(2);
    });
  });

  // =========================================================================
  // GAP 5: Financial Transactions List & Discovery
  // =========================================================================
  describe('Gap 5: Financial Transactions Discovery', () => {
    it('adminGetTransactionsSchema validates multi-currency and provider filters', () => {
      const validQuery = {
        page: 1,
        limit: 10,
        status: TransactionStatus.SUCCEEDED,
        paymentProvider: PaymentProvider.STRIPE,
        currency: 'USD',
      };
      const { error } = adminGetTransactionsSchema.query.validate(validQuery);
      expect(error).toBeUndefined();
    });

    it('getAllTransactions should return paginated transactions with company & user population', async () => {
      mockPaginate(Transaction, [
        {
          _id: 'txn_101',
          amount: 9900,
          currency: 'USD',
          status: 'succeeded',
        },
      ]);

      const result = await adminService.getAllTransactions({ status: 'succeeded' });
      expect(result.docs).toHaveLength(1);
      expect(result.docs[0].amount).toBe(9900);
      expect(result.meta.pagination.totalDocs).toBe(1);
    });

    it('getTransactionById should return transaction details with audit logs and currency metadata', async () => {
      const mockTxn = {
        _id: 'txn_101',
        amount: 5000,
        currency: 'INR',
        paymentProvider: 'razorpay',
        company: { name: 'Mumbai Tech Ltd', countryCode: 'IN' },
        toJSON() {
          return {
            _id: this._id,
            amount: this.amount,
            currency: this.currency,
            paymentProvider: this.paymentProvider,
            company: this.company,
          };
        },
      };

      Transaction.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockTxn),
        }),
      });

      AuditLog.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue([{ action: 'refund.processed' }]),
      });

      const result = await adminService.getTransactionById('txn_101');
      expect(result.amount).toBe(5000);
      expect(result.currencyMeta.countryName).toBe('India');
      expect(result.auditLogs).toHaveLength(1);
    });
  });

  // =========================================================================
  // GAP 6: Executive Report & Market Analytics
  // =========================================================================
  describe('Gap 6: Executive Platform & Market Analytics', () => {
    it('adminExecutiveReportSchema validates date range, country, and refresh flags', () => {
      const validQuery = {
        dateFrom: '2026-01-01T00:00:00.000Z',
        dateTo: '2026-01-31T23:59:59.999Z',
        country: 'US',
        refresh: true,
      };
      const { error } = adminExecutiveReportSchema.query.validate(validQuery);
      expect(error).toBeUndefined();
    });

    it('getExecutiveReport should compute segregated multi-currency revenue and labor market insights', async () => {
      User.countDocuments.mockResolvedValueOnce(500).mockResolvedValueOnce(45); // total, new
      Company.countDocuments
        .mockResolvedValueOnce(60) // total
        .mockResolvedValueOnce(50) // approved
        .mockResolvedValueOnce(8); // new
      Job.countDocuments
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(120) // active
        .mockResolvedValueOnce(35); // new
      Application.countDocuments.mockResolvedValueOnce(1200).mockResolvedValueOnce(220); // total, new

      // Transaction aggregate (multi-currency)
      Transaction.aggregate.mockResolvedValueOnce([
        { _id: 'USD', totalGross: 14000, count: 20 },
        { _id: 'INR', totalGross: 350000, count: 15 },
      ]);

      // Job trends
      Job.aggregate
        .mockResolvedValueOnce([{ _id: '2026-08-01', count: 5 }]) // jobTrend
        .mockResolvedValueOnce([
          { _id: 'Software Engineering', count: 40 },
          { _id: 'Data Science', count: 25 },
        ]) // topCategories
        .mockResolvedValueOnce([
          { _id: 'Node.js', count: 55 },
          { _id: 'React', count: 48 },
        ]) // topSkillsRaw
        .mockResolvedValueOnce([
          { _id: 'remote', count: 70 },
          { _id: 'onsite', count: 50 },
        ]) // workplaceStats
        .mockResolvedValueOnce([
          { _id: 'full-time', count: 100 },
          { _id: 'contract', count: 20 },
        ]) // employmentTypeStats
        .mockResolvedValueOnce([
          { _id: 'comp_1', activeJobs: 12, name: 'Google', countryCode: 'US' },
        ]) // topHiringCompanies
        .mockResolvedValueOnce([
          { totalViews: 10000, totalClicks: 2000, totalApplications: 500 },
        ]); // funnelCounters

      // Application trend
      Application.aggregate.mockResolvedValueOnce([{ _id: '2026-08-01', count: 12 }]);

      // Country overview
      Company.aggregate.mockResolvedValueOnce([
        { _id: 'US', totalEmployers: 40, verifiedEmployers: 35 },
        { _id: 'IN', totalEmployers: 20, verifiedEmployers: 15 },
      ]);

      const report = await adminService.getExecutiveReport({ refresh: true });

      // Core metrics backward compatibility
      expect(report.metrics.totalUsers).toBe(500);
      expect(report.metrics.totalEmployers).toBe(60);
      expect(report.metrics.totalJobs).toBe(200);
      expect(report.metrics.activeJobs).toBe(120);
      expect(report.metrics.totalApplications).toBe(1200);

      // Multi-currency segregation
      expect(report.metrics.revenueByCurrency.USD.gross).toBe(14000);
      expect(report.metrics.revenueByCurrency.INR.gross).toBe(350000);

      // Labor market demand insights
      expect(report.laborMarketInsights.topCategories[0].category).toBe('Software Engineering');
      expect(report.laborMarketInsights.topSkills[0].skill).toBe('Node.js');
      expect(report.laborMarketInsights.topHiringEmployers[0].name).toBe('Google');

      // Funnel metrics
      expect(report.recruitmentFunnel.clickThroughRatePercent).toBe(20); // 2000/10000 * 100
      expect(report.recruitmentFunnel.applicationConversionRatePercent).toBe(25); // 500/2000 * 100

      // Cache interaction
      expect(mockCacheSet).toHaveBeenCalled();
    });

    it('getExecutiveReport should return cached report when available and refresh is false', async () => {
      const cachedReport = {
        filters: { country: 'ALL' },
        metrics: { totalUsers: 999 },
      };
      mockCacheGet.mockResolvedValueOnce(JSON.stringify(cachedReport));

      const report = await adminService.getExecutiveReport({ refresh: false });
      expect(report.metrics.totalUsers).toBe(999);
      expect(User.countDocuments).not.toHaveBeenCalled();
    });
  });
});
