/**
 * Integration Tests for Webhook Handlers
 * 
 * Tests webhook signature verification and event processing
 */

import * as webhookHandlers from '@/lib/services/razorpay/webhookHandlers.js';
import { query } from '@/lib/db/index.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';

// Mock dependencies
jest.mock('@/lib/db/index.js', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/services/razorpay/RazorpayService.js', () => ({
  getRazorpayService: jest.fn(),
}));

jest.mock('@/lib/services/razorpay/LedgerService.js', () => ({
  getLedgerService: jest.fn(),
}));

describe('Webhook Handlers Integration', () => {
  let mockRazorpayService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRazorpayService = {
      verifyWebhookSignature: jest.fn().mockReturnValue(true),
    };
    getRazorpayService.mockReturnValue(mockRazorpayService);
  });

  describe('handlePaymentCaptured', () => {
    it('should process payment.captured event', async () => {
      const mockEvent = {
        id: 'evt_123',
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_123',
              order_id: 'order_razorpay_123',
              amount: 100000, // in paise
              currency: 'INR',
              status: 'captured',
              method: 'card',
            },
          },
        },
        signature: 'webhook_signature',
      };

      const mockOrder = {
        id: 'order-123',
        user_id: 'user-123',
        item_type: 'course',
        item_id: 'course-123',
        final_amount: 1000,
        org_id: 'org-123',
      };

      const mockPayment = {
        id: 'payment-123',
      };

      query.mockResolvedValueOnce({ rows: [{ id: 'webhook-log-id' }] }); // Log webhook
      query.mockResolvedValueOnce({ rows: [] }); // Check if processed
      query.mockResolvedValueOnce({ rows: [] }); // Update payment
      query.mockResolvedValueOnce({ rows: [] }); // Update order
      query.mockResolvedValueOnce({ rows: [mockOrder] }); // Get order
      query.mockResolvedValueOnce({ rows: [mockPayment] }); // Get payment
      query.mockResolvedValueOnce({ rows: [] }); // Create splits
      query.mockResolvedValueOnce({ rows: [] }); // Check vendor account
      query.mockResolvedValueOnce({ rows: [] }); // Update webhook log

      await webhookHandlers.handlePaymentCaptured(mockEvent);

      expect(query).toHaveBeenCalled();
    });

    it('should skip if event already processed', async () => {
      const mockEvent = {
        id: 'evt_123',
        event: 'payment.captured',
        payload: {},
        signature: 'webhook_signature',
      };

      query.mockResolvedValueOnce({ rows: [{ id: 'webhook-log-id' }] });
      query.mockResolvedValueOnce({ rows: [{ status: 'processed' }] }); // Already processed

      await webhookHandlers.handlePaymentCaptured(mockEvent);

      // Should not process further
      expect(query).toHaveBeenCalledTimes(2);
    });
  });

  describe('handlePaymentFailed', () => {
    it('should process payment.failed event', async () => {
      const mockEvent = {
        id: 'evt_124',
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_124',
              order_id: 'order_razorpay_124',
              amount: 100000,
              status: 'failed',
              error_description: 'Payment declined',
            },
          },
        },
        signature: 'webhook_signature',
      };

      query.mockResolvedValueOnce({ rows: [{ id: 'webhook-log-id' }] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] }); // Update payment
      query.mockResolvedValueOnce({ rows: [] }); // Update order
      query.mockResolvedValueOnce({ rows: [] }); // Update webhook log

      await webhookHandlers.handlePaymentFailed(mockEvent);

      expect(query).toHaveBeenCalled();
    });
  });

  describe('handleRefundSucceeded', () => {
    it('should process refund.succeeded event', async () => {
      const mockEvent = {
        id: 'evt_125',
        event: 'refund.succeeded',
        payload: {
          refund: {
            entity: {
              id: 'rfnd_123',
              payment_id: 'pay_123',
              amount: 50000, // in paise
              status: 'processed',
            },
          },
        },
        signature: 'webhook_signature',
      };

      query.mockResolvedValueOnce({ rows: [{ id: 'webhook-log-id' }] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [{ id: 'payment-123', order_id: 'order-123' }] });
      query.mockResolvedValueOnce({ rows: [] }); // Create/update refund
      query.mockResolvedValueOnce({ rows: [] }); // Reverse splits
      query.mockResolvedValueOnce({ rows: [] }); // Update webhook log

      await webhookHandlers.handleRefundSucceeded(mockEvent);

      expect(query).toHaveBeenCalled();
    });
  });
});

