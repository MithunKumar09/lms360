/**
 * Admin Finance Orders API Route
 * 
 * GET /api/admin/finance/orders - List orders (superadmin only)
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/admin/finance/orders
 * List orders with filters and pagination
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by order status (paid, pending, failed, etc.)
 * - fromDate: Start date (ISO date string)
 * - toDate: End date (ISO date string)
 * - itemType: Filter by item type (course, event, workshop)
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
    const itemType = searchParams.get('itemType');
    const userId = searchParams.get('userId');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND o.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

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

    if (itemType) {
      whereClause += ` AND o.item_type = $${paramIndex}`;
      queryParams.push(itemType);
      paramIndex++;
    }

    if (userId) {
      whereClause += ` AND o.user_id = $${paramIndex}`;
      queryParams.push(userId);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get orders with related data
    const ordersResult = await query(
      `SELECT 
         o.id,
         o.razorpay_order_id,
         o.status,
         o.item_type,
         o.item_id,
         o.user_id,
         o.final_amount,
         o.currency,
         o.created_at,
         o.updated_at,
         u.email as user_email,
         u.first_name,
         u.last_name,
         -- Course title (if item_type is 'course')
         CASE 
           WHEN o.item_type = 'course' THEN c.title
           WHEN o.item_type = 'event' THEN e.title
           WHEN o.item_type = 'workshop' THEN w.title
           ELSE NULL
         END as item_title,
         -- Payment info
         p.razorpay_payment_id,
         p.amount as payment_amount,
         p.status as payment_status,
         p.method as payment_method,
         p.captured_at
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       LEFT JOIN courses c ON o.item_id = c.id AND o.item_type = 'course'
       LEFT JOIN events e ON o.item_id = e.id AND o.item_type = 'event'
       LEFT JOIN workshops w ON o.item_id = w.id AND o.item_type = 'workshop'
       LEFT JOIN payments p ON o.id = p.order_id AND p.status = 'captured'
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const orders = ordersResult.rows.map(row => ({
      id: row.id,
      razorpayOrderId: row.razorpay_order_id,
      status: row.status,
      itemType: row.item_type,
      itemId: row.item_id,
      itemTitle: row.item_title,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.user_email,
      finalAmount: parseFloat(row.final_amount || 0),
      currency: row.currency,
      paymentId: row.razorpay_payment_id,
      paymentAmount: row.payment_amount ? parseFloat(row.payment_amount) : null,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method,
      paymentCapturedAt: row.captured_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get orders' },
      { status: 500 }
    );
  }
}

