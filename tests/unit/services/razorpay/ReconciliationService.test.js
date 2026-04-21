/**
 * Unit Tests for ReconciliationService
 * 
 * Tests settlement matching and exception handling
 */

import { getReconciliationService } from '@/lib/services/razorpay/ReconciliationService.js';
import { query } from '@/lib/db/index.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';

// Mock dependencies
jest.mock('@/lib/db/index.js', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/services/razorpay/RazorpayService.js', () => ({
  getRazorpayService: jest.fn(),
}));

describe('ReconciliationService', () => {
  let reconciliationService;
  let mockRazorpayService;

  beforeEach(() => {
    jest.clearAllMocks();
    reconciliationService = getReconciliationService();
    mockRazorpayService = {
      getSettlements: jest.fn(),
    };
    getRazorpayService.mockReturnValue(mockRazorpayService);
  });

  describe('fetchSettlements', () => {
    it('should fetch settlements from Razorpay API', async () => {
      const mockSettlements = {
        items: [
          {
            id: 'setl_123',
            amount: 100000, // in paise
            currency: 'INR',
            settled_at: 1640995200,
          },
        ],
      };

      mockRazorpayService.getSettlements.mockResolvedValueOnce(mockSettlements);

      const result = await reconciliationService.fetchSettlements({ count: 10 });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('setl_123');
      expect(mockRazorpayService.getSettlements).toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockRazorpayService.getSettlements.mockRejectedValueOnce(
        new Error('API Error')
      );

      await expect(
        reconciliationService.fetchSettlements()
      ).rejects.toThrow('Failed to fetch settlements');
    });
  });

  describe('matchSettlementsToPayments', () => {
    it('should match payments to settlement by date range', async () => {
      const mockSettlement = {
        id: 'settlement-db-id',
        razorpay_settlement_id: 'setl_123',
        amount: 1000,
        settled_on: '2025-01-15',
      };

      const mockPayments = [
        {
          id: 'payment-1',
          amount: 500,
          captured_at: new Date('2025-01-14'),
          order_id: 'order-1',
          user_id: 'user-1',
          item_type: 'course',
          item_id: 'course-1',
        },
        {
          id: 'payment-2',
          amount: 500,
          captured_at: new Date('2025-01-15'),
          order_id: 'order-2',
          user_id: 'user-2',
          item_type: 'course',
          item_id: 'course-2',
        },
      ];

      query.mockResolvedValueOnce({ rows: [mockSettlement] });
      query.mockResolvedValueOnce({ rows: mockPayments });

      const result = await reconciliationService.matchSettlementsToPayments('setl_123');

      expect(result.settlement).toBeDefined();
      expect(result.matchedPayments).toHaveLength(2);
      expect(result.expectedAmount).toBe(1000);
      expect(result.actualAmount).toBe(1000);
      expect(result.difference).toBe(0);
    });

    it('should throw error if settlement not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await expect(
        reconciliationService.matchSettlementsToPayments('invalid')
      ).rejects.toThrow('Settlement not found');
    });
  });

  describe('flagMismatches', () => {
    it('should create exception when mismatch detected', async () => {
      const mockSettlement = {
        id: 'settlement-db-id',
        razorpay_settlement_id: 'setl_123',
        amount: 1000,
        settled_on: '2025-01-15',
      };

      const mockPayments = [
        {
          id: 'payment-1',
          amount: 400, // Less than settlement amount
          captured_at: new Date('2025-01-14'),
        },
      ];

      query.mockResolvedValueOnce({ rows: [mockSettlement] });
      query.mockResolvedValueOnce({ rows: mockPayments });
      query.mockResolvedValueOnce({ rows: [] }); // No existing exception
      query.mockResolvedValueOnce({ rows: [] }); // Create exception

      const result = await reconciliationService.flagMismatches('setl_123', 1.0);

      expect(result.hasMismatch).toBe(true);
      expect(result.difference).toBe(600); // 1000 - 400
      expect(query).toHaveBeenCalledTimes(4);
    });

    it('should mark as reconciled when amounts match', async () => {
      const mockSettlement = {
        id: 'settlement-db-id',
        razorpay_settlement_id: 'setl_123',
        amount: 1000,
        settled_on: '2025-01-15',
      };

      const mockPayments = [
        {
          id: 'payment-1',
          amount: 1000, // Matches settlement amount
          captured_at: new Date('2025-01-14'),
        },
      ];

      query.mockResolvedValueOnce({ rows: [mockSettlement] });
      query.mockResolvedValueOnce({ rows: mockPayments });
      query.mockResolvedValueOnce({ rows: [] }); // Update settlement
      query.mockResolvedValueOnce({ rows: [] }); // Update payment splits

      const result = await reconciliationService.flagMismatches('setl_123', 1.0);

      expect(result.hasMismatch).toBe(false);
      expect(result.matched).toBe(true);
    });
  });

  describe('computeVendorBalances', () => {
    it('should move pending to withdrawable after hold period', async () => {
      const mockSplits = [
        {
          id: 'split-1',
          entity_id: 'vendor-1',
          amount: 500,
          payment_id: 'payment-1',
          captured_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        },
      ];

      query.mockResolvedValueOnce({ rows: mockSplits });
      query.mockResolvedValueOnce({ rows: [{ id: 'vendor-account-1' }] });

      // Mock LedgerService
      const mockLedgerService = {
        updateVendorBalance: jest.fn().mockResolvedValue({}),
      };

      jest.doMock('@/lib/services/razorpay/LedgerService.js', () => ({
        getLedgerService: () => mockLedgerService,
      }));

      const result = await reconciliationService.computeVendorBalances(7);

      expect(result.processed).toBeGreaterThan(0);
      expect(query).toHaveBeenCalled();
    });
  });
});

