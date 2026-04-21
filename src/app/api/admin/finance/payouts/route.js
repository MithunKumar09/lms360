/**
 * Admin Finance Payouts API Route
 * 
 * GET /api/admin/finance/payouts - List payouts (superadmin only)
 * POST /api/admin/finance/payouts - Approve/process payout (superadmin only)
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';

/**
 * GET /api/admin/finance/payouts
 * List payouts with filters and pagination
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendorId');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (vendorId) {
      whereClause += ` AND va.user_id = $${paramIndex}`;
      queryParams.push(vendorId);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM payouts p
       JOIN vendor_accounts va ON p.vendor_account_id = va.id
       ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get payouts with vendor info
    const payoutsResult = await query(
      `SELECT 
         p.*,
         va.user_id as vendor_user_id,
         u.email as vendor_email,
         u.first_name,
         u.last_name,
         va.kyc_status
       FROM payouts p
       JOIN vendor_accounts va ON p.vendor_account_id = va.id
       JOIN users u ON va.user_id = u.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const payouts = payoutsResult.rows.map(row => ({
      id: row.id,
      razorpayPayoutId: row.razorpay_payout_id,
      vendorUserId: row.vendor_user_id,
      vendorEmail: row.vendor_email,
      vendorName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      kycStatus: row.kyc_status,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      mode: row.mode,
      referenceId: row.reference_id,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      processedAt: row.processed_at,
      failedAt: row.failed_at,
    }));

    return NextResponse.json({
      success: true,
      payouts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get payouts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/finance/payouts
 * Approve and process payout
 * 
 * Request Body:
 * {
 *   "payoutId": "uuid",
 *   "action": "approve" | "reject" | "retry"
 * }
 */
export async function POST(request) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    
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
    const { payoutId, action } = body;

    if (!payoutId || !action) {
      return NextResponse.json(
        { success: false, error: 'payoutId and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject', 'retry'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be approve, reject, or retry' },
        { status: 400 }
      );
    }

    // Get payout
    const payoutResult = await query(
      `SELECT p.*, va.fund_account_id, va.user_id as vendor_user_id
       FROM payouts p
       JOIN vendor_accounts va ON p.vendor_account_id = va.id
       WHERE p.id = $1`,
      [payoutId]
    );

    if (payoutResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payout not found' },
        { status: 404 }
      );
    }

    const payout = payoutResult.rows[0];

    if (action === 'reject') {
      await query(
        `UPDATE payouts
         SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [payoutId]
      );

      return NextResponse.json({
        success: true,
        message: 'Payout rejected',
      });
    }

    if (action === 'approve' || action === 'retry') {
      // Create payout in RazorpayX
      if (!payout.fund_account_id) {
        return NextResponse.json(
          { success: false, error: 'Fund account not configured for vendor' },
          { status: 400 }
        );
      }

      try {
        const razorpayService = getRazorpayService();
        const razorpayPayout = await razorpayService.createPayout({
          fundAccountId: payout.fund_account_id,
          amount: parseFloat(payout.amount),
          currency: payout.currency,
          mode: payout.mode || 'NEFT',
          purpose: 'payout',
          notes: {
            payout_id: payout.id,
            vendor_id: payout.vendor_user_id,
            approved_by: userId,
          },
          referenceId: payout.reference_id || `payout_${payout.id}`,
        });

        // Update payout
        await query(
          `UPDATE payouts
           SET razorpay_payout_id = $1,
               status = 'processing',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [razorpayPayout.id, payoutId]
        );

        return NextResponse.json({
          success: true,
          message: 'Payout approved and submitted to RazorpayX',
          razorpayPayoutId: razorpayPayout.id,
        });
      } catch (error) {
        console.error('Payout processing error:', error);
        return NextResponse.json(
          { success: false, error: `Failed to process payout: ${error.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Process payout error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process payout' },
      { status: 500 }
    );
  }
}

