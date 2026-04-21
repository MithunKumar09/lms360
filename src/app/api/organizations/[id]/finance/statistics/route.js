/**
 * Organization Finance Statistics API Route
 * 
 * GET /api/organizations/[id]/finance/statistics - Get organization finance statistics
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/organizations/[id]/finance/statistics
 * Get organization finance statistics
 * 
 * Query Parameters:
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

    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Build date filter
    let dateFilter = '';
    const queryParams = [orgId];
    let paramIndex = 2;

    if (from) {
      dateFilter += ` AND ps.created_at >= $${paramIndex}`;
      queryParams.push(from);
      paramIndex++;
    }

    if (to) {
      dateFilter += ` AND ps.created_at <= $${paramIndex}`;
      queryParams.push(to);
      paramIndex++;
    }

    // Get total revenue (sum of all organization payment splits)
    const revenueResult = await query(
      `SELECT 
         COALESCE(SUM(ps.amount), 0) as total_revenue,
         COUNT(DISTINCT ps.payment_id) as total_payments,
         COUNT(DISTINCT ps.order_id) as total_orders
       FROM payment_splits ps
       WHERE ps.entity_type = 'organization' 
         AND ps.entity_id = $1
         ${dateFilter}`,
      queryParams
    );

    const revenue = revenueResult.rows[0];

    // Get paid orders count
    const paidOrdersResult = await query(
      `SELECT COUNT(DISTINCT o.id) as paid_orders
       FROM orders o
       JOIN payment_splits ps ON ps.order_id = o.id
       WHERE ps.entity_type = 'organization' 
         AND ps.entity_id = $1
         AND o.status = 'paid'
         ${dateFilter}`,
      queryParams
    );

    // Get total settled amount
    const settledResult = await query(
      `SELECT COALESCE(SUM(ps.amount), 0) as total_settled
       FROM payment_splits ps
       WHERE ps.entity_type = 'organization' 
         AND ps.entity_id = $1
         AND ps.status = 'settled'
         ${dateFilter}`,
      queryParams
    );

    // Get pending amount
    const pendingResult = await query(
      `SELECT COALESCE(SUM(ps.amount), 0) as total_pending
       FROM payment_splits ps
       WHERE ps.entity_type = 'organization' 
         AND ps.entity_id = $1
         AND ps.status = 'pending'
         ${dateFilter}`,
      queryParams
    );

    return NextResponse.json({
      success: true,
      statistics: {
        totalRevenue: parseFloat(revenue.total_revenue) || 0,
        totalPayments: parseInt(revenue.total_payments) || 0,
        totalOrders: parseInt(revenue.total_orders) || 0,
        paidOrders: parseInt(paidOrdersResult.rows[0]?.paid_orders) || 0,
        totalSettled: parseFloat(settledResult.rows[0]?.total_settled) || 0,
        totalPending: parseFloat(pendingResult.rows[0]?.total_pending) || 0,
        dateRange: {
          from: from || null,
          to: to || null,
        },
      },
    });
  } catch (error) {
    console.error('Get organization statistics error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get organization statistics' },
      { status: 500 }
    );
  }
}

