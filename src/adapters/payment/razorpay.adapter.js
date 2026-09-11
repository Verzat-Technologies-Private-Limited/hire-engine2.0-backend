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
    // Sanitize metadata into Razorpay string-only notes (max 15 pairs, max 256 chars each)
    const notes = {};
    const metaEntries = Object.entries(metadata).slice(0, 14);
    for (const [k, v] of metaEntries) {
      if (v !== undefined && v !== null) {
        notes[String(k).slice(0, 40)] = String(typeof v === 'object' ? JSON.stringify(v) : v).slice(0, 256);
      }
    }
    if (description) {
      notes.description = String(description).slice(0, 256);
    }

    const order = await this._razorpay.orders.create({
      amount: Math.round(amount), // In paise (smallest unit, strictly integer)
      currency: currency.toUpperCase(),
      notes,
      receipt: `rcpt_${Date.now()}`.slice(0, 40),
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
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        verified: false,
        paymentId: razorpay_payment_id || null,
        status: 'failed',
      };
    }

    // HMAC SHA256 signature verification
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body)
      .digest('hex');

    let verified = false;
    try {
      verified = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(razorpay_signature, 'utf8')
      );
    } catch {
      verified = false;
    }

    return {
      verified,
      paymentId: razorpay_payment_id,
      status: verified ? 'succeeded' : 'failed',
    };
  }

  async createSubscription({ planId, customer, metadata = {} }) {
    // For subscriptions, we use Razorpay's subscription API
    const notes = {};
    for (const [k, v] of Object.entries(metadata).slice(0, 12)) {
      if (v !== undefined && v !== null) {
        notes[String(k).slice(0, 40)] = String(typeof v === 'object' ? JSON.stringify(v) : v).slice(0, 256);
      }
    }
    notes.customerEmail = String(customer?.email || '').slice(0, 256);
    notes.customerName = String(customer?.name || '').slice(0, 256);

    const subscription = await this._razorpay.subscriptions.create({
      plan_id: planId, // Razorpay Plan ID
      total_count: 12, // Max billing cycles
      quantity: 1,
      notes,
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
    if (amount) refundParams.amount = Math.round(amount);
    if (reason) refundParams.notes = { reason: String(reason).slice(0, 256) };

    const refund = await this._razorpay.payments.refund(paymentId, refundParams);

    return {
      refundId: refund.id,
      status: refund.status === 'processed' ? 'succeeded' : refund.status,
      amount: refund.amount,
    };
  }

  async constructWebhookEvent(req) {
    const signature = req.headers['x-razorpay-signature'];
    if (!signature) {
      throw new Error('Missing x-razorpay-signature header in webhook request');
    }

    // Extract raw payload string reliably whether Express parsed it as Buffer, string, or json
    let rawBodyStr;
    if (Buffer.isBuffer(req.body)) {
      rawBodyStr = req.body.toString('utf8');
    } else if (typeof req.rawBody === 'string') {
      rawBodyStr = req.rawBody;
    } else if (Buffer.isBuffer(req.rawBody)) {
      rawBodyStr = req.rawBody.toString('utf8');
    } else if (typeof req.body === 'string') {
      rawBodyStr = req.body;
    } else {
      rawBodyStr = JSON.stringify(req.body);
    }

    // Verify webhook signature with constant-time comparison
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(rawBodyStr)
      .digest('hex');

    let isMatch = false;
    try {
      isMatch = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(signature, 'utf8')
      );
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      throw new Error('Invalid Razorpay webhook signature');
    }

    const event = typeof req.body === 'object' && !Buffer.isBuffer(req.body)
      ? req.body
      : JSON.parse(rawBodyStr);

    // Normalize Razorpay event types to common format
    const eventMap = {
      'order.paid': 'payment.succeeded',
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
      data:
        event.payload?.payment?.entity ||
        event.payload?.order?.entity ||
        event.payload?.subscription?.entity ||
        event.payload,
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
