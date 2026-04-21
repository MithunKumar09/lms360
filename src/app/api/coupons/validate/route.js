/**
 * Coupon Validation API Route
 * 
 * POST /api/coupons/validate - Validate a coupon code
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getCouponService } from '@/lib/services/payment/CouponService.js';

/**
 * POST /api/coupons/validate
 * Validate a coupon code
 * 
 * Request Body:
 * {
 *   "code": "DISCOUNT10",
 *   "itemType": "course",
 *   "itemId": "uuid",
 *   "orderAmount": 1000.00
 * }
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['student', 'alumni', 'parent', 'vendor']);
    const userId = session.user.id;
    const orgId = session.user.orgId || session.user.org_id;

    const body = await request.json();
    const { code, itemType, itemId, orderAmount } = body;

    // Validate input
    if (!code || !itemType || !itemId || !orderAmount) {
      return NextResponse.json(
        { success: false, error: 'code, itemType, itemId, and orderAmount are required' },
        { status: 400 }
      );
    }

    if (!['course', 'event', 'workshop'].includes(itemType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid itemType. Must be course, event, or workshop' },
        { status: 400 }
      );
    }

    if (orderAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'orderAmount must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate coupon
    const couponService = getCouponService();
    const validationResult = await couponService.validateCoupon({
      code,
      userId,
      itemType,
      itemId,
      orgId,
      orderAmount,
    });

    if (!validationResult.valid) {
      return NextResponse.json(
        { success: false, error: validationResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      coupon: validationResult.coupon,
      discountAmount: validationResult.discountAmount,
      orderAmountAfterDiscount: validationResult.orderAmountAfterDiscount,
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}

