/**
 * Admin Finance Vendor KYC API Route
 * 
 * GET /api/admin/finance/vendor-kyc - List vendor KYC status (superadmin only)
 * PATCH /api/admin/finance/vendor-kyc - Update vendor KYC status (superadmin only)
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/admin/finance/vendor-kyc
 * List vendors with KYC status
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const kycStatus = searchParams.get('kycStatus');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (kycStatus) {
      whereClause += ` AND va.kyc_status = $${paramIndex}`;
      queryParams.push(kycStatus);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM vendor_accounts va
       JOIN users u ON va.user_id = u.id
       ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get vendors with KYC status
    const vendorsResult = await query(
      `SELECT 
         va.*,
         u.id as user_id,
         u.email,
         u.first_name,
         u.last_name,
         u.phone,
         (SELECT withdrawable_amount FROM vendor_balances WHERE vendor_account_id = va.id ORDER BY snapshot_at DESC LIMIT 1) as withdrawable_balance
       FROM vendor_accounts va
       JOIN users u ON va.user_id = u.id
       ${whereClause}
       ORDER BY va.kyc_submitted_at DESC NULLS LAST, va.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const vendors = vendorsResult.rows.map(row => ({
      vendorAccountId: row.id,
      userId: row.user_id,
      email: row.email,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      phone: row.phone,
      kycStatus: row.kyc_status,
      kycSubmittedAt: row.kyc_submitted_at,
      kycVerifiedAt: row.kyc_verified_at,
      kycRejectionReason: row.kyc_rejection_reason,
      fundAccountId: row.fund_account_id,
      linkedAccountId: row.linked_account_id,
      withdrawableBalance: parseFloat(row.withdrawable_balance) || 0,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      vendors,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get vendor KYC error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get vendor KYC' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/finance/vendor-kyc
 * Update vendor KYC status
 * 
 * Request Body:
 * {
 *   "vendorAccountId": "uuid",
 *   "kycStatus": "verified" | "rejected" | "pending",
 *   "rejectionReason": "string" (optional, required if rejected)
 * }
 */
export async function PATCH(request) {
  try {
    const session = await requireSuperadmin(request);
    const userId = session.user.id;
    const body = await request.json();
    const { vendorAccountId, kycStatus, rejectionReason } = body;

    if (!vendorAccountId || !kycStatus) {
      return NextResponse.json(
        { success: false, error: 'vendorAccountId and kycStatus are required' },
        { status: 400 }
      );
    }

    if (!['verified', 'rejected', 'pending'].includes(kycStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid kycStatus. Must be verified, rejected, or pending' },
        { status: 400 }
      );
    }

    if (kycStatus === 'rejected' && !rejectionReason) {
      return NextResponse.json(
        { success: false, error: 'rejectionReason is required when rejecting KYC' },
        { status: 400 }
      );
    }

    // Update KYC status
    const updateFields = ['kyc_status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const updateParams = [kycStatus];
    let paramIndex = 2;

    if (kycStatus === 'verified') {
      updateFields.push(`kyc_verified_at = CURRENT_TIMESTAMP`);
      updateFields.push(`kyc_rejection_reason = NULL`);
    } else if (kycStatus === 'rejected') {
      updateFields.push(`kyc_rejection_reason = $${paramIndex}`);
      updateParams.push(rejectionReason);
      paramIndex++;
    }

    updateParams.push(vendorAccountId);

    await query(
      `UPDATE vendor_accounts
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}`,
      updateParams
    );

    return NextResponse.json({
      success: true,
      message: `KYC status updated to ${kycStatus}`,
    });
  } catch (error) {
    console.error('Update vendor KYC error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update KYC status' },
      { status: 500 }
    );
  }
}

