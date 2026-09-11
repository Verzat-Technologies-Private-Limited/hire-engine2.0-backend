const Joi = require('joi');
const mongoose = require('mongoose');
const { getCountryPlugin } = require('../plugins/countries');
const subscriptionService = require('../services/subscription.service');
const searchService = require('../services/search.service');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const Company = require('../models/Company');
const Plan = require('../models/Plan');
const User = require('../models/User');
const Resume = require('../models/Resume');
const { getPaymentAdapter } = require('../adapters/payment');

jest.mock('../models/Subscription');
jest.mock('../models/Transaction');
jest.mock('../models/Company');
jest.mock('../models/Plan');
jest.mock('../models/User');
jest.mock('../models/Resume');
jest.mock('../adapters/payment');


describe('Subscription Purchase & History Gaps Test Suite', () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockCompanyId = new mongoose.Types.ObjectId().toString();

  const mockCompany = {
    _id: mockCompanyId,
    name: 'Tech Innovations Pvt Ltd',
    countryCode: 'IN',
    state: 'DL',
    address: { state: 'DL', street: '123 Tech Park', city: 'New Delhi' },
    registrationDetails: { gstNumber: '07AAAAA0000A1Z5' },
    isTeamMember: jest.fn().mockImplementation((uid) => uid.toString() === mockUserId.toString()),
  };

  const mockUSCompany = {
    _id: mockCompanyId,
    name: 'Acme Corp US',
    countryCode: 'US',
    state: 'CA',
    address: { state: 'CA', street: '456 Market St', city: 'San Francisco' },
    registrationDetails: { einNumber: '12-3456789' },
    isTeamMember: jest.fn().mockImplementation((uid) => uid.toString() === mockUserId.toString()),
  };

  const mockPlan = {
    planId: 'monthly-growth',
    name: 'Growth Plan',
    price: 29900,
    jobQuota: 10,
    resumeQuota: 100,
    hasResumeDB: true,
    durationMonths: 1,
    isActive: true,
    prices: new Map([['INR', 1999900], ['USD', 29900]]),
    getPriceForCurrency: jest.fn((currency) => {
      if (currency === 'INR') return 1999900;
      return 29900;
    }),
    toJSON: jest.fn().mockReturnValue({
      planId: 'monthly-growth',
      name: 'Growth Plan',
    }),
  };

  const mockPaymentAdapter = {
    providerName: 'razorpay',
    createOrder: jest.fn().mockResolvedValue({
      orderId: 'order_rzp_12345',
      providerData: { orderId: 'order_rzp_12345', amount: 2359882, currency: 'INR' },
    }),
    verifyPayment: jest.fn().mockResolvedValue({
      verified: true,
      paymentId: 'pay_rzp_98765',
      status: 'succeeded',
    }),
    cancelSubscription: jest.fn().mockResolvedValue({ status: 'cancelled' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getPaymentAdapter.mockReturnValue(mockPaymentAdapter);
    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    });
  });



  // ────────────────────────────────────────────────────────
  // GAP 1: Two-step subscription purchase flow (Create Order)
  // ────────────────────────────────────────────────────────
  describe('Gap 1: Secure Order Creation (No premature activation)', () => {
    it('subscribeCompany should create a pending transaction and order without activating subscription', async () => {
      Company.findById.mockResolvedValue(mockCompany);
      Plan.findOne.mockResolvedValue(mockPlan);

      const mockPendingTxn = {
        _id: 'txn_pending_001',
        status: 'pending',
      };
      Transaction.create.mockResolvedValue(mockPendingTxn);

      const result = await subscriptionService.subscribeCompany(mockUserId, mockCompanyId, 'monthly-growth');

      expect(result.order.orderId).toBe('order_rzp_12345');
      expect(result.transactionId).toBe('txn_pending_001');
      expect(result.plan.id).toBe('monthly-growth');
      expect(result.plan.currency).toBe('INR');

      // Crucial: Subscription.findOneAndUpdate must NOT be called in order step!
      expect(Subscription.findOneAndUpdate).not.toHaveBeenCalled();

      // Transaction must be recorded as 'pending'
      expect(Transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'pending',
          paymentProvider: 'razorpay',
          externalPaymentId: 'order_rzp_12345',
        })
      );
    });

    it('subscribeCompany should reject unauthorized user', async () => {
      Company.findById.mockResolvedValue({
        ...mockCompany,
        isTeamMember: jest.fn().mockReturnValue(false),
      });

      await expect(
        subscriptionService.subscribeCompany('unauthorized_user', mockCompanyId, 'monthly-growth')
      ).rejects.toThrow('You do not have permission to manage billing for this company');
    });
  });

  // ────────────────────────────────────────────────────────
  // GAP 2: Payment Verification & Subscription Activation
  // ────────────────────────────────────────────────────────
  describe('Gap 2: Payment Verification & Invoice Generation', () => {
    it('verifyPayment should verify signature, mark transaction succeeded, and activate subscription with invoice', async () => {
      Company.findById.mockResolvedValue(mockCompany);

      const mockPendingTxn = {
        _id: 'txn_001',
        status: 'pending',
        externalPaymentId: 'order_rzp_12345',
        providerMetadata: { planId: 'monthly-growth' },
        save: jest.fn().mockResolvedValue(true),
        toJSON: jest.fn().mockReturnValue({ _id: 'txn_001', status: 'succeeded', invoiceNumber: 'INV-2026-00001' }),
      };

      Transaction.findOne.mockResolvedValue(mockPendingTxn);
      Transaction.countDocuments.mockResolvedValue(0);
      Plan.findOne.mockResolvedValue(mockPlan);

      const mockActivatedSub = {
        _id: 'sub_active_001',
        status: 'active',
        jobPostQuota: 10,
        jobPostsUsed: 0,
        resumeSearchQuota: 100,
        toJSON: jest.fn().mockReturnValue({ _id: 'sub_active_001', status: 'active' }),
      };
      Subscription.findOneAndUpdate.mockResolvedValue(mockActivatedSub);
      Subscription.findOne.mockResolvedValue(null); // No previous active sub

      const paymentData = {
        paymentProvider: 'razorpay',
        razorpay_order_id: 'order_rzp_12345',
        razorpay_payment_id: 'pay_rzp_98765',
        razorpay_signature: 'valid_signature_hash',
      };

      const result = await subscriptionService.verifyPayment(mockUserId, mockCompanyId, paymentData);

      expect(mockPaymentAdapter.verifyPayment).toHaveBeenCalledWith(paymentData);
      expect(mockPendingTxn.status).toBe('succeeded');
      expect(mockPendingTxn.invoiceNumber).toMatch(/^INV-\d{4}-\d{5}$/);
      expect(mockPendingTxn.save).toHaveBeenCalled();
      expect(Subscription.findOneAndUpdate).toHaveBeenCalledWith(
        { company: mockCompany._id },
        expect.objectContaining({
          status: 'active',
          plan: 'monthly-growth',
          jobPostQuota: 10,
          resumeSearchQuota: 100,
        }),
        { upsert: true, new: true }
      );
      expect(result.subscription.status).toBe('active');
    });

    it('verifyPayment should reject when payment signature is invalid', async () => {
      Company.findById.mockResolvedValue(mockCompany);
      mockPaymentAdapter.verifyPayment.mockResolvedValueOnce({
        verified: false,
        status: 'failed',
      });
      Transaction.findOneAndUpdate.mockResolvedValue(true);

      const paymentData = {
        paymentProvider: 'razorpay',
        razorpay_order_id: 'order_rzp_12345',
        razorpay_payment_id: 'pay_rzp_98765',
        razorpay_signature: 'tampered_signature',
      };

      await expect(
        subscriptionService.verifyPayment(mockUserId, mockCompanyId, paymentData)
      ).rejects.toThrow('Payment verification failed');

      expect(Transaction.findOneAndUpdate).toHaveBeenCalledWith(
        { externalPaymentId: 'order_rzp_12345', company: mockCompany._id },
        { status: 'failed' }
      );
    });
  });

  // ────────────────────────────────────────────────────────
  // GAP 3: Recruiter Current Subscription Inspection Endpoint
  // ────────────────────────────────────────────────────────
  describe('Gap 3: Recruiter Current Subscription & Quotas', () => {
    it('getCurrentSubscription should return quota percentages, days remaining, and active status', async () => {
      Company.findById.mockResolvedValue(mockCompany);

      const futureDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      const mockActiveSub = {
        status: 'active',
        plan: 'monthly-growth',
        jobPostQuota: 10,
        jobPostsUsed: 4,
        resumeSearchQuota: 100,
        resumeSearchesUsed: 25,
        hasResumeDBAccess: true,
        currentPeriodEnd: futureDate,
        isCurrentlyActive: jest.fn().mockReturnValue(true),
        toJSON: jest.fn().mockReturnValue({
          status: 'active',
          plan: 'monthly-growth',
        }),
      };
      Subscription.findOne.mockResolvedValue(mockActiveSub);
      Plan.findOne.mockResolvedValue(mockPlan);

      const result = await subscriptionService.getCurrentSubscription(mockUserId, mockCompanyId);

      expect(result.active).toBe(true);
      expect(result.status).toBe('active');
      expect(result.daysRemaining).toBeGreaterThanOrEqual(14);
      expect(result.quotas.jobs.total).toBe(10);
      expect(result.quotas.jobs.used).toBe(4);
      expect(result.quotas.jobs.remaining).toBe(6);
      expect(result.quotas.jobs.percentageUsed).toBe(40);
      expect(result.quotas.resumes.total).toBe(100);
      expect(result.quotas.resumes.used).toBe(25);
      expect(result.quotas.resumes.remaining).toBe(75);
      expect(result.quotas.resumes.percentageUsed).toBe(25);
      expect(result.quotas.hasResumeDBAccess).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────
  // GAP 4: Secure Transaction History with Pagination & Filters
  // ────────────────────────────────────────────────────────
  describe('Gap 4: Transaction History Tenant Isolation & Pagination', () => {
    it('getCompanyTransactions should reject unauthorized non-team members', async () => {
      Company.findById.mockResolvedValue({
        ...mockCompany,
        isTeamMember: jest.fn().mockReturnValue(false),
      });

      await expect(
        subscriptionService.getCompanyTransactions('unauthorized_user', mockCompanyId, {})
      ).rejects.toThrow('You do not have permission to manage billing for this company');
    });

    it('getCompanyTransactions should filter and paginate transactions for authorized employers', async () => {
      Company.findById.mockResolvedValue(mockCompany);

      Transaction.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                populate: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue([
                    { _id: 'txn_1', amount: 1999900, status: 'succeeded' },
                  ]),
                }),
              }),
            }),
          }),
        }),
      });
      Transaction.countDocuments.mockResolvedValue(1);

      const queryParams = { page: 1, limit: 10, status: 'succeeded' };
      const result = await subscriptionService.getCompanyTransactions(mockUserId, mockCompanyId, queryParams);

      expect(result.docs).toHaveLength(1);
      expect(result.meta.pagination.totalDocs).toBe(1);
      expect(result.meta.pagination.currentPage).toBe(1);
    });
  });

  // ────────────────────────────────────────────────────────
  // GAP 5: Complete B2B Tax Invoice Endpoint
  // ────────────────────────────────────────────────────────
  describe('Gap 5: Complete B2B Tax Invoice Generation', () => {
    it('getTransactionInvoice should return complete B2B invoice with GSTIN, SAC code, and taxes', async () => {
      const mockTxn = {
        _id: 'txn_001',
        company: mockCompanyId,
        invoiceNumber: 'INV-2026-00001',
        createdAt: new Date(),
        status: 'succeeded',
        currency: 'INR',
        paymentProvider: 'razorpay',
        externalPaymentId: 'pay_rzp_98765',
        amount: 2359882,
        taxAmount: 359982,
        description: 'Subscription: Growth Plan',
        taxBreakdown: { CGST: 179991, SGST: 179991, rate: '18%' },
      };
      Transaction.findById.mockResolvedValue(mockTxn);
      Company.findById.mockResolvedValue(mockCompany);

      const invoice = await subscriptionService.getTransactionInvoice(mockUserId, 'txn_001');

      expect(invoice.invoiceNumber).toBe('INV-2026-00001');
      expect(invoice.currency).toBe('INR');
      expect(invoice.seller.legalEntity).toBe('Hire Engine India Private Limited');
      expect(invoice.seller.gstin).toBe('06AAACH7409R1ZZ');
      expect(invoice.seller.sacCode).toBe('998311');
      expect(invoice.buyer.taxIdentifier).toBe('07AAAAA0000A1Z5');
      expect(invoice.lineItems[0].sacCode).toBe('998311');
      expect(invoice.lineItems[0].taxAmount).toBe(359982);
    });
  });

  // ────────────────────────────────────────────────────────
  // GAP 6: Multi-Country Tax Determination (Intrastate vs Interstate)
  // ────────────────────────────────────────────────────────
  describe('Gap 6: Multi-Country Tax Determination', () => {
    it('India Plugin should calculate CGST + SGST for intrastate (Delhi) transactions', () => {
      const inPlugin = getCountryPlugin('IN');
      const tax = inPlugin.calculateTax(100000, { state: 'DL' });

      expect(tax.taxAmount).toBe(18000);
      expect(tax.breakdown.taxType).toBe('intrastate');
      expect(tax.breakdown.CGST).toBe(9000);
      expect(tax.breakdown.SGST).toBe(9000);
    });

    it('India Plugin should calculate IGST for interstate (Karnataka) transactions', () => {
      const inPlugin = getCountryPlugin('IN');
      const tax = inPlugin.calculateTax(100000, { state: 'KA' });

      expect(tax.taxAmount).toBe(18000);
      expect(tax.breakdown.taxType).toBe('interstate');
      expect(tax.breakdown.IGST).toBe(18000);
      expect(tax.breakdown.placeOfSupply).toBe('KA');
    });

    it('US Plugin should calculate tax under US sales tax rules', () => {
      const usPlugin = getCountryPlugin('US');
      const tax = usPlugin.calculateTax(29900);

      expect(tax.taxAmount).toBe(0);
      expect(tax.totalAmount).toBe(29900);
    });
  });

  // ────────────────────────────────────────────────────────
  // GAP 7: Resume Search Quota Enforcement
  // ────────────────────────────────────────────────────────
  describe('Gap 7: Candidate Resume Database & Search Quota Enforcement', () => {
    it('searchResumes should block employer if subscription does not have resume DB access', async () => {
      Company.findOne.mockResolvedValue(mockCompany);

      Subscription.findOne.mockResolvedValue({
        hasResumeDBAccess: false,
        isCurrentlyActive: jest.fn().mockReturnValue(true),
      });

      const employerUser = { _id: mockUserId, role: 'employer' };

      await expect(
        searchService.searchResumes({ q: 'react engineer' }, employerUser)
      ).rejects.toThrow('Resume database search access is not included in your current subscription plan');
    });

    it('searchResumes should block employer if resume search quota is exceeded', async () => {
      Company.findOne.mockResolvedValue(mockCompany);

      Subscription.findOne.mockResolvedValue({
        hasResumeDBAccess: true,
        resumeSearchQuota: 10,
        resumeSearchesUsed: 10,
        hasResumeSearchQuota: jest.fn().mockReturnValue(false),
        isCurrentlyActive: jest.fn().mockReturnValue(true),
      });

      const employerUser = { _id: mockUserId, role: 'employer' };

      await expect(
        searchService.searchResumes({ q: 'react engineer' }, employerUser)
      ).rejects.toThrow('Resume search quota exceeded for your current subscription plan');
    });

    it('searchResumes should increment resumeSearchesUsed when search is authorized', async () => {
      Company.findOne.mockResolvedValue(mockCompany);

      const mockSub = {
        hasResumeDBAccess: true,
        resumeSearchQuota: 100,
        resumeSearchesUsed: 5,
        hasResumeSearchQuota: jest.fn().mockReturnValue(true),
        isCurrentlyActive: jest.fn().mockReturnValue(true),
        save: jest.fn().mockResolvedValue(true),
      };
      Subscription.findOne.mockResolvedValue(mockSub);

      Resume.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      Resume.countDocuments.mockResolvedValue(0);


      const employerUser = { _id: mockUserId, role: 'employer' };

      // Executing search with empty query returns keyword search results
      await searchService.searchResumes({ skills: 'React' }, employerUser);

      expect(mockSub.resumeSearchesUsed).toBe(6);
      expect(mockSub.save).toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────
  // GAP 8: Razorpay Adapter Dedicated Verification (India)
  // ────────────────────────────────────────────────────────
  describe('Gap 8: Razorpay India Gateway Adapter Hardening', () => {
    const RazorpayAdapter = require('../adapters/payment/razorpay.adapter');
    const crypto = require('crypto');
    const config = require('../config');

    it('verifyPayment should return verified: true for valid HMAC signature', async () => {
      config.razorpay.keySecret = 'test_key_secret';
      const adapter = new RazorpayAdapter();
      const orderId = 'order_test_123';
      const paymentId = 'pay_test_456';
      const validSig = crypto
        .createHmac('sha256', 'test_key_secret')
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      const result = await adapter.verifyPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: validSig,
      });

      expect(result.verified).toBe(true);
      expect(result.status).toBe('succeeded');
      expect(result.paymentId).toBe(paymentId);
    });

    it('constructWebhookEvent should handle Buffer bodies and map order.paid', async () => {
      config.razorpay.webhookSecret = 'whsec_test_secret';
      const adapter = new RazorpayAdapter();

      const payloadObj = {
        event: 'order.paid',
        payload: {
          order: {
            entity: {
              id: 'order_rzp_webhook_999',
              amount: 2359882,
              currency: 'INR',
            },
          },
        },
      };

      const rawBuffer = Buffer.from(JSON.stringify(payloadObj), 'utf8');
      const signature = crypto
        .createHmac('sha256', 'whsec_test_secret')
        .update(rawBuffer.toString('utf8'))
        .digest('hex');

      const req = {
        headers: { 'x-razorpay-signature': signature },
        body: rawBuffer, // Express.raw parsed Buffer
      };

      const event = await adapter.constructWebhookEvent(req);
      expect(event.eventType).toBe('payment.succeeded');
      expect(event.data.id).toBe('order_rzp_webhook_999');
    });
  });
});


