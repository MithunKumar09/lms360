/**
 * Razorpay Service
 * 
 * Encapsulates Razorpay Orders, Payments, Route & Payouts API calls
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { query } from '@/lib/db/index.js';

class RazorpayService {
  constructor() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  /**
   * Create a Razorpay order
   * @param {Object} params - Order parameters
   * @param {number} params.amount - Amount in paise (smallest currency unit)
   * @param {string} params.currency - Currency code (default: INR)
   * @param {string} params.receipt - Receipt identifier
   * @param {Object} params.notes - Additional notes/metadata
   * @returns {Promise<Object>} Razorpay order object
   */
  async createOrder({ amount, currency = 'INR', receipt, notes = {} }) {
    try {
      // Validate minimum amount (Razorpay minimum is 100 paise = ₹1)
      const amountInPaise = Math.round(amount * 100);
      if (amountInPaise < 100) {
        throw new Error('Amount must be at least ₹1.00');
      }

      const options = {
        amount: amountInPaise,
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        notes,
      };

      const order = await this.razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error('Razorpay createOrder error:', error);
      // Provide more detailed error message
      if (error.error && error.error.description) {
        throw new Error(`Failed to create Razorpay order: ${error.error.description}`);
      }
      throw new Error(`Failed to create Razorpay order: ${error.message}`);
    }
  }

  /**
   * Capture a payment
   * @param {string} paymentId - Razorpay payment ID
   * @param {number} amount - Amount to capture in paise
   * @returns {Promise<Object>} Captured payment object
   */
  async capturePayment(paymentId, amount) {
    try {
      const payment = await this.razorpay.payments.capture(
        paymentId,
        Math.round(amount * 100) // Convert to paise
      );
      return payment;
    } catch (error) {
      console.error('Razorpay capturePayment error:', error);
      throw new Error(`Failed to capture payment: ${error.message}`);
    }
  }

  /**
   * Get payment details
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} Payment object
   */
  async getPayment(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Razorpay getPayment error:', error);
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }

  /**
   * Get order details
   * @param {string} orderId - Razorpay order ID
   * @returns {Promise<Object>} Order object
   */
  async getOrder(orderId) {
    try {
      const order = await this.razorpay.orders.fetch(orderId);
      return order;
    } catch (error) {
      console.error('Razorpay getOrder error:', error);
      throw new Error(`Failed to fetch order: ${error.message}`);
    }
  }

  /**
   * Create a refund
   * @param {string} paymentId - Razorpay payment ID
   * @param {number} amount - Refund amount in paise (optional, full refund if not provided)
   * @param {string} notes - Refund notes/reason
   * @returns {Promise<Object>} Refund object
   */
  async createRefund(paymentId, amount = null, notes = '') {
    try {
      const options = {
        notes: {
          reason: notes,
        },
      };

      if (amount !== null) {
        options.amount = Math.round(amount * 100); // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, options);
      return refund;
    } catch (error) {
      console.error('Razorpay createRefund error:', error);
      throw new Error(`Failed to create refund: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Webhook payload (JSON string)
   * @param {string} signature - Webhook signature from headers
   * @param {string} secret - Webhook secret (RAZORPAY_WEBHOOK_SECRET)
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(payload, signature, secret) {
    try {
      if (!secret) {
        throw new Error('Webhook secret not configured');
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  }

  /**
   * Get payments for an order
   * @param {string} orderId - Razorpay order ID
   * @returns {Promise<Array>} Array of payment objects
   */
  async getOrderPayments(orderId) {
    try {
      const payments = await this.razorpay.orders.fetchPayments(orderId);
      return payments;
    } catch (error) {
      console.error('Razorpay getOrderPayments error:', error);
      throw new Error(`Failed to fetch order payments: ${error.message}`);
    }
  }

  /**
   * Create a fund account (RazorpayX)
   * @param {Object} params - Fund account parameters
   * @param {string} params.contactId - Contact ID (create contact first)
   * @param {string} params.accountType - Account type (bank_account, vpa, wallet)
   * @param {Object} params.accountDetails - Account details (bank_account: {ifsc, name, account_number}, etc.)
   * @returns {Promise<Object>} Fund account object
   */
  async createFundAccount({ contactId, accountType, accountDetails }) {
    try {
      // RazorpayX API endpoint for fund accounts
      const axios = (await import('axios')).default;
      
      // Build payload based on account type
      let payload = {
        contact_id: contactId,
        account_type: accountType,
      };
      
      if (accountType === 'bank_account') {
        payload.bank_account = {
          name: accountDetails.name,
          ifsc: accountDetails.ifsc,
          account_number: accountDetails.account_number,
          account_type: accountDetails.account_type || 'savings',
        };
      } else if (accountType === 'vpa') {
        payload.vpa = accountDetails;
      } else if (accountType === 'wallet') {
        payload.wallet = accountDetails;
      }
      
      const response = await axios.post(
        'https://api.razorpay.com/v1/fund_accounts',
        payload,
        {
          auth: {
            username: process.env.RAZORPAY_KEY_ID,
            password: process.env.RAZORPAY_KEY_SECRET,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('RazorpayX createFundAccount error:', error);
      throw new Error(`Failed to create fund account: ${error.response?.data?.error?.description || error.message}`);
    }
  }

  /**
   * Create a contact (RazorpayX) - required before creating fund account
   * @param {Object} params - Contact parameters
   * @param {string} params.name - Contact name
   * @param {string} params.email - Contact email
   * @param {string} params.contact - Contact phone number
   * @param {string} params.type - Contact type (vendor, employee, customer)
   * @param {Object} params.referenceId - Reference ID (user_id)
   * @returns {Promise<Object>} Contact object
   */
  async createContact({ name, email, contact, type = 'vendor', referenceId }) {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.post(
        'https://api.razorpay.com/v1/contacts',
        {
          name,
          email,
          contact,
          type,
          reference_id: referenceId,
        },
        {
          auth: {
            username: process.env.RAZORPAY_KEY_ID,
            password: process.env.RAZORPAY_KEY_SECRET,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('RazorpayX createContact error:', error);
      throw new Error(`Failed to create contact: ${error.response?.data?.error?.description || error.message}`);
    }
  }

  /**
   * Create a payout (RazorpayX)
   * @param {Object} params - Payout parameters
   * @param {string} params.accountNumber - Bank account number
   * @param {string} params.ifsc - IFSC code
   * @param {number} params.amount - Amount in rupees
   * @param {string} params.fundAccountId - Fund account ID (if already created)
   * @param {string} params.mode - Payout mode (NEFT, IMPS, RTGS)
   * @param {string} params.purpose - Payout purpose
   * @param {Object} params.notes - Additional notes
   * @param {string} params.referenceId - Reference ID for idempotency
   * @returns {Promise<Object>} Payout object
   */
  async createPayout({ fundAccountId, amount, currency = 'INR', mode = 'NEFT', purpose = 'payout', notes = {}, referenceId }) {
    try {
      const axios = (await import('axios')).default;
      const payload = {
        account_number: `acc_${process.env.RAZORPAYX_ACCOUNT_NUMBER || 'default'}`,
        fund_account_id: fundAccountId,
        amount: Math.round(amount * 100), // Convert to paise
        currency,
        mode,
        purpose,
        queue_if_low_balance: true,
        reference_id: referenceId || `payout_${Date.now()}`,
        notes,
      };

      const response = await axios.post(
        'https://api.razorpay.com/v1/payouts',
        payload,
        {
          auth: {
            username: process.env.RAZORPAY_KEY_ID,
            password: process.env.RAZORPAY_KEY_SECRET,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('RazorpayX createPayout error:', error);
      throw new Error(`Failed to create payout: ${error.response?.data?.error?.description || error.message}`);
    }
  }

  /**
   * Get payout status (RazorpayX)
   * @param {string} payoutId - Razorpay payout ID
   * @returns {Promise<Object>} Payout object with status
   */
  async getPayout(payoutId) {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(
        `https://api.razorpay.com/v1/payouts/${payoutId}`,
        {
          auth: {
            username: process.env.RAZORPAY_KEY_ID,
            password: process.env.RAZORPAY_KEY_SECRET,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('RazorpayX getPayout error:', error);
      throw new Error(`Failed to get payout: ${error.response?.data?.error?.description || error.message}`);
    }
  }

  /**
   * Get settlements (RazorpayX)
   * @param {Object} params - Query parameters
   * @param {number} params.count - Number of settlements to fetch
   * @param {number} params.skip - Number of settlements to skip
   * @returns {Promise<Object>} Settlements response with items array
   */
  async getSettlements({ count = 100, skip = 0 } = {}) {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(
        'https://api.razorpay.com/v1/settlements',
        {
          params: { count, skip },
          auth: {
            username: process.env.RAZORPAY_KEY_ID,
            password: process.env.RAZORPAY_KEY_SECRET,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('RazorpayX getSettlements error:', error);
      throw new Error(`Failed to get settlements: ${error.response?.data?.error?.description || error.message}`);
    }
  }

  /**
   * Get fund account (RazorpayX)
   * @param {string} fundAccountId - Fund account ID
   * @returns {Promise<Object>} Fund account object
   */
  async getFundAccount(fundAccountId) {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(
        `https://api.razorpay.com/v1/fund_accounts/${fundAccountId}`,
        {
          auth: {
            username: process.env.RAZORPAY_KEY_ID,
            password: process.env.RAZORPAY_KEY_SECRET,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('RazorpayX getFundAccount error:', error);
      throw new Error(`Failed to get fund account: ${error.response?.data?.error?.description || error.message}`);
    }
  }
}

// Export singleton instance
let razorpayServiceInstance = null;

export function getRazorpayService() {
  if (!razorpayServiceInstance) {
    razorpayServiceInstance = new RazorpayService();
  }
  return razorpayServiceInstance;
}

export default RazorpayService;

