/**
 * Reconciliation Reports API Route
 * 
 * GET /api/admin/finance/reconciliation/reports - Get reconciliation analytics and reports
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/admin/finance/reconciliation/reports
 * Get reconciliation analytics and reports
 * 
 * Query Parameters:
 * - from: Start date (ISO format, optional)
 * - to: End date (ISO format, optional)
 * - period: Time period ('7days', '30days', '90days', 'all', optional, default: '30days')
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);
    
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const period = searchParams.get('period') || '30days';

    // Calculate date range based on period
    let dateFrom, dateTo;
    if (from && to) {
      dateFrom = new Date(from);
      dateTo = new Date(to);
    } else {
      dateTo = new Date();
      dateTo.setHours(23, 59, 59, 999);
      
      switch (period) {
        case '7days':
          dateFrom = new Date(dateTo);
          dateFrom.setDate(dateFrom.getDate() - 7);
          break;
        case '30days':
          dateFrom = new Date(dateTo);
          dateFrom.setDate(dateFrom.getDate() - 30);
          break;
        case '90days':
          dateFrom = new Date(dateTo);
          dateFrom.setDate(dateFrom.getDate() - 90);
          break;
        case 'all':
        default:
          dateFrom = null;
          break;
      }
    }

    // Build date filter
    let dateFilter = '';
    const queryParams = [];
    let paramIndex = 1;

    if (dateFrom) {
      dateFilter += ` AND s.settled_at >= $${paramIndex}`;
      queryParams.push(dateFrom.toISOString());
      paramIndex++;
    }

    if (dateTo) {
      dateFilter += ` AND s.settled_at <= $${paramIndex}`;
      queryParams.push(dateTo.toISOString());
      paramIndex++;
    }

    // Get total settlements
    const totalSettlementsResult = await query(
      `SELECT COUNT(*) as total
       FROM settlements s
       WHERE 1=1 ${dateFilter}`,
      queryParams
    );
    const totalSettlements = parseInt(totalSettlementsResult.rows[0]?.total || 0, 10);

    // Get reconciled settlements
    const reconciledResult = await query(
      `SELECT COUNT(*) as total
       FROM settlements s
       WHERE s.reconciled_at IS NOT NULL ${dateFilter}`,
      queryParams
    );
    const reconciledCount = parseInt(reconciledResult.rows[0]?.total || 0, 10);

    // Get settlements with mismatches
    const mismatchesResult = await query(
      `SELECT COUNT(*) as total
       FROM reconciliation_exceptions re
       JOIN settlements s ON re.settlement_id = s.id
       WHERE re.status = 'open' ${dateFilter}`,
      queryParams
    );
    const mismatchesCount = parseInt(mismatchesResult.rows[0]?.total || 0, 10);

    // Calculate success rate
    const successRate = totalSettlements > 0 
      ? ((reconciledCount / totalSettlements) * 100).toFixed(2)
      : 0;

    // Get total settlement amount
    const totalAmountResult = await query(
      `SELECT COALESCE(SUM(s.amount), 0) as total_amount
       FROM settlements s
       WHERE 1=1 ${dateFilter}`,
      queryParams
    );
    const totalAmount = parseFloat(totalAmountResult.rows[0]?.total_amount || 0);

    // Get total reconciled amount
    const reconciledAmountResult = await query(
      `SELECT COALESCE(SUM(s.amount), 0) as total_amount
       FROM settlements s
       WHERE s.reconciled_at IS NOT NULL ${dateFilter}`,
      queryParams
    );
    const reconciledAmount = parseFloat(reconciledAmountResult.rows[0]?.total_amount || 0);

    // Get total mismatch amount
    const mismatchAmountResult = await query(
      `SELECT COALESCE(SUM(ABS(re.expected_amount - re.actual_amount)), 0) as total_mismatch
       FROM reconciliation_exceptions re
       JOIN settlements s ON re.settlement_id = s.id
       WHERE re.status = 'open' ${dateFilter}`,
      queryParams
    );
    const mismatchAmount = parseFloat(mismatchAmountResult.rows[0]?.total_mismatch || 0);

    // Get daily reconciliation trends (last 30 days by default)
    const trendsDateFrom = dateFrom || new Date();
    if (!dateFrom) {
      trendsDateFrom.setDate(trendsDateFrom.getDate() - 30);
    }
    const trendsResult = await query(
      `SELECT 
         DATE(s.settled_at) as date,
         COUNT(*) as total_settlements,
         COUNT(CASE WHEN s.reconciled_at IS NOT NULL THEN 1 END) as reconciled_count,
         COUNT(CASE WHEN EXISTS (
           SELECT 1 FROM reconciliation_exceptions re 
           WHERE re.settlement_id = s.id AND re.status = 'open'
         ) THEN 1 END) as mismatch_count,
         COALESCE(SUM(s.amount), 0) as total_amount
       FROM settlements s
       WHERE s.settled_at >= $${paramIndex}
       GROUP BY DATE(s.settled_at)
       ORDER BY DATE(s.settled_at) DESC
       LIMIT 30`,
      [...queryParams, trendsDateFrom.toISOString()]
    );

    const trends = trendsResult.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      totalSettlements: parseInt(row.total_settlements, 10),
      reconciledCount: parseInt(row.reconciled_count, 10),
      mismatchCount: parseInt(row.mismatch_count, 10),
      totalAmount: parseFloat(row.total_amount),
      successRate: row.total_settlements > 0 
        ? ((parseInt(row.reconciled_count, 10) / parseInt(row.total_settlements, 10)) * 100).toFixed(2)
        : 0,
    }));

    // Get recent reconciliation activity (last 10)
    const recentActivityResult = await query(
      `SELECT 
         s.id,
         s.razorpay_settlement_id,
         s.amount,
         s.settled_at,
         s.reconciled_at,
         CASE WHEN EXISTS (
           SELECT 1 FROM reconciliation_exceptions re 
           WHERE re.settlement_id = s.id AND re.status = 'open'
         ) THEN true ELSE false END as has_mismatch
       FROM settlements s
       WHERE 1=1 ${dateFilter}
       ORDER BY s.settled_at DESC
       LIMIT 10`,
      queryParams
    );

    const recentActivity = recentActivityResult.rows.map(row => ({
      id: row.id,
      settlementId: row.razorpay_settlement_id,
      amount: parseFloat(row.amount),
      settledAt: row.settled_at,
      reconciledAt: row.reconciled_at,
      hasMismatch: row.has_mismatch,
      status: row.reconciled_at ? 'reconciled' : (row.has_mismatch ? 'mismatch' : 'pending'),
    }));

    // Get exception status distribution
    const exceptionStatusResult = await query(
      `SELECT 
         re.status,
         COUNT(*) as count
       FROM reconciliation_exceptions re
       JOIN settlements s ON re.settlement_id = s.id
       WHERE 1=1 ${dateFilter}
       GROUP BY re.status`,
      queryParams
    );

    const exceptionStatusDistribution = exceptionStatusResult.rows.map(row => ({
      status: row.status,
      count: parseInt(row.count, 10),
    }));

    return NextResponse.json({
      success: true,
      report: {
        summary: {
          totalSettlements,
          reconciledCount,
          mismatchesCount,
          pendingCount: totalSettlements - reconciledCount - mismatchesCount,
          successRate: parseFloat(successRate),
          totalAmount,
          reconciledAmount,
          mismatchAmount,
          reconciliationRate: totalSettlements > 0 
            ? ((reconciledCount / totalSettlements) * 100).toFixed(2)
            : 0,
        },
        trends,
        recentActivity,
        exceptionStatusDistribution,
        dateRange: {
          from: dateFrom ? dateFrom.toISOString() : null,
          to: dateTo ? dateTo.toISOString() : null,
          period,
        },
      },
    });
  } catch (error) {
    console.error('Get reconciliation reports error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get reconciliation reports' },
      { status: 500 }
    );
  }
}
