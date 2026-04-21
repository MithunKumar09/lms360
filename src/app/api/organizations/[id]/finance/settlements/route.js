/**
 * Organization Finance Settlements API Route
 * 
 * GET /api/organizations/[id]/finance/settlements - List organization settlements
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/organizations/[id]/finance/settlements
 * List organization settlements with filters and pagination
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by settlement status (optional)
 * - from: Start date (ISO format, optional)
 * - to: End date (ISO format, optional)
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['admin', 'superadmin']);
    const { id: orgId } = params;
    const { searchParams } = new URL(request.url);
    
    // Verify organization access
    if (session.user.role !== 'superadmin' && session.user.orgId !== orgId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have access to this organization' },
        { status: 403 }
      );
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const offset = (page - 1) * limit;

    // Build filters
    let whereClause = `WHERE ps.entity_type = 'organization' AND ps.entity_id = $1 AND ps.settlement_id IS NOT NULL`;
    const queryParams = [orgId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND s.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (from) {
      whereClause += ` AND s.settled_at >= $${paramIndex}`;
      queryParams.push(from);
      paramIndex++;
    }

    if (to) {
      whereClause += ` AND s.settled_at <= $${paramIndex}`;
      queryParams.push(to);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(DISTINCT s.id) as total
       FROM settlements s
       JOIN payment_splits ps ON ps.settlement_id = s.id
       ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get settlements with organization split amounts
    const settlementsResult = await query(
      `SELECT 
         s.id,
         s.razorpay_settlement_id,
         s.amount as settlement_amount,
         s.currency,
         s.status,
         s.settled_at,
         s.settled_on,
         s.fees,
         s.tax,
         s.utr,
         COALESCE(SUM(ps.amount), 0) as organization_amount,
         COUNT(DISTINCT ps.payment_id) as payment_count
       FROM settlements s
       JOIN payment_splits ps ON ps.settlement_id = s.id
       ${whereClause}
       GROUP BY s.id, s.razorpay_settlement_id, s.amount, s.currency, s.status, 
                s.settled_at, s.settled_on, s.fees, s.tax, s.utr
       ORDER BY s.settled_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const settlements = settlementsResult.rows.map(row => ({
      id: row.id,
      razorpaySettlementId: row.razorpay_settlement_id,
      settlementAmount: parseFloat(row.settlement_amount),
      organizationAmount: parseFloat(row.organization_amount),
      currency: row.currency,
      status: row.status,
      settledAt: row.settled_at,
      settledOn: row.settled_on,
      fees: parseFloat(row.fees) || 0,
      tax: parseFloat(row.tax) || 0,
      utr: row.utr,
      paymentCount: parseInt(row.payment_count) || 0,
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
    console.error('Get organization settlements error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get organization settlements' },
      { status: 500 }
    );
  }
}

