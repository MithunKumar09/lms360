/**
 * Reconciliation Exception Detail API Route
 * 
 * GET /api/admin/finance/reconciliation/exceptions/[id] - Get exception details
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/admin/finance/reconciliation/exceptions/[id]
 * Get exception details with related payments
 */
export async function GET(request, { params }) {
  try {
    const session = await requireSuperadmin(request);
    
    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Exception ID is required',
        },
        { status: 400 }
      );
    }
    const exceptionId = params.id;

    // Get exception with settlement info
    const exceptionResult = await query(
      `SELECT 
         re.*,
         s.razorpay_settlement_id,
         s.amount as settlement_amount,
         s.settled_at,
         s.settled_on,
         s.currency,
         u.email as resolved_by_email
       FROM reconciliation_exceptions re
       JOIN settlements s ON re.settlement_id = s.id
       LEFT JOIN users u ON re.resolved_by = u.id
       WHERE re.id = $1`,
      [exceptionId]
    );

    if (exceptionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Exception not found' },
        { status: 404 }
      );
    }

    const exception = exceptionResult.rows[0];

    // Get related payments for this settlement
    const paymentsResult = await query(
      `SELECT 
         p.*,
         o.item_type,
         o.item_id,
         o.user_id,
         ps.settlement_id,
         ps.status as split_status
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       LEFT JOIN payment_splits ps ON ps.payment_id = p.id AND ps.settlement_id = $1
       WHERE p.status = 'captured'
         AND p.captured_at >= $2::date - INTERVAL '7 days'
         AND p.captured_at <= $2::date + INTERVAL '1 day'
       ORDER BY p.captured_at DESC`,
      [exception.settlement_id, exception.settled_on]
    );

    const exceptionData = {
      id: exception.id,
      settlementId: exception.settlement_id,
      razorpaySettlementId: exception.razorpay_settlement_id,
      expectedAmount: parseFloat(exception.expected_amount),
      actualAmount: parseFloat(exception.actual_amount),
      difference: parseFloat(exception.difference),
      status: exception.status,
      exceptionType: exception.exception_type,
      description: exception.description,
      notes: exception.notes,
      resolvedAt: exception.resolved_at,
      resolvedBy: exception.resolved_by,
      resolvedByEmail: exception.resolved_by_email,
      resolutionNotes: exception.resolution_notes,
      settlement: {
        id: exception.settlement_id,
        razorpaySettlementId: exception.razorpay_settlement_id,
        amount: parseFloat(exception.settlement_amount),
        currency: exception.currency,
        settledAt: exception.settled_at,
        settledOn: exception.settled_on,
      },
      relatedPayments: paymentsResult.rows.map(p => ({
        id: p.id,
        razorpayPaymentId: p.razorpay_payment_id,
        amount: parseFloat(p.amount),
        currency: p.currency,
        status: p.status,
        method: p.method,
        capturedAt: p.captured_at,
        itemType: p.item_type,
        itemId: p.item_id,
        userId: p.user_id,
        isInSettlement: p.settlement_id !== null,
        splitStatus: p.split_status,
      })),
      createdAt: exception.created_at,
      updatedAt: exception.updated_at,
    };

    return NextResponse.json({
      success: true,
      exception: exceptionData,
    });
  } catch (error) {
    console.error('Get reconciliation exception error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get exception' },
      { status: 500 }
    );
  }
}

