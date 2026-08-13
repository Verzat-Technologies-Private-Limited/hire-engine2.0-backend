const PaymentGatewayAdapter = require('./payment.adapter');
const config = require('../../config');
const logger = require('../../config/logger');

/**
 * Stripe payment gateway adapter.
 * Used for US, UK, EU, and other countries where Stripe is supported.
 */
class StripeAdapter extends PaymentGatewayAdapter {
  constructor() {
    super();
    const Stripe = require('stripe');
    this._stripe = new Stripe(config.stripe.secretKey, {
      apiVersion: '2024-12-18.acacia',
    });
    logger.info('Payment adapter initialized: Stripe');
  }

  get providerName() {
    return 'stripe';
  }

  async createOrder({ amount, currency, metadata = {}, description = '' }) {
    const paymentIntent = await this._stripe.paymentIntents.create({
      amount, // Already in smallest unit (cents)
      currency: currency.toLowerCase(),
      metadata,
      description,
      automatic_payment_methods: { enabled: true },
    });

    return {
      orderId: paymentIntent.id,
      providerData: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    };
  }

  async verifyPayment(paymentData) {
    const { paymentIntentId } = paymentData;
    const paymentIntent = await this._stripe.paymentIntents.retrieve(paymentIntentId);

    return {
      verified: paymentIntent.status === 'succeeded',
      paymentId: paymentIntent.id,
      status: paymentIntent.status,
    };
  }

  async createSubscription({ planId, customer, metadata = {} }) {
    // Find or create Stripe customer
    let stripeCustomer;
    const existingCustomers = await this._stripe.customers.list({
      email: customer.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0];
    } else {
      stripeCustomer = await this._stripe.customers.create({
        email: customer.email,
        name: customer.name,
        metadata,
      });
    }

    // Create subscription
    const subscription = await this._stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [{ price: planId }], // planId should be a Stripe Price ID
      metadata,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    return {
      subscriptionId: subscription.id,
      status: subscription.status,
      providerData: {
        customerId: stripeCustomer.id,
        clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    };
  }

  async cancelSubscription(subscriptionId) {
    const subscription = await this._stripe.subscriptions.cancel(subscriptionId);
    return { status: subscription.status };
  }

  async processRefund(paymentId, amount = null, reason = '') {
    const refundParams = { payment_intent: paymentId };
    if (amount) refundParams.amount = amount;
    if (reason) refundParams.reason = 'requested_by_customer';

    const refund = await this._stripe.refunds.create(refundParams);

    return {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount,
    };
  }

  async constructWebhookEvent(req) {
    const signature = req.headers['stripe-signature'];
    const event = this._stripe.webhooks.constructEvent(
      req.rawBody, // Requires raw body middleware
      signature,
      config.stripe.webhookSecret
    );

    // Normalize event types to a common format
    const eventMap = {
      'payment_intent.succeeded': 'payment.succeeded',
      'payment_intent.payment_failed': 'payment.failed',
      'customer.subscription.created': 'subscription.created',
      'customer.subscription.updated': 'subscription.updated',
      'customer.subscription.deleted': 'subscription.cancelled',
      'invoice.payment_succeeded': 'invoice.paid',
      'invoice.payment_failed': 'invoice.failed',
      'charge.refunded': 'refund.processed',
    };

    return {
      eventType: eventMap[event.type] || event.type,
      data: event.data.object,
    };
  }
}

module.exports = StripeAdapter;
