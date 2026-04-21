/**
 * Unit Tests for CouponService
 * 
 * Tests coupon validation, discount calculation, and redemption tracking
 */

import { getCouponService } from '@/lib/services/payment/CouponService.js';
import { query } from '@/lib/db/index.js';

// Mock database
jest.mock('@/lib/db/index.js', () => ({
  query: jest.fn(),
}));

describe('CouponService', () => {
  let couponService;

  beforeEach(() => {
    jest.clearAllMocks();
    couponService = getCouponService();
  });

  describe('validateCoupon', () => {
    const mockCoupon = {
      id: 'coupon-123',
      code: 'DISCOUNT10',
      name: '10% Discount',
      type: 'percentage',
      discount_value: 10,
      max_discount_amount: 500,
      valid_from: new Date('2025-01-01'),
      valid_until: new Date('2025-12-31'),
      status: 'active',
      max_uses: 100,
      max_uses_per_user: 1,
      min_order_amount: 500,
      applicable_item_types: ['course'],
      applicable_org_ids: null,
      applicable_course_ids: null,
      deleted_at: null,
    };

    it('should validate a valid coupon', async () => {
      query.mockResolvedValueOnce({ rows: [mockCoupon] });
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await couponService.validateCoupon({
        code: 'DISCOUNT10',
        userId: 'user-123',
        itemType: 'course',
        itemId: 'course-123',
        orderAmount: 1000,
      });

      expect(result.valid).toBe(true);
      expect(result.coupon.code).toBe('DISCOUNT10');
      expect(result.discountAmount).toBeGreaterThan(0);
    });

    it('should reject expired coupon', async () => {
      const expiredCoupon = {
        ...mockCoupon,
        valid_until: new Date('2024-01-01'),
      };
      query.mockResolvedValueOnce({ rows: [expiredCoupon] });

      const result = await couponService.validateCoupon({
        code: 'DISCOUNT10',
        userId: 'user-123',
        itemType: 'course',
        itemId: 'course-123',
        orderAmount: 1000,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject coupon if minimum order amount not met', async () => {
      query.mockResolvedValueOnce({ rows: [mockCoupon] });

      const result = await couponService.validateCoupon({
        code: 'DISCOUNT10',
        userId: 'user-123',
        itemType: 'course',
        itemId: 'course-123',
        orderAmount: 300, // Less than min_order_amount of 500
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('minimum order amount');
    });

    it('should reject coupon if usage limit reached', async () => {
      query.mockResolvedValueOnce({ rows: [mockCoupon] });
      query.mockResolvedValueOnce({ rows: [{ count: '100' }] }); // Max uses reached

      const result = await couponService.validateCoupon({
        code: 'DISCOUNT10',
        userId: 'user-123',
        itemType: 'course',
        itemId: 'course-123',
        orderAmount: 1000,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('usage limit');
    });

    it('should reject coupon if user already used it', async () => {
      query.mockResolvedValueOnce({ rows: [mockCoupon] });
      query.mockResolvedValueOnce({ rows: [{ count: '0' }] });
      query.mockResolvedValueOnce({ rows: [{ count: '1' }] }); // User already used

      const result = await couponService.validateCoupon({
        code: 'DISCOUNT10',
        userId: 'user-123',
        itemType: 'course',
        itemId: 'course-123',
        orderAmount: 1000,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('already used');
    });

    it('should calculate percentage discount correctly', () => {
      const discount = couponService.calculateDiscount(
        { type: 'percentage', discount_value: 10, max_discount_amount: 500 },
        1000
      );
      expect(discount).toBe(100); // 10% of 1000
    });

    it('should apply max discount limit for percentage coupons', () => {
      const discount = couponService.calculateDiscount(
        { type: 'percentage', discount_value: 10, max_discount_amount: 50 },
        1000
      );
      expect(discount).toBe(50); // Capped at max_discount_amount
    });

    it('should calculate fixed amount discount correctly', () => {
      const discount = couponService.calculateDiscount(
        { type: 'fixed_amount', discount_value: 200 },
        1000
      );
      expect(discount).toBe(200);
    });

    it('should not exceed order amount for fixed discount', () => {
      const discount = couponService.calculateDiscount(
        { type: 'fixed_amount', discount_value: 200 },
        100
      );
      expect(discount).toBe(100); // Capped at order amount
    });
  });

  describe('applyCoupon', () => {
    it('should create redemption record and update order', async () => {
      query.mockResolvedValueOnce({ rows: [] }); // Check existing redemption
      query.mockResolvedValueOnce({
        rows: [{
          id: 'redemption-123',
          coupon_id: 'coupon-123',
          order_id: 'order-123',
          user_id: 'user-123',
          discount_amount: 100,
          order_amount_before_discount: 1000,
          order_amount_after_discount: 900,
        }],
      });
      query.mockResolvedValueOnce({ rows: [] }); // Update order

      const result = await couponService.applyCoupon({
        couponId: 'coupon-123',
        orderId: 'order-123',
        userId: 'user-123',
        discountAmount: 100,
        orderAmountBeforeDiscount: 1000,
        orderAmountAfterDiscount: 900,
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('redemption-123');
      expect(query).toHaveBeenCalledTimes(3);
    });

    it('should throw error if coupon already applied to order', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 'existing' }] }); // Existing redemption

      await expect(
        couponService.applyCoupon({
          couponId: 'coupon-123',
          orderId: 'order-123',
          userId: 'user-123',
          discountAmount: 100,
          orderAmountBeforeDiscount: 1000,
          orderAmountAfterDiscount: 900,
        })
      ).rejects.toThrow('already applied');
    });
  });

  describe('getCouponByCode', () => {
    it('should return coupon by code', async () => {
      const mockCoupon = {
        id: 'coupon-123',
        code: 'DISCOUNT10',
        name: '10% Discount',
        type: 'percentage',
        discount_value: 10,
        deleted_at: null,
      };

      query.mockResolvedValueOnce({ rows: [mockCoupon] });

      const result = await couponService.getCouponByCode('DISCOUNT10');

      expect(result).toBeDefined();
      expect(result.code).toBe('DISCOUNT10');
    });

    it('should return null if coupon not found', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const result = await couponService.getCouponByCode('INVALID');

      expect(result).toBeNull();
    });
  });
});

