/**
 * Admin Finance Statistics API Route
 * 
 * GET /api/admin/finance/statistics - Get finance statistics (superadmin only)
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/admin/finance/statistics
 * Get finance statistics including revenue, orders, payments, and customers
 * 
 * Query params:
 * - fromDate (optional): Start date for statistics (ISO date string)
 * - toDate (optional): End date for statistics (ISO date string)
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);

    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    let whereClause = '';
    const queryParams = [];
    let paramIndex = 1;

    if (fromDate || toDate) {
      whereClause = 'WHERE 1=1';
      if (fromDate) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        queryParams.push(fromDate);
        paramIndex++;
      }
      if (toDate) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        queryParams.push(toDate + ' 23:59:59'); // Include entire end date
        paramIndex++;
      }
    }

    // Get total revenue (sum of paid orders)
    // Note: order_status enum values: 'created', 'paid', 'failed', 'cancelled', 'expired'
    const revenueQuery = `
      SELECT 
        COALESCE(SUM(final_amount), 0) as total_revenue,
        COUNT(*) FILTER (WHERE status = 'paid') as paid_orders_count,
        COUNT(*) FILTER (WHERE status = 'created') as created_orders_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_orders_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders_count,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_orders_count,
        COUNT(*) as total_orders_count,
        COUNT(DISTINCT user_id) as total_customers
      FROM orders
      ${whereClause}
    `;

    const revenueResult = await query(revenueQuery, queryParams);

    // Get total payments count
    const paymentsQuery = `
      SELECT COUNT(*) as total_payments_count
      FROM payments
      ${whereClause.replace(/created_at/g, 'created_at')}
    `;

    // Adjust payments query params (need to handle date filtering separately)
    let paymentsWhereClause = '';
    const paymentsParams = [];
    let paymentsParamIndex = 1;

    if (fromDate || toDate) {
      paymentsWhereClause = 'WHERE 1=1';
      if (fromDate) {
        paymentsWhereClause += ` AND created_at >= $${paymentsParamIndex}`;
        paymentsParams.push(fromDate);
        paymentsParamIndex++;
      }
      if (toDate) {
        paymentsWhereClause += ` AND created_at <= $${paymentsParamIndex}`;
        paymentsParams.push(toDate + ' 23:59:59');
        paymentsParamIndex++;
      }
    }

    const paymentsResult = await query(
      `SELECT COUNT(*) as total_payments_count FROM payments ${paymentsWhereClause}`,
      paymentsParams
    );

    const stats = revenueResult.rows[0];
    const paymentsStats = paymentsResult.rows[0];

    // Get payment splits statistics by entity type
    let splitsWhereClause = '';
    const splitsParams = [];
    let splitsParamIndex = 1;

    if (fromDate || toDate) {
      splitsWhereClause = 'WHERE 1=1';
      if (fromDate) {
        splitsWhereClause += ` AND ps.created_at >= $${splitsParamIndex}`;
        splitsParams.push(fromDate);
        splitsParamIndex++;
      }
      if (toDate) {
        splitsWhereClause += ` AND ps.created_at <= $${splitsParamIndex}`;
        splitsParams.push(toDate + ' 23:59:59');
        splitsParamIndex++;
      }
    }

    // Get vendor payment splits statistics
    const vendorSplitsQuery = `
      SELECT 
        COALESCE(SUM(ps.amount), 0) as total_amount,
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN ps.status = 'settled' THEN ps.amount ELSE 0 END), 0) as settled_amount,
        COALESCE(SUM(CASE WHEN ps.status = 'pending' THEN ps.amount ELSE 0 END), 0) as pending_amount,
        COUNT(*) FILTER (WHERE ps.status = 'settled') as settled_count,
        COUNT(*) FILTER (WHERE ps.status = 'pending') as pending_count
      FROM payment_splits ps
      WHERE ps.entity_type = 'vendor'
      ${splitsWhereClause.replace(/ps\.created_at/g, 'ps.created_at')}
    `;

    // Get organization payment splits statistics
    const organizationSplitsQuery = `
      SELECT 
        COALESCE(SUM(ps.amount), 0) as total_amount,
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN ps.status = 'settled' THEN ps.amount ELSE 0 END), 0) as settled_amount,
        COALESCE(SUM(CASE WHEN ps.status = 'pending' THEN ps.amount ELSE 0 END), 0) as pending_amount,
        COUNT(*) FILTER (WHERE ps.status = 'settled') as settled_count,
        COUNT(*) FILTER (WHERE ps.status = 'pending') as pending_count
      FROM payment_splits ps
      WHERE ps.entity_type = 'organization'
      ${splitsWhereClause.replace(/ps\.created_at/g, 'ps.created_at')}
    `;

    // Get superadmin payment splits statistics
    const superadminSplitsQuery = `
      SELECT 
        COALESCE(SUM(ps.amount), 0) as total_amount,
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN ps.status = 'settled' THEN ps.amount ELSE 0 END), 0) as settled_amount,
        COALESCE(SUM(CASE WHEN ps.status = 'pending' THEN ps.amount ELSE 0 END), 0) as pending_amount,
        COUNT(*) FILTER (WHERE ps.status = 'settled') as settled_count,
        COUNT(*) FILTER (WHERE ps.status = 'pending') as pending_count
      FROM payment_splits ps
      WHERE ps.entity_type = 'superadmin'
      ${splitsWhereClause.replace(/ps\.created_at/g, 'ps.created_at')}
    `;

    // Get platform payment splits statistics
    const platformSplitsQuery = `
      SELECT 
        COALESCE(SUM(ps.amount), 0) as total_amount,
        COUNT(*) as total_count
      FROM payment_splits ps
      WHERE ps.entity_type = 'platform'
      ${splitsWhereClause.replace(/ps\.created_at/g, 'ps.created_at')}
    `;

    // Get settlement counts by entity type
    let settlementsWhereClause = '';
    const settlementsParams = [];
    let settlementsParamIndex = 1;

    if (fromDate || toDate) {
      settlementsWhereClause = 'WHERE 1=1';
      if (fromDate) {
        settlementsWhereClause += ` AND s.settled_at >= $${settlementsParamIndex}`;
        settlementsParams.push(fromDate);
        settlementsParamIndex++;
      }
      if (toDate) {
        settlementsWhereClause += ` AND s.settled_at <= $${settlementsParamIndex}`;
        settlementsParams.push(toDate + ' 23:59:59');
        settlementsParamIndex++;
      }
    }

    const settlementsQuery = `
      SELECT 
        ps.entity_type,
        COUNT(DISTINCT s.id) as settlement_count
      FROM settlements s
      JOIN payment_splits ps ON ps.settlement_id = s.id
      ${settlementsWhereClause}
      GROUP BY ps.entity_type
    `;

    // Execute all queries in parallel
    const [
      vendorSplitsResult,
      organizationSplitsResult,
      superadminSplitsResult,
      platformSplitsResult,
      settlementsResult,
    ] = await Promise.all([
      query(vendorSplitsQuery, splitsParams),
      query(organizationSplitsQuery, splitsParams),
      query(superadminSplitsQuery, splitsParams),
      query(platformSplitsQuery, splitsParams),
      query(settlementsQuery, settlementsParams),
    ]);

    const vendorSplits = vendorSplitsResult.rows[0] || {};
    const organizationSplits = organizationSplitsResult.rows[0] || {};
    const superadminSplits = superadminSplitsResult.rows[0] || {};
    const platformSplits = platformSplitsResult.rows[0] || {};

    // Process settlements by entity type
    const settlementsByEntity = {};
    settlementsResult.rows.forEach((row) => {
      settlementsByEntity[row.entity_type] = parseInt(row.settlement_count || 0, 10);
    });

    return NextResponse.json({
      success: true,
      statistics: {
        totalRevenue: parseFloat(stats.total_revenue || 0),
        totalOrders: parseInt(stats.total_orders_count || 0, 10),
        paidOrders: parseInt(stats.paid_orders_count || 0, 10),
        createdOrders: parseInt(stats.created_orders_count || 0, 10), // Orders created but not yet paid
        failedOrders: parseInt(stats.failed_orders_count || 0, 10),
        cancelledOrders: parseInt(stats.cancelled_orders_count || 0, 10),
        expiredOrders: parseInt(stats.expired_orders_count || 0, 10),
        totalPayments: parseInt(paymentsStats.total_payments_count || 0, 10),
        totalCustomers: parseInt(stats.total_customers || 0, 10),
        // Entity type breakdown
        byEntityType: {
          vendor: {
            totalAmount: parseFloat(vendorSplits.total_amount || 0),
            totalCount: parseInt(vendorSplits.total_count || 0, 10),
            settledAmount: parseFloat(vendorSplits.settled_amount || 0),
            pendingAmount: parseFloat(vendorSplits.pending_amount || 0),
            settledCount: parseInt(vendorSplits.settled_count || 0, 10),
            pendingCount: parseInt(vendorSplits.pending_count || 0, 10),
            settlementCount: settlementsByEntity.vendor || 0,
          },
          organization: {
            totalAmount: parseFloat(organizationSplits.total_amount || 0),
            totalCount: parseInt(organizationSplits.total_count || 0, 10),
            settledAmount: parseFloat(organizationSplits.settled_amount || 0),
            pendingAmount: parseFloat(organizationSplits.pending_amount || 0),
            settledCount: parseInt(organizationSplits.settled_count || 0, 10),
            pendingCount: parseInt(organizationSplits.pending_count || 0, 10),
            settlementCount: settlementsByEntity.organization || 0,
          },
          superadmin: {
            totalAmount: parseFloat(superadminSplits.total_amount || 0),
            totalCount: parseInt(superadminSplits.total_count || 0, 10),
            settledAmount: parseFloat(superadminSplits.settled_amount || 0),
            pendingAmount: parseFloat(superadminSplits.pending_amount || 0),
            settledCount: parseInt(superadminSplits.settled_count || 0, 10),
            pendingCount: parseInt(superadminSplits.pending_count || 0, 10),
            settlementCount: settlementsByEntity.superadmin || 0,
          },
          platform: {
            totalAmount: parseFloat(platformSplits.total_amount || 0),
            totalCount: parseInt(platformSplits.total_count || 0, 10),
          },
        },
      },
    });
  } catch (error) {
    console.error('Get finance statistics error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get finance statistics' },
      { status: 500 }
    );
  }
}

