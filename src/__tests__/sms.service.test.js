const smsService = require('../services/sms.service');

describe('DoveSoft SMS Gateway & OTP Service', () => {
  const testMobile = '+919876543210';

  beforeEach(() => {
    smsService._otpStore.clear();
  });

  it('should generate a 6-digit numeric OTP', () => {
    const otp = smsService.generateOtp(6);
    expect(otp).toMatch(/^[0-9]{6}$/);
  });

  it('should generate, store, and send OTP successfully', async () => {
    const result = await smsService.generateAndSendOtp(testMobile, 300);
    expect(result.success).toBe(true);
    expect(smsService._otpStore.has(testMobile)).toBe(true);
  });

  it('should verify correct OTP and delete it after verification', async () => {
    await smsService.generateAndSendOtp(testMobile, 300);
    const stored = smsService._otpStore.get(testMobile);
    expect(stored).toBeDefined();

    const isVerified = smsService.verifyOtp(testMobile, stored.otp);
    expect(isVerified).toBe(true);
    expect(smsService._otpStore.has(testMobile)).toBe(false);
  });

  it('should reject incorrect OTP', async () => {
    await smsService.generateAndSendOtp(testMobile, 300);

    expect(() => {
      smsService.verifyOtp(testMobile, '000000');
    }).toThrow(/Invalid OTP/);
  });

  it('should reject expired OTP', async () => {
    // Store an expired OTP
    smsService._otpStore.set(testMobile, {
      otp: '123456',
      expiresAt: Date.now() - 1000,
      attempts: 0,
    });

    expect(() => {
      smsService.verifyOtp(testMobile, '123456');
    }).toThrow(/expired/);
  });
});
