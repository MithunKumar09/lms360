/**
 * Admin Finance Revenue API Route
 * 
 * GET /api/admin/finance/revenue - Get revenue analytics (superadmin only)
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/admin/finance/revenue
 * Get revenue analytics with different grouping options
 * 
 * Query params:
 * - period: Time period grouping (daily, weekly, monthly) - default: daily
 * - groupBy: Group by option (period, course, vendor) - default: period
 * - fromDate: Start date (ISO date string)
 * - toDate: End date (ISO date string)
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);

    const period = searchParams.get('period') || 'daily'; // daily, weekly, monthly
    const groupBy = searchParams.get('groupBy') || 'period'; // period, course, vendor
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    let whereClause = "WHERE o.status = 'paid'";
    const queryParams = [];
    let paramIndex = 1;

    if (fromDate) {
      whereClause += ` AND o.created_at >= $${paramIndex}`;
      queryParams.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      whereClause += ` AND o.created_at <= $${paramIndex}`;
      queryParams.push(toDate + ' 23:59:59');
      paramIndex++;
    }

    let revenueData = [];
    let summary = null;

    if (groupBy === 'period') {
      // Revenue by time period
      let dateFormat;
      switch (period) {
        case 'weekly':
          dateFormat = "DATE_TRUNC('week', o.created_at)";
          break;
        case 'monthly':
          dateFormat = "DATE_TRUNC('month', o.created_at)";
          break;
        case 'daily':
        default:
          dateFormat = "DATE(o.created_at)";
          break;
      }

      const periodQuery = `
        SELECT 
          ${dateFormat} as period,
          SUM(o.final_amount) as revenue,
          COUNT(*) as order_count,
          COUNT(DISTINCT o.user_id) as customer_count
        FROM orders o
        ${whereClause}
        GROUP BY ${dateFormat}
        ORDER BY period DESC
      `;

      const periodResult = await query(periodQuery, queryParams);
      revenueData = periodResult.rows.map(row => ({
        period: row.period,
        revenue: parseFloat(row.revenue || 0),
        orderCount: parseInt(row.order_count || 0, 10),
        customerCount: parseInt(row.customer_count || 0, 10),
      }));
    } else if (groupBy === 'course') {
      // Revenue by course
      const courseQuery = `
        SELECT 
          o.item_id as course_id,
          c.title as course_title,
          SUM(o.final_amount) as revenue,
          COUNT(*) as enrollment_count,
          COUNT(DISTINCT o.user_id) as student_count
        FROM orders o
        JOIN courses c ON o.item_id = c.id
        ${whereClause} AND o.item_type = 'course'
        GROUP BY o.item_id, c.title
        ORDER BY revenue DESC
        LIMIT 50
      `;

      const courseResult = await query(courseQuery, queryParams);
      revenueData = courseResult.rows.map(row => ({
        courseId: row.course_id,
        courseTitle: row.course_title,
        revenue: parseFloat(row.revenue || 0),
        enrollmentCount: parseInt(row.enrollment_count || 0, 10),
        studentCount: parseInt(row.student_count || 0, 10),
      }));
    } else if (groupBy === 'vendor') {
      // Revenue by vendor (from payment_splits)
      const vendorQuery = `
        SELECT 
          ps.entity_id as vendor_id,
          u.email as vendor_email,
          CONCAT(u.first_name, ' ', u.last_name) as vendor_name,
          SUM(ps.amount) as vendor_revenue,
          COUNT(DISTINCT ps.order_id) as order_count
        FROM payment_splits ps
        JOIN orders o ON ps.order_id = o.id
        LEFT JOIN users u ON ps.entity_id = u.id
        ${whereClause} AND ps.entity_type = 'vendor'
        GROUP BY ps.entity_id, u.email, u.first_name, u.last_name
        ORDER BY vendor_revenue DESC
        LIMIT 50
      `;

      const vendorResult = await query(vendorQuery, queryParams);
      revenueData = vendorResult.rows.map(row => ({
        vendorId: row.vendor_id,
        vendorEmail: row.vendor_email,
        vendorName: row.vendor_name?.trim() || row.vendor_email,
        revenue: parseFloat(row.vendor_revenue || 0),
        orderCount: parseInt(row.order_count || 0, 10),
      }));
    }

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        SUM(o.final_amount) as total_revenue,
        COUNT(*) as total_orders,
        COUNT(DISTINCT o.user_id) as total_customers,
        AVG(o.final_amount) as average_order_value
      FROM orders o
      ${whereClause}
    `;

    const summaryResult = await query(summaryQuery, queryParams);
    const summaryRow = summaryResult.rows[0];

    summary = {
      totalRevenue: parseFloat(summaryRow.total_revenue || 0),
      totalOrders: parseInt(summaryRow.total_orders || 0, 10),
      totalCustomers: parseInt(summaryRow.total_customers || 0, 10),
      averageOrderValue: parseFloat(summaryRow.average_order_value || 0),
    };

    return NextResponse.json({
      success: true,
      groupBy,
      period: groupBy === 'period' ? period : null,
      data: revenueData,
      summary,
    });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get revenue analytics' },
      { status: 500 }
    );
  }
}

