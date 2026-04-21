/**
 * Admin Finance Payment Splits API Route
 * 
 * GET /api/admin/finance/payment-splits - List payment splits (superadmin only)
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/admin/finance/payment-splits
 * List payment splits with filters and pagination
 */
export async function GET(request) {
  try {
    const session = await requireSuperadmin(request);
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const settlementId = searchParams.get('settlementId');
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND ps.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (entityType) {
      whereClause += ` AND ps.entity_type = $${paramIndex}`;
      queryParams.push(entityType);
      paramIndex++;
    }

    if (entityId) {
      whereClause += ` AND ps.entity_id = $${paramIndex}`;
      queryParams.push(entityId);
      paramIndex++;
    }

    if (settlementId) {
      whereClause += ` AND ps.settlement_id = $${paramIndex}`;
      queryParams.push(settlementId);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM payment_splits ps ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get payment splits with related data
    const splitsResult = await query(
      `SELECT 
         ps.*,
         p.razorpay_payment_id,
         p.amount as payment_amount,
         p.status as payment_status,
         o.razorpay_order_id,
         o.item_type,
         o.item_id,
         o.final_amount as order_amount,
         o.user_id as order_user_id,
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

    const splits = splitsResult.rows.map(row => ({
      id: row.id,
      paymentId: row.payment_id,
      orderId: row.order_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      amount: parseFloat(row.amount),
      percentage: parseFloat(row.percentage),
      status: row.status,
      settlementId: row.settlement_id,
      settledAt: row.settled_at,
      razorpayPaymentId: row.razorpay_payment_id,
      paymentAmount: parseFloat(row.payment_amount),
      paymentStatus: row.payment_status,
      razorpayOrderId: row.razorpay_order_id,
      itemType: row.item_type,
      itemId: row.item_id,
      orderAmount: parseFloat(row.order_amount),
      userEmail: row.user_email,
      userName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      splits,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get payment splits error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get payment splits' },
      { status: 500 }
    );
  }
}

