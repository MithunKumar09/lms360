/**
 * Admin Finance Coupons API Route
 * 
 * GET /api/admin/finance/coupons - List all coupons
 * POST /api/admin/finance/coupons - Create new coupon
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getCouponService } from '@/lib/services/payment/CouponService.js';
import { getPaymentAuditService } from '@/lib/services/payment/PaymentAuditService.js';

/**
 * GET /api/admin/finance/coupons
 * List all coupons with filters
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const code = searchParams.get('code');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const couponService = getCouponService();
    const coupons = await couponService.listCoupons({
      status,
      code,
      limit,
      offset,
    });

    // Get redemption stats for each coupon
    const couponsWithStats = await Promise.all(
      coupons.map(async (coupon) => {
        const stats = await couponService.getRedemptionStats(coupon.id);
        return { ...coupon, stats };
      })
    );

    return NextResponse.json({
      success: true,
      coupons: couponsWithStats,
      pagination: {
        page,
        limit,
        total: coupons.length, // Note: This is approximate, full count would require separate query
      },
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get coupons' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/finance/coupons
 * Create new coupon
 * 
 * Request Body:
 * {
 *   "code": "DISCOUNT10",
 *   "name": "10% Discount",
 *   "description": "10% off on all courses",
 *   "type": "percentage",
 *   "discountValue": 10,
 *   "maxDiscountAmount": 500,
 *   "validFrom": "2025-01-01T00:00:00Z",
 *   "validUntil": "2025-12-31T23:59:59Z",
 *   "maxUses": 1000,
 *   "maxUsesPerUser": 1,
 *   "minOrderAmount": 500,
 *   "applicableItemTypes": ["course"],
 *   "applicableOrgIds": null,
 *   "applicableCourseIds": null
 * }
 */
export async function POST(request) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userEmail = session.user.email;
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const {
      code,
      name,
      description,
      type,
      discountValue,
      maxDiscountAmount,
      validFrom,
      validUntil,
      maxUses,
      maxUsesPerUser,
      minOrderAmount,
      applicableItemTypes,
      applicableOrgIds,
      applicableCourseIds,
      metadata = {},
    } = body;

    // Validate input
    if (!code || !name || !type || !discountValue || !validFrom || !validUntil) {
      return NextResponse.json(
        { success: false, error: 'code, name, type, discountValue, validFrom, and validUntil are required' },
        { status: 400 }
      );
    }

    if (!['percentage', 'fixed_amount'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'type must be percentage or fixed_amount' },
        { status: 400 }
      );
    }

    if (discountValue <= 0) {
      return NextResponse.json(
        { success: false, error: 'discountValue must be greater than 0' },
        { status: 400 }
      );
    }

    // Create coupon
    const couponService = getCouponService();
    const coupon = await couponService.createCoupon({
      code,
      name,
      description,
      type,
      discountValue,
      maxDiscountAmount,
      validFrom: new Date(validFrom),
      validUntil: new Date(validUntil),
      maxUses,
      maxUsesPerUser: maxUsesPerUser || 1,
      minOrderAmount,
      applicableItemTypes,
      applicableOrgIds,
      applicableCourseIds,
      createdBy: userId,
      metadata,
    });

    // Log audit
    const auditService = getPaymentAuditService();
    await auditService.logCouponAction({
      action: 'created',
      couponId: coupon.id,
      userId,
      userRole,
      userEmail,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      coupon,
    }, { status: 201 });
  } catch (error) {
    console.error('Create coupon error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create coupon' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/finance/coupons
 * Update coupon
 */
export async function PATCH(request) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userEmail = session.user.email;
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const { couponId, ...updates } = body;

    if (!couponId) {
      return NextResponse.json(
        { success: false, error: 'couponId is required' },
        { status: 400 }
      );
    }

    const couponService = getCouponService();
    const coupon = await couponService.updateCoupon(couponId, updates);

    // Log audit
    const auditService = getPaymentAuditService();
    await auditService.logCouponAction({
      action: 'updated',
      couponId: coupon.id,
      userId,
      userRole,
      userEmail,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      coupon,
    });
  } catch (error) {
    console.error('Update coupon error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update coupon' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/finance/coupons
 * Delete coupon (soft delete)
 */
export async function DELETE(request) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userEmail = session.user.email;
    const ipAddress = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const { searchParams } = new URL(request.url);
    const couponId = searchParams.get('couponId');

    if (!couponId) {
      return NextResponse.json(
        { success: false, error: 'couponId is required' },
        { status: 400 }
      );
    }

    const couponService = getCouponService();
    const deleted = await couponService.deleteCoupon(couponId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Log audit
    const auditService = getPaymentAuditService();
    await auditService.logCouponAction({
      action: 'deleted',
      couponId,
      userId,
      userRole,
      userEmail,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: 'Coupon deleted successfully',
    });
  } catch (error) {
    console.error('Delete coupon error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete coupon' },
      { status: 500 }
    );
  }
}

