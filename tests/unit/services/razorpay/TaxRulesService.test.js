/**
 * Unit Tests for TaxRulesService
 * 
 * Tests tax rule fetching, calculation, and CRUD operations
 */

import { getTaxRulesService } from '@/lib/services/razorpay/TaxRulesService.js';
import { query } from '@/lib/db/index.js';

// Mock database
jest.mock('@/lib/db/index.js', () => ({
  query: jest.fn(),
}));

describe('TaxRulesService', () => {
  let taxRulesService;

  beforeEach(() => {
    jest.clearAllMocks();
    taxRulesService = getTaxRulesService();
  });

  describe('getApplicableRule', () => {
    it('should return specific location rule when available', async () => {
      const specificRule = {
        id: 'rule-specific',
        type: 'gst',
        rate: 18,
        country: 'IN',
        state: 'Maharashtra',
        applicable_item_types: ['course'],
        priority: 10,
        is_active: true,
        valid_from: null,
        valid_until: null,
        deleted_at: null,
      };

      query.mockResolvedValueOnce({ rows: [specificRule] });

      const result = await taxRulesService.getApplicableRule({
        itemType: 'course',
        country: 'IN',
        state: 'Maharashtra',
      });

      expect(result.rate).toBe(18);
      expect(result.country).toBe('IN');
    });

    it('should return country-level rule when state-specific not available', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // No state-specific
      
      const countryRule = {
        id: 'rule-country',
        type: 'gst',
        rate: 18,
        country: 'IN',
        state: null,
        applicable_item_types: null,
        priority: 5,
        is_active: true,
        valid_from: null,
        valid_until: null,
        deleted_at: null,
      };

      query.mockResolvedValueOnce({ rows: [countryRule] });

      const result = await taxRulesService.getApplicableRule({
        itemType: 'course',
        country: 'IN',
        state: 'Maharashtra',
      });

      expect(result.country).toBe('IN');
      expect(result.state).toBeNull();
    });

    it('should return default rule when no rules found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const result = await taxRulesService.getApplicableRule({
        itemType: 'course',
        country: 'IN',
        state: 'Maharashtra',
      });

      expect(result.type).toBe('gst');
      expect(result.rate).toBe(18); // Default
    });
  });

  describe('calculateTax', () => {
    it('should calculate GST correctly', async () => {
      const gstRule = {
        id: 'rule-gst',
        type: 'gst',
        rate: 18,
        metadata: {},
      };

      query.mockResolvedValueOnce({ rows: [gstRule] });

      const result = await taxRulesService.calculateTax({
        amount: 1000,
        itemType: 'course',
        country: 'IN',
      });

      // GST calculation: amount * rate / (100 + rate)
      // 1000 * 18 / 118 = 152.54
      expect(result.taxAmount).toBeGreaterThan(0);
      expect(result.rule.type).toBe('gst');
      expect(result.amountAfterTax).toBeLessThan(1000);
    });

    it('should handle zero tax rate', async () => {
      const zeroTaxRule = {
        id: 'rule-zero',
        type: 'gst',
        rate: 0,
        metadata: {},
      };

      query.mockResolvedValueOnce({ rows: [zeroTaxRule] });

      const result = await taxRulesService.calculateTax({
        amount: 1000,
        itemType: 'course',
      });

      expect(result.taxAmount).toBe(0);
      expect(result.amountAfterTax).toBe(1000);
    });
  });

  describe('createRule', () => {
    it('should create a tax rule', async () => {
      const ruleData = {
        type: 'gst',
        name: 'GST 18%',
        rate: 18,
        country: 'IN',
      };

      const createdRule = {
        id: 'rule-123',
        ...ruleData,
        created_at: new Date(),
        updated_at: new Date(),
      };

      query.mockResolvedValueOnce({ rows: [createdRule] });

      const result = await taxRulesService.createRule(ruleData);

      expect(result.id).toBe('rule-123');
      expect(result.type).toBe('gst');
      expect(result.rate).toBe(18);
    });
  });

  describe('updateRule', () => {
    it('should update tax rule', async () => {
      const updatedRule = {
        id: 'rule-123',
        type: 'gst',
        rate: 20,
        updated_at: new Date(),
      };

      query.mockResolvedValueOnce({ rows: [updatedRule] });

      const result = await taxRulesService.updateRule('rule-123', {
        rate: 20,
      });

      expect(result.rate).toBe(20);
    });
  });
});

