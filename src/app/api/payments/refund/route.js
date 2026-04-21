/**
 * Payment Refund API Route
 * 
 * POST /api/payments/refund - Create a refund for a payment
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';
import { getLedgerService } from '@/lib/services/razorpay/LedgerService.js';

/**
 * POST /api/payments/refund
 * Create a refund for a payment
 * 
 * Request Body:
 * {
 *   "paymentId": "uuid",
 *   "amount": 1000.00 (optional, full refund if not provided),
 *   "reason": "Refund reason"
 * }
 */
export async function POST(request) {
  try {
    // Only superadmin and admin can create refunds
    const session = await requireRole(request, ['superadmin', 'admin']);
    const userId = session.user.id;

    const body = await request.json();
    const { paymentId, amount, reason = 'Refund requested' } = body;

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'paymentId is required' },
        { status: 400 }
      );
    }

    // Get payment
    const paymentResult = await query(
      `SELECT p.*, o.id as order_id, o.final_amount, o.user_id as order_user_id
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.id = $1`,
      [paymentId]
    );

    if (paymentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      );
    }

    const payment = paymentResult.rows[0];

    // Check if payment is captured
    if (payment.status !== 'captured') {
      return NextResponse.json(
        { success: false, error: 'Only captured payments can be refunded' },
        { status: 400 }
      );
    }

    // Check if already refunded
    const existingRefundResult = await query(
      `SELECT SUM(amount) as total_refunded
       FROM refunds
       WHERE payment_id = $1 AND status = 'processed'`,
      [paymentId]
    );

    const totalRefunded = parseFloat(existingRefundResult.rows[0]?.total_refunded || 0);
    const refundableAmount = parseFloat(payment.amount) - totalRefunded;

    if (refundableAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Payment already fully refunded' },
        { status: 400 }
      );
    }

    // Determine refund amount
    const refundAmount = amount ? Math.min(amount, refundableAmount) : refundableAmount;

    if (refundAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid refund amount' },
        { status: 400 }
      );
    }

    // Create refund in Razorpay
    const razorpayService = getRazorpayService();
    const razorpayRefund = await razorpayService.createRefund(
      payment.razorpay_payment_id,
      refundAmount,
      reason
    );

    // Create refund record
    const refundResult = await query(
      `INSERT INTO refunds (
        razorpay_refund_id, payment_id, order_id, amount, currency, status, reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        razorpayRefund.id,
        payment.id,
        payment.order_id,
        refundAmount,
        payment.currency,
        'pending',
        reason,
      ]
    );

    const refund = refundResult.rows[0];

    // Update payment status if fully refunded
    if (refundAmount >= refundableAmount) {
      await query(
        `UPDATE payments SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [paymentId]
      );
    }

    // Reverse payment splits (if settled, move to on_hold; if pending, just reverse)
    const ledgerService = getLedgerService();
    await reversePaymentSplitsForRefund(payment.id, refundAmount, ledgerService);

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        razorpayRefundId: razorpayRefund.id,
        amount: refundAmount,
        status: 'pending',
        reason,
      },
      message: 'Refund created successfully. It will be processed shortly.',
    });
  } catch (error) {
    console.error('Create refund error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create refund' },
      { status: 500 }
    );
  }
}

/**
 * Reverse payment splits for refund
 */
async function reversePaymentSplitsForRefund(paymentId, refundAmount, ledgerService) {
  try {
    // Get payment splits
    const splitsResult = await query(
      `SELECT * FROM payment_splits WHERE payment_id = $1 AND status IN ('settled', 'pending')`,
      [paymentId]
    );

    const totalSplitAmount = splitsResult.rows.reduce((sum, s) => sum + parseFloat(s.amount), 0);
    const refundRatio = refundAmount / totalSplitAmount;

    for (const split of splitsResult.rows) {
      const splitRefundAmount = parseFloat(split.amount) * refundRatio;

      if (split.entity_type === 'vendor' && split.entity_id) {
        // Get vendor account
        const vendorAccountResult = await query(
          `SELECT id FROM vendor_accounts WHERE user_id = $1`,
          [split.entity_id]
        );

        if (vendorAccountResult.rows.length > 0) {
          const vendorAccountId = vendorAccountResult.rows[0].id;

          if (split.status === 'settled') {
            // Move from withdrawable to on_hold
            await ledgerService.updateVendorBalance(vendorAccountId, {
              withdrawable: -splitRefundAmount,
              onHold: splitRefundAmount,
            });
          } else {
            // Just reduce pending
            await ledgerService.updateVendorBalance(vendorAccountId, {
              pending: -splitRefundAmount,
            });
          }
        }
      }

      // Mark split as reversed (or create reversal entry)
      if (split.status === 'settled') {
        // Create reversal entry
        await query(
          `INSERT INTO payment_splits (
            payment_id, order_id, entity_type, entity_id, amount, percentage, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            split.payment_id,
            split.order_id,
            split.entity_type,
            split.entity_id,
            -splitRefundAmount,
            split.percentage,
            'reversed',
          ]
        );
      } else {
        // Just mark as reversed
        await query(
          `UPDATE payment_splits SET status = 'reversed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
          [split.id]
        );
      }
    }
  } catch (error) {
    console.error('Reverse payment splits error:', error);
    throw error;
  }
}

