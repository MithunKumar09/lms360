/**
 * Coupon Apply API Route
 * 
 * POST /api/coupons/apply - Apply a coupon to an order
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getCouponService } from '@/lib/services/payment/CouponService.js';
import { query } from '@/lib/db/index.js';

/**
 * POST /api/coupons/apply
 * Apply a coupon to an order
 * 
 * Request Body:
 * {
 *   "couponCode": "DISCOUNT10",
 *   "orderId": "uuid",
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
    const { couponCode, orderId, itemType, itemId, orderAmount } = body;

    // Validate input
    if (!couponCode || !orderId || !itemType || !itemId || !orderAmount) {
      return NextResponse.json(
        { success: false, error: 'couponCode, orderId, itemType, itemId, and orderAmount are required' },
        { status: 400 }
      );
    }

    // Verify order exists and belongs to user
    const orderResult = await query(
      `SELECT id, user_id, item_type, item_id, amount, final_amount FROM orders WHERE id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    if (order.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (order.item_type !== itemType || order.item_id !== itemId) {
      return NextResponse.json(
        { success: false, error: 'Order item mismatch' },
        { status: 400 }
      );
    }

    // Validate coupon
    const couponService = getCouponService();
    const validationResult = await couponService.validateCoupon({
      code: couponCode,
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

    // Apply coupon
    const redemption = await couponService.applyCoupon({
      couponId: validationResult.coupon.id,
      orderId,
      userId,
      discountAmount: validationResult.discountAmount,
      orderAmountBeforeDiscount: orderAmount,
      orderAmountAfterDiscount: validationResult.orderAmountAfterDiscount,
    });

    // Update order with new amounts
    const newFinalAmount = validationResult.orderAmountAfterDiscount;
    await query(
      `UPDATE orders
       SET discount_amount = $1, final_amount = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [validationResult.discountAmount, newFinalAmount, orderId]
    );

    return NextResponse.json({
      success: true,
      redemption: {
        id: redemption.id,
        couponId: redemption.coupon_id,
        discountAmount: parseFloat(redemption.discount_amount),
        orderAmountAfterDiscount: parseFloat(redemption.order_amount_after_discount),
      },
      coupon: validationResult.coupon,
    });
  } catch (error) {
    console.error('Apply coupon error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to apply coupon' },
      { status: 500 }
    );
  }
}

