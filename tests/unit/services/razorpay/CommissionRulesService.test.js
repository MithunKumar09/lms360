/**
 * Unit Tests for CommissionRulesService
 * 
 * Tests commission rule fetching, creation, and hierarchy
 */

import { getCommissionRulesService } from '@/lib/services/razorpay/CommissionRulesService.js';
import { query } from '@/lib/db/index.js';

// Mock database
jest.mock('@/lib/db/index.js', () => ({
  query: jest.fn(),
}));

describe('CommissionRulesService', () => {
  let commissionRulesService;

  beforeEach(() => {
    jest.clearAllMocks();
    commissionRulesService = getCommissionRulesService();
  });

  describe('getApplicableRule', () => {
    it('should return course-level rule when available', async () => {
      const courseRule = {
        id: 'rule-course',
        scope: 'course',
        course_id: 'course-123',
        platform_percentage: 15,
        platform_fixed_fee_percentage: 3,
        platform_fixed_fee_amount: null,
        priority: 10,
        is_active: true,
        valid_from: null,
        valid_until: null,
        deleted_at: null,
      };

      query.mockResolvedValueOnce({ rows: [courseRule] });

      const result = await commissionRulesService.getApplicableRule({
        courseId: 'course-123',
        orgId: 'org-123',
      });

      expect(result.scope).toBe('course');
      expect(result.platformPercentage).toBe(15);
    });

    it('should return org-level rule when course rule not available', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // No course rule
      
      const orgRule = {
        id: 'rule-org',
        scope: 'organization',
        org_id: 'org-123',
        platform_percentage: 12,
        platform_fixed_fee_percentage: 2.5,
        platform_fixed_fee_amount: null,
        priority: 5,
        is_active: true,
        valid_from: null,
        valid_until: null,
        deleted_at: null,
      };

      query.mockResolvedValueOnce({ rows: [orgRule] });

      const result = await commissionRulesService.getApplicableRule({
        courseId: 'course-123',
        orgId: 'org-123',
      });

      expect(result.scope).toBe('organization');
      expect(result.platformPercentage).toBe(12);
    });

    it('should return global rule when no specific rules available', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // No course rule
      query.mockResolvedValueOnce({ rows: [] }); // No org rule
      
      const globalRule = {
        id: 'rule-global',
        scope: 'global',
        platform_percentage: 10,
        platform_fixed_fee_percentage: 2,
        platform_fixed_fee_amount: null,
        priority: 0,
        is_active: true,
        valid_from: null,
        valid_until: null,
        deleted_at: null,
      };

      query.mockResolvedValueOnce({ rows: [globalRule] });

      const result = await commissionRulesService.getApplicableRule({
        courseId: 'course-123',
        orgId: 'org-123',
      });

      expect(result.scope).toBe('global');
      expect(result.platformPercentage).toBe(10);
    });

    it('should return default rule when no rules found', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // No course rule
      query.mockResolvedValueOnce({ rows: [] }); // No org rule
      query.mockResolvedValueOnce({ rows: [] }); // No global rule

      const result = await commissionRulesService.getApplicableRule({
        courseId: 'course-123',
        orgId: 'org-123',
      });

      expect(result.scope).toBe('global');
      expect(result.platformPercentage).toBe(10); // Default
    });
  });

  describe('createRule', () => {
    it('should create a global commission rule', async () => {
      const ruleData = {
        scope: 'global',
        platformPercentage: 10,
        platformFixedFeePercentage: 2,
        name: 'Default Commission',
      };

      const createdRule = {
        id: 'rule-123',
        ...ruleData,
        scope: 'global',
        platform_percentage: 10,
        platform_fixed_fee_percentage: 2,
        created_at: new Date(),
        updated_at: new Date(),
      };

      query.mockResolvedValueOnce({ rows: [createdRule] });

      const result = await commissionRulesService.createRule(ruleData);

      expect(result.id).toBe('rule-123');
      expect(result.scope).toBe('global');
      expect(query).toHaveBeenCalled();
    });

    it('should throw error if orgId missing for organization scope', async () => {
      const ruleData = {
        scope: 'organization',
        platformPercentage: 10,
      };

      await expect(
        commissionRulesService.createRule(ruleData)
      ).rejects.toThrow('orgId is required');
    });

    it('should throw error if courseId missing for course scope', async () => {
      const ruleData = {
        scope: 'course',
        platformPercentage: 10,
      };

      await expect(
        commissionRulesService.createRule(ruleData)
      ).rejects.toThrow('courseId is required');
    });
  });

  describe('updateRule', () => {
    it('should update commission rule', async () => {
      const updatedRule = {
        id: 'rule-123',
        scope: 'global',
        platform_percentage: 12,
        platform_fixed_fee_percentage: 2,
        updated_at: new Date(),
      };

      query.mockResolvedValueOnce({ rows: [updatedRule] });

      const result = await commissionRulesService.updateRule('rule-123', {
        platformPercentage: 12,
      });

      expect(result.platformPercentage).toBe(12);
      expect(query).toHaveBeenCalled();
    });

    it('should throw error if rule not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await expect(
        commissionRulesService.updateRule('invalid-id', { platformPercentage: 12 })
      ).rejects.toThrow('not found');
    });
  });

  describe('deleteRule', () => {
    it('should soft delete commission rule', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'rule-123' }] });

      const result = await commissionRulesService.deleteRule('rule-123');

      expect(result).toBe(true);
      expect(query).toHaveBeenCalled();
    });

    it('should return false if rule not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const result = await commissionRulesService.deleteRule('invalid-id');

      expect(result).toBe(false);
    });
  });
});

