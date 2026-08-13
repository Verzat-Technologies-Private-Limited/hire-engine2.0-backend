/**
 * Payment gateway adapter interface (abstract base class).
 * All payment provider implementations must extend this class.
 *
 * The billing service calls these methods without knowing which
 * provider (Stripe, Razorpay, etc.) is behind the interface.
 * The country plugin determines which provider to use.
 *
 * Implementations:
 * - StripeAdapter: Stripe (US, UK, EU, etc.)
 * - RazorpayAdapter: Razorpay (India)
 */
class PaymentGatewayAdapter {
  /**
   * Get the provider name.
   * @returns {string}
   */
  get providerName() {
    throw new Error('PaymentGatewayAdapter.providerName must be implemented');
  }

  /**
   * Create a payment order / payment intent.
   * @param {object} params
   * @param {number} params.amount - Amount in smallest currency unit (paise/cents)
   * @param {string} params.currency - ISO currency code (INR, USD, etc.)
   * @param {object} [params.metadata] - Key-value metadata
   * @param {string} [params.description] - Payment description
   * @returns {Promise<{ orderId: string, providerData: object }>}
   */
  async createOrder(_params) {
    throw new Error('PaymentGatewayAdapter.createOrder() must be implemented');
  }

  /**
   * Verify a payment after client-side completion.
   * @param {object} paymentData - Provider-specific payment verification data
   * @returns {Promise<{ verified: boolean, paymentId: string, status: string }>}
   */
  async verifyPayment(_paymentData) {
    throw new Error('PaymentGatewayAdapter.verifyPayment() must be implemented');
  }

  /**
   * Create a recurring subscription.
   * @param {object} params
   * @param {string} params.planId - Internal plan identifier
   * @param {object} params.customer - { email, name, ... }
   * @param {object} [params.metadata]
   * @returns {Promise<{ subscriptionId: string, status: string, providerData: object }>}
   */
  async createSubscription(_params) {
    throw new Error('PaymentGatewayAdapter.createSubscription() must be implemented');
  }

  /**
   * Cancel an active subscription.
   * @param {string} subscriptionId - Provider subscription ID
   * @returns {Promise<{ status: string }>}
   */
  async cancelSubscription(_subscriptionId) {
    throw new Error('PaymentGatewayAdapter.cancelSubscription() must be implemented');
  }

  /**
   * Process a refund for a payment.
   * @param {string} paymentId - Provider payment ID
   * @param {number} [amount] - Partial refund amount (smallest unit). Null = full refund.
   * @param {string} [reason] - Refund reason
   * @returns {Promise<{ refundId: string, status: string, amount: number }>}
   */
  async processRefund(_paymentId, _amount, _reason) {
    throw new Error('PaymentGatewayAdapter.processRefund() must be implemented');
  }

  /**
   * Construct and verify a webhook event from the provider.
   * @param {object} req - Express request object (needs raw body for signature verification)
   * @returns {Promise<{ eventType: string, data: object }>} Normalized event
   */
  async constructWebhookEvent(_req) {
    throw new Error('PaymentGatewayAdapter.constructWebhookEvent() must be implemented');
  }
}

module.exports = PaymentGatewayAdapter;
