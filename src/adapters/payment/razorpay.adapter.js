const crypto = require('crypto');
const PaymentGatewayAdapter = require('./payment.adapter');
const config = require('../../config');
const logger = require('../../config/logger');

/**
 * Razorpay payment gateway adapter.
 * Used for India where Razorpay is the primary payment provider.
 */
class RazorpayAdapter extends PaymentGatewayAdapter {
  constructor() {
    super();
    const Razorpay = require('razorpay');
    this._razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret,
    });
    logger.info('Payment adapter initialized: Razorpay');
  }

  get providerName() {
    return 'razorpay';
  }

  async createOrder({ amount, currency, metadata = {}, description = '' }) {
    const order = await this._razorpay.orders.create({
      amount, // In paise (smallest unit)
      currency: currency.toUpperCase(),
      notes: { ...metadata, description },
      receipt: `receipt_${Date.now()}`,
    });

    return {
      orderId: order.id,
      providerData: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: config.razorpay.keyId, // Client needs this to initialize checkout
      },
    };
  }

  async verifyPayment(paymentData) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;

    // HMAC SHA256 signature verification
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body)
      .digest('hex');

    const verified = expectedSignature === razorpay_signature;

    return {
      verified,
      paymentId: razorpay_payment_id,
      status: verified ? 'succeeded' : 'failed',
    };
  }

  async createSubscription({ planId, customer, metadata = {} }) {
    // Create or fetch Razorpay customer (optional — Razorpay doesn't strictly require it)
    // For subscriptions, we use Razorpay's subscription API
    const subscription = await this._razorpay.subscriptions.create({
      plan_id: planId, // Razorpay Plan ID
      total_count: 12, // Max billing cycles
      quantity: 1,
      notes: {
        ...metadata,
        customerEmail: customer.email,
        customerName: customer.name,
      },
    });

    return {
      subscriptionId: subscription.id,
      status: this._mapSubscriptionStatus(subscription.status),
      providerData: {
        subscriptionId: subscription.id,
        shortUrl: subscription.short_url, // Razorpay hosted checkout link
        currentPeriodEnd: subscription.current_end
          ? new Date(subscription.current_end * 1000)
          : null,
      },
    };
  }

  async cancelSubscription(subscriptionId) {
    const subscription = await this._razorpay.subscriptions.cancel(subscriptionId);
    return { status: this._mapSubscriptionStatus(subscription.status) };
  }

  async processRefund(paymentId, amount = null, reason = '') {
    const refundParams = {};
    if (amount) refundParams.amount = amount;
    if (reason) refundParams.notes = { reason };

    const refund = await this._razorpay.payments.refund(paymentId, refundParams);

    return {
      refundId: refund.id,
      status: refund.status === 'processed' ? 'succeeded' : refund.status,
      amount: refund.amount,
    };
  }

  async constructWebhookEvent(req) {
    const signature = req.headers['x-razorpay-signature'];
    const body = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Invalid Razorpay webhook signature');
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Normalize Razorpay event types to common format
    const eventMap = {
      'payment.captured': 'payment.succeeded',
      'payment.failed': 'payment.failed',
      'subscription.activated': 'subscription.created',
      'subscription.charged': 'invoice.paid',
      'subscription.cancelled': 'subscription.cancelled',
      'subscription.halted': 'subscription.updated',
      'refund.processed': 'refund.processed',
    };

    return {
      eventType: eventMap[event.event] || event.event,
      data: event.payload?.payment?.entity || event.payload?.subscription?.entity || event.payload,
    };
  }

  /**
   * Map Razorpay subscription status to normalized status.
   * @param {string} razorpayStatus
   * @returns {string}
   */
  _mapSubscriptionStatus(razorpayStatus) {
    const statusMap = {
      created: 'pending',
      authenticated: 'pending',
      active: 'active',
      pending: 'past_due',
      halted: 'past_due',
      cancelled: 'cancelled',
      completed: 'cancelled',
      expired: 'cancelled',
    };
    return statusMap[razorpayStatus] || razorpayStatus;
  }
}

module.exports = RazorpayAdapter;
