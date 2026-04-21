/**
 * Integration Tests for Checkout Flow
 * 
 * Tests complete checkout flow with coupons and tax calculation
 */

import { POST } from '@/app/api/checkout/create-order/route.js';
import { createMockRequest, createMockSession, expectApiResponse } from '../../../setup/test-helpers.js';

// Mock dependencies
jest.mock('@/lib/auth/guards.js', () => ({
  requireRole: jest.fn(),
}));

jest.mock('@/lib/db/index.js', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/services/razorpay/RazorpayService.js', () => ({
  getRazorpayService: jest.fn(),
}));

jest.mock('@/lib/services/payment/CouponService.js', () => ({
  getCouponService: jest.fn(),
}));

import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';
import { getCouponService } from '@/lib/services/payment/CouponService.js';

describe('Checkout Flow Integration', () => {
  let mockSession;
  let mockRazorpayService;
  let mockCouponService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = createMockSession({
      role: 'student',
      userId: 'user-123',
      orgId: 'org-123',
    });
    requireRole.mockResolvedValue(mockSession);

    mockRazorpayService = {
      createOrder: jest.fn(),
    };
    getRazorpayService.mockReturnValue(mockRazorpayService);

    mockCouponService = {
      validateCoupon: jest.fn(),
      applyCoupon: jest.fn(),
    };
    getCouponService.mockReturnValue(mockCouponService);
  });

  describe('POST /api/checkout/create-order', () => {
    it('should create order without coupon', async () => {
      const mockCourse = {
        id: 'course-123',
        title: 'Test Course',
        regular_price: 1000,
        discounted_price: 0,
        status: 'published',
      };

      query.mockResolvedValueOnce({ rows: [mockCourse] }); // Get course
      query.mockResolvedValueOnce({ rows: [] }); // Check existing order
      query.mockResolvedValueOnce({
        rows: [{ id: 'order-123', razorpay_order_id: null }],
      }); // Create order
      query.mockResolvedValueOnce({ rows: [] }); // Update order with Razorpay ID

      mockRazorpayService.createOrder.mockResolvedValueOnce({
        id: 'order_razorpay_123',
      });

      const request = createMockRequest(mockSession);
      request.json = jest.fn().mockResolvedValue({
        itemType: 'course',
        itemId: 'course-123',
        amount: 1000,
        currency: 'INR',
      });

      const response = await POST(request);
      const data = await response.json();

      expectApiResponse(data, true);
      expect(data.order).toBeDefined();
      expect(data.order.id).toBe('order-123');
      expect(mockRazorpayService.createOrder).toHaveBeenCalled();
    });

    it('should create order with valid coupon', async () => {
      const mockCourse = {
        id: 'course-123',
        title: 'Test Course',
        regular_price: 1000,
        discounted_price: 0,
        status: 'published',
      };

      const mockCoupon = {
        id: 'coupon-123',
        code: 'DISCOUNT10',
        name: '10% Discount',
      };

      mockCouponService.validateCoupon.mockResolvedValueOnce({
        valid: true,
        coupon: mockCoupon,
        discountAmount: 100,
        orderAmountAfterDiscount: 900,
      });

      query.mockResolvedValueOnce({ rows: [mockCourse] });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({
        rows: [{ id: 'order-123', razorpay_order_id: null }],
      });
      query.mockResolvedValueOnce({ rows: [] });
      query.mockResolvedValueOnce({ rows: [] }); // Apply coupon

      mockRazorpayService.createOrder.mockResolvedValueOnce({
        id: 'order_razorpay_123',
      });

      const request = createMockRequest(mockSession);
      request.json = jest.fn().mockResolvedValue({
        itemType: 'course',
        itemId: 'course-123',
        amount: 1000,
        currency: 'INR',
        couponCode: 'DISCOUNT10',
      });

      const response = await POST(request);
      const data = await response.json();

      expectApiResponse(data, true);
      expect(mockCouponService.validateCoupon).toHaveBeenCalled();
      expect(mockCouponService.applyCoupon).toHaveBeenCalled();
    });

    it('should reject invalid coupon', async () => {
      const mockCourse = {
        id: 'course-123',
        title: 'Test Course',
        regular_price: 1000,
        status: 'published',
      };

      mockCouponService.validateCoupon.mockResolvedValueOnce({
        valid: false,
        error: 'Coupon code not found or expired',
      });

      query.mockResolvedValueOnce({ rows: [mockCourse] });
      query.mockResolvedValueOnce({ rows: [] });

      const request = createMockRequest(mockSession);
      request.json = jest.fn().mockResolvedValue({
        itemType: 'course',
        itemId: 'course-123',
        amount: 1000,
        currency: 'INR',
        couponCode: 'INVALID',
      });

      const response = await POST(request);
      const data = await response.json();

      expectApiResponse(data, false);
      expect(data.error).toContain('Coupon');
    });

    it('should reject if user already has paid order', async () => {
      const mockCourse = {
        id: 'course-123',
        title: 'Test Course',
        regular_price: 1000,
        status: 'published',
      };

      query.mockResolvedValueOnce({ rows: [mockCourse] });
      query.mockResolvedValueOnce({
        rows: [{ id: 'existing-order', status: 'paid' }],
      }); // Existing paid order

      const request = createMockRequest(mockSession);
      request.json = jest.fn().mockResolvedValue({
        itemType: 'course',
        itemId: 'course-123',
        amount: 1000,
        currency: 'INR',
      });

      const response = await POST(request);
      const data = await response.json();

      expectApiResponse(data, false);
      expect(data.error).toContain('already have access');
    });
  });
});

