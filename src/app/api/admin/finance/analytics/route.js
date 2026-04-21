/**
 * Payment Analytics API Route
 * 
 * GET /api/admin/finance/analytics - Get comprehensive payment analytics
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/admin/finance/analytics
 * Get payment analytics including revenue trends, payment methods, and refund rates
 * 
 * Query Parameters:
 * - from: Start date (ISO format, optional)
 * - to: End date (ISO format, optional)
 * - period: Time period ('7days', '30days', '90days', '1year', 'all', optional, default: '30days')
 * - groupBy: Grouping interval ('day', 'week', 'month', optional, default: 'day')
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);
    
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const period = searchParams.get('period') || '30days';
    const groupBy = searchParams.get('groupBy') || 'day';

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
        case '1year':
          dateFrom = new Date(dateTo);
          dateFrom.setFullYear(dateFrom.getFullYear() - 1);
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
      dateFilter += ` AND o.created_at >= $${paramIndex}`;
      queryParams.push(dateFrom.toISOString());
      paramIndex++;
    }

    if (dateTo) {
      dateFilter += ` AND o.created_at <= $${paramIndex}`;
      queryParams.push(dateTo.toISOString());
      paramIndex++;
    }

    // Determine date truncation based on groupBy
    let dateTrunc = 'day';
    switch (groupBy) {
      case 'week':
        dateTrunc = 'week';
        break;
      case 'month':
        dateTrunc = 'month';
        break;
      case 'day':
      default:
        dateTrunc = 'day';
        break;
    }

    // Revenue trends over time
    const revenueTrendsQuery = `
      SELECT 
        DATE_TRUNC('${dateTrunc}', o.created_at) as period,
        COUNT(*) as order_count,
        COUNT(*) FILTER (WHERE o.status = 'paid') as paid_order_count,
        COALESCE(SUM(o.final_amount) FILTER (WHERE o.status = 'paid'), 0) as revenue,
        COUNT(DISTINCT o.user_id) as unique_customers
      FROM orders o
      WHERE 1=1 ${dateFilter}
      GROUP BY DATE_TRUNC('${dateTrunc}', o.created_at)
      ORDER BY period ASC
    `;

    const revenueTrendsResult = await query(revenueTrendsQuery, queryParams);
    
    const revenueTrends = revenueTrendsResult.rows.map(row => ({
      period: row.period.toISOString(),
      orderCount: parseInt(row.order_count, 10),
      paidOrderCount: parseInt(row.paid_order_count, 10),
      revenue: parseFloat(row.revenue),
      uniqueCustomers: parseInt(row.unique_customers, 10),
    }));

    // Payment method distribution
    let paymentMethodFilter = '';
    const paymentMethodParams = [];
    let paymentMethodParamIndex = 1;

    if (dateFrom) {
      paymentMethodFilter += ` AND p.created_at >= $${paymentMethodParamIndex}`;
      paymentMethodParams.push(dateFrom.toISOString());
      paymentMethodParamIndex++;
    }

    if (dateTo) {
      paymentMethodFilter += ` AND p.created_at <= $${paymentMethodParamIndex}`;
      paymentMethodParams.push(dateTo.toISOString());
      paymentMethodParamIndex++;
    }

    const paymentMethodQuery = `
      SELECT 
        p.method,
        COUNT(*) as payment_count,
        COALESCE(SUM(p.amount), 0) as total_amount,
        COUNT(*) FILTER (WHERE p.status = 'captured') as successful_count,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'captured'), 0) as successful_amount,
        COUNT(*) FILTER (WHERE p.status = 'failed') as failed_count
      FROM payments p
      WHERE p.method IS NOT NULL ${paymentMethodFilter}
      GROUP BY p.method
      ORDER BY total_amount DESC
    `;

    const paymentMethodResult = await query(paymentMethodQuery, paymentMethodParams);
    
    const paymentMethods = paymentMethodResult.rows.map(row => ({
      method: row.method,
      paymentCount: parseInt(row.payment_count, 10),
      totalAmount: parseFloat(row.total_amount),
      successfulCount: parseInt(row.successful_count, 10),
      successfulAmount: parseFloat(row.successful_amount),
      failedCount: parseInt(row.failed_count, 10),
      successRate: row.payment_count > 0 
        ? ((row.successful_count / row.payment_count) * 100).toFixed(2)
        : 0,
    }));

    // Refund analytics
    let refundFilter = '';
    const refundParams = [];
    let refundParamIndex = 1;

    if (dateFrom) {
      refundFilter += ` AND r.created_at >= $${refundParamIndex}`;
      refundParams.push(dateFrom.toISOString());
      refundParamIndex++;
    }

    if (dateTo) {
      refundFilter += ` AND r.created_at <= $${refundParamIndex}`;
      refundParams.push(dateTo.toISOString());
      refundParamIndex++;
    }

    const refundAnalyticsQuery = `
      SELECT 
        COUNT(*) as total_refunds,
        COALESCE(SUM(r.amount), 0) as total_refund_amount,
        COUNT(*) FILTER (WHERE r.status = 'processed') as processed_refunds,
        COALESCE(SUM(r.amount) FILTER (WHERE r.status = 'processed'), 0) as processed_refund_amount,
        COUNT(*) FILTER (WHERE r.status = 'pending') as pending_refunds,
        COUNT(*) FILTER (WHERE r.status = 'failed') as failed_refunds
      FROM refunds r
      WHERE 1=1 ${refundFilter}
    `;

    const refundAnalyticsResult = await query(refundAnalyticsQuery, refundParams);
    const refundStats = refundAnalyticsResult.rows[0] || {};

    // Calculate total revenue and refund rate
    const totalRevenue = revenueTrends.reduce((sum, trend) => sum + trend.revenue, 0);
    const totalRefundAmount = parseFloat(refundStats.total_refund_amount || 0);
    const refundRate = totalRevenue > 0 
      ? ((totalRefundAmount / totalRevenue) * 100).toFixed(2)
      : 0;

    // Order status distribution
    const orderStatusQuery = `
      SELECT 
        o.status,
        COUNT(*) as order_count,
        COALESCE(SUM(o.final_amount), 0) as total_amount
      FROM orders o
      WHERE 1=1 ${dateFilter}
      GROUP BY o.status
      ORDER BY order_count DESC
    `;

    const orderStatusResult = await query(orderStatusQuery, queryParams);
    
    const orderStatusDistribution = orderStatusResult.rows.map(row => ({
      status: row.status,
      orderCount: parseInt(row.order_count, 10),
      totalAmount: parseFloat(row.total_amount),
    }));

    // Average order value over time
    const avgOrderValueTrends = revenueTrends.map(trend => ({
      period: trend.period,
      avgOrderValue: trend.paidOrderCount > 0 
        ? (trend.revenue / trend.paidOrderCount)
        : 0,
      orderCount: trend.paidOrderCount,
    }));

    // Payment success rate over time
    let paymentSuccessFilter = '';
    const paymentSuccessParams = [];
    let paymentSuccessParamIndex = 1;

    if (dateFrom) {
      paymentSuccessFilter += ` AND p.created_at >= $${paymentSuccessParamIndex}`;
      paymentSuccessParams.push(dateFrom.toISOString());
      paymentSuccessParamIndex++;
    }

    if (dateTo) {
      paymentSuccessFilter += ` AND p.created_at <= $${paymentSuccessParamIndex}`;
      paymentSuccessParams.push(dateTo.toISOString());
      paymentSuccessParamIndex++;
    }

    const paymentSuccessTrendsQuery = `
      SELECT 
        DATE_TRUNC('${dateTrunc}', p.created_at) as period,
        COUNT(*) as total_payments,
        COUNT(*) FILTER (WHERE p.status = 'captured') as successful_payments,
        COUNT(*) FILTER (WHERE p.status = 'failed') as failed_payments
      FROM payments p
      WHERE 1=1 ${paymentSuccessFilter}
      GROUP BY DATE_TRUNC('${dateTrunc}', p.created_at)
      ORDER BY period ASC
    `;

    const paymentSuccessTrendsResult = await query(paymentSuccessTrendsQuery, paymentSuccessParams);
    
    const paymentSuccessTrends = paymentSuccessTrendsResult.rows.map(row => ({
      period: row.period.toISOString(),
      totalPayments: parseInt(row.total_payments, 10),
      successfulPayments: parseInt(row.successful_payments, 10),
      failedPayments: parseInt(row.failed_payments, 10),
      successRate: row.total_payments > 0 
        ? ((row.successful_payments / row.total_payments) * 100).toFixed(2)
        : 0,
    }));

    // Top customers by revenue
    const topCustomersQuery = `
      SELECT 
        o.user_id,
        u.email,
        u.first_name,
        u.last_name,
        COUNT(*) as order_count,
        COALESCE(SUM(o.final_amount) FILTER (WHERE o.status = 'paid'), 0) as total_revenue
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.status = 'paid' ${dateFilter}
      GROUP BY o.user_id, u.email, u.first_name, u.last_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `;

    const topCustomersResult = await query(topCustomersQuery, queryParams);
    
    const topCustomers = topCustomersResult.rows.map(row => ({
      userId: row.user_id,
      email: row.email,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
      orderCount: parseInt(row.order_count, 10),
      totalRevenue: parseFloat(row.total_revenue),
    }));

    return NextResponse.json({
      success: true,
      analytics: {
        summary: {
          totalRevenue,
          totalOrders: revenueTrends.reduce((sum, t) => sum + t.orderCount, 0),
          paidOrders: revenueTrends.reduce((sum, t) => sum + t.paidOrderCount, 0),
          totalRefunds: parseInt(refundStats.total_refunds || 0, 10),
          totalRefundAmount,
          refundRate: parseFloat(refundRate),
          averageOrderValue: revenueTrends.reduce((sum, t) => sum + t.paidOrderCount, 0) > 0
            ? (totalRevenue / revenueTrends.reduce((sum, t) => sum + t.paidOrderCount, 0))
            : 0,
          uniqueCustomers: new Set(revenueTrends.map(t => t.uniqueCustomers)).size,
        },
        revenueTrends,
        paymentMethods,
        refundStats: {
          totalRefunds: parseInt(refundStats.total_refunds || 0, 10),
          totalRefundAmount,
          processedRefunds: parseInt(refundStats.processed_refunds || 0, 10),
          processedRefundAmount: parseFloat(refundStats.processed_refund_amount || 0),
          pendingRefunds: parseInt(refundStats.pending_refunds || 0, 10),
          failedRefunds: parseInt(refundStats.failed_refunds || 0, 10),
        },
        orderStatusDistribution,
        avgOrderValueTrends,
        paymentSuccessTrends,
        topCustomers,
        dateRange: {
          from: dateFrom ? dateFrom.toISOString() : null,
          to: dateTo ? dateTo.toISOString() : null,
          period,
          groupBy,
        },
      },
    });
  } catch (error) {
    console.error('Get payment analytics error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get payment analytics' },
      { status: 500 }
    );
  }
}
