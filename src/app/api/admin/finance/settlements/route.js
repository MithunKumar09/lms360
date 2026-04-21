/**
 * Admin Finance Settlements API Route
 * 
 * GET /api/admin/finance/settlements - List settlements (superadmin only)
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/admin/finance/settlements
 * List settlements with filters and pagination
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (fromDate) {
      whereClause += ` AND settled_on >= $${paramIndex}`;
      queryParams.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      whereClause += ` AND settled_on <= $${paramIndex}`;
      queryParams.push(toDate);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM settlements ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get settlements
    const settlementsResult = await query(
      `SELECT 
         s.*,
         (SELECT COUNT(*) FROM payment_splits WHERE settlement_id = s.id) as payment_count,
         (SELECT SUM(amount) FROM payment_splits WHERE settlement_id = s.id) as total_split_amount
       FROM settlements s
       ${whereClause}
       ORDER BY s.settled_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const settlements = settlementsResult.rows.map(row => ({
      id: row.id,
      razorpaySettlementId: row.razorpay_settlement_id,
      amount: parseFloat(row.amount),
      currency: row.currency,
      status: row.status,
      settledAt: row.settled_at,
      settledOn: row.settled_on,
      fees: parseFloat(row.fees),
      tax: parseFloat(row.tax),
      utr: row.utr,
      reconciledAt: row.reconciled_at,
      reconciledBy: row.reconciled_by,
      paymentCount: parseInt(row.payment_count, 10),
      totalSplitAmount: parseFloat(row.total_split_amount) || 0,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      settlements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get settlements error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get settlements' },
      { status: 500 }
    );
  }
}

