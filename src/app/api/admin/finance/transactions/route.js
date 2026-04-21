/**
 * Admin Finance Transactions API Route
 * 
 * GET /api/admin/finance/transactions - List payment transactions (superadmin only)
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/admin/finance/transactions
 * List payment transactions with filters and pagination
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by payment status (captured, failed, etc.)
 * - fromDate: Start date (ISO date string)
 * - toDate: End date (ISO date string)
 * - method: Filter by payment method (card, netbanking, upi, etc.)
 * - userId: Filter by user ID (optional)
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
    const method = searchParams.get('method');
    const userId = searchParams.get('userId');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (fromDate) {
      whereClause += ` AND p.created_at >= $${paramIndex}`;
      queryParams.push(fromDate);
      paramIndex++;
    }

    if (toDate) {
      whereClause += ` AND p.created_at <= $${paramIndex}`;
      queryParams.push(toDate + ' 23:59:59');
      paramIndex++;
    }

    if (method) {
      whereClause += ` AND p.method = $${paramIndex}`;
      queryParams.push(method);
      paramIndex++;
    }

    if (userId) {
      whereClause += ` AND o.user_id = $${paramIndex}`;
      queryParams.push(userId);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total 
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get transactions with related data
    const transactionsResult = await query(
      `SELECT 
         p.id,
         p.razorpay_payment_id,
         p.razorpay_order_id,
         p.amount,
         p.currency,
         p.status,
         p.method,
         p.captured_at,
         p.created_at,
         p.updated_at,
         -- Order info
         o.id as order_id,
         o.status as order_status,
         o.item_type,
         o.item_id,
         o.user_id,
         o.final_amount as order_amount,
         -- User info
         u.email as user_email,
         u.first_name,
         u.last_name,
         -- Item title
         CASE 
           WHEN o.item_type = 'course' THEN c.title
           WHEN o.item_type = 'event' THEN e.title
           WHEN o.item_type = 'workshop' THEN w.title
           ELSE NULL
         END as item_title
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN courses c ON o.item_id = c.id AND o.item_type = 'course'
       LEFT JOIN events e ON o.item_id = e.id AND o.item_type = 'event'
       LEFT JOIN workshops w ON o.item_id = w.id AND o.item_type = 'workshop'
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const transactions = transactionsResult.rows.map(row => ({
      id: row.id,
      razorpayPaymentId: row.razorpay_payment_id,
      razorpayOrderId: row.razorpay_order_id,
      amount: parseFloat(row.amount || 0),
      currency: row.currency,
      status: row.status,
      method: row.method,
      capturedAt: row.captured_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      order: {
        id: row.order_id,
        status: row.order_status,
        itemType: row.item_type,
        itemId: row.item_id,
        itemTitle: row.item_title,
        userId: row.user_id,
        userEmail: row.user_email,
        userName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.user_email,
        finalAmount: parseFloat(row.order_amount || 0),
      },
    }));

    return NextResponse.json({
      success: true,
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get transactions' },
      { status: 500 }
    );
  }
}

