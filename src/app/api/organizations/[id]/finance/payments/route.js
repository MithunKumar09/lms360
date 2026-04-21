/**
 * Organization Finance Payments API Route
 * 
 * GET /api/organizations/[id]/finance/payments - List organization payments
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/organizations/[id]/finance/payments
 * List organization payments with filters and pagination
 * 
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - status: Filter by payment status (optional)
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
    let whereClause = `WHERE ps.entity_type = 'organization' AND ps.entity_id = $1`;
    const queryParams = [orgId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND ps.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (from) {
      whereClause += ` AND ps.created_at >= $${paramIndex}`;
      queryParams.push(from);
      paramIndex++;
    }

    if (to) {
      whereClause += ` AND ps.created_at <= $${paramIndex}`;
      queryParams.push(to);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM payment_splits ps
       ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get payments with order and user information
    const paymentsResult = await query(
      `SELECT 
         ps.id,
         ps.amount,
         ps.status,
         ps.created_at,
         ps.settled_at,
         p.id as payment_id,
         p.razorpay_payment_id,
         p.status as payment_status,
         p.amount as payment_amount,
         o.id as order_id,
         o.user_id,
         o.item_type,
         o.item_id,
         o.final_amount as order_amount,
         u.email as user_email,
         u.first_name,
         u.last_name
       FROM payment_splits ps
       JOIN payments p ON ps.payment_id = p.id
       JOIN orders o ON ps.order_id = o.id
       LEFT JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY ps.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const payments = paymentsResult.rows.map(row => ({
      id: row.id,
      amount: parseFloat(row.amount),
      status: row.status,
      createdAt: row.created_at,
      settledAt: row.settled_at,
      payment: {
        id: row.payment_id,
        razorpayPaymentId: row.razorpay_payment_id,
        status: row.payment_status,
        amount: parseFloat(row.payment_amount),
      },
      order: {
        id: row.order_id,
        userId: row.user_id,
        itemType: row.item_type,
        itemId: row.item_id,
        amount: parseFloat(row.order_amount),
      },
      user: row.user_email ? {
        email: row.user_email,
        name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      } : null,
    }));

    return NextResponse.json({
      success: true,
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get organization payments error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get organization payments' },
      { status: 500 }
    );
  }
}

