/**
 * Verify Payment and Update Order Status
 * 
 * POST /api/checkout/verify-payment - Verifies payment with Razorpay and updates DB
 * This is used for local development where webhooks don't work
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query, getClient } from '@/lib/db/index.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';
import * as webhookHandlers from '@/lib/services/razorpay/webhookHandlers.js';

/**
 * POST /api/checkout/verify-payment
 * Verifies payment status with Razorpay and updates database
 */
export async function POST(request) {
  const client = await getClient();
  
  try {
    // Authentication required
    const session = await requireRole(request, ['student', 'alumni', 'parent']);
    const userId = session.user.id;

    const body = await request.json();
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;

    if (!razorpayOrderId) {
      return NextResponse.json(
        { success: false, error: 'Razorpay Order ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 [VERIFY PAYMENT] Verifying payment...', {
      razorpayOrderId,
      razorpayPaymentId,
      userId,
    });

    // Get order from database
    const orderResult = await query(
      `SELECT * FROM orders WHERE razorpay_order_id = $1 AND user_id = $2`,
      [razorpayOrderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    // If order is already paid, return early
    if (order.status === 'paid') {
      console.log('🔍 [VERIFY PAYMENT] Order already paid');
      return NextResponse.json({
        success: true,
        message: 'Order already verified',
        orderId: order.id,
        status: 'paid',
      });
    }

    // Verify with Razorpay
    const razorpayService = getRazorpayService();
    
    // Get order from Razorpay
    let razorpayOrder;
    try {
      razorpayOrder = await razorpayService.getOrder(razorpayOrderId);
      console.log('🔍 [VERIFY PAYMENT] Razorpay order status:', razorpayOrder.status);
    } catch (error) {
      console.error('🔍 [VERIFY PAYMENT] Error fetching Razorpay order:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to verify payment with Razorpay' },
        { status: 500 }
      );
    }

    // Check if order is paid in Razorpay
    if (razorpayOrder.status !== 'paid') {
      console.log('🔍 [VERIFY PAYMENT] Order not paid in Razorpay yet');
      return NextResponse.json({
        success: false,
        error: 'Payment not completed yet',
        razorpayStatus: razorpayOrder.status,
      });
    }

    // Get payments for this order from Razorpay
    let razorpayPayments;
    try {
      razorpayPayments = await razorpayService.getOrderPayments(razorpayOrderId);
      console.log('🔍 [VERIFY PAYMENT] Razorpay payments:', razorpayPayments.items?.length || 0);
    } catch (error) {
      console.error('🔍 [VERIFY PAYMENT] Error fetching payments:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch payment details' },
        { status: 500 }
      );
    }

    // Find captured payment
    const capturedPayment = razorpayPayments.items?.find(
      p => p.status === 'captured'
    ) || razorpayPayments.items?.[0];

    if (!capturedPayment) {
      return NextResponse.json(
        { success: false, error: 'No captured payment found' },
        { status: 400 }
      );
    }

    console.log('🔍 [VERIFY PAYMENT] Found captured payment:', capturedPayment.id);

    // Start transaction
    await client.query('BEGIN');

    try {
      // Update order status
      console.log('🔍 [VERIFY PAYMENT] Updating order status to "paid"...');
      await client.query(
        `UPDATE orders SET status = 'paid', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [order.id]
      );

      // Check if payment record exists
      const existingPayment = await client.query(
        `SELECT id FROM payments WHERE razorpay_payment_id = $1`,
        [capturedPayment.id]
      );

      let paymentId;
      if (existingPayment.rows.length === 0) {
        // Create payment record
        console.log('🔍 [VERIFY PAYMENT] Creating payment record...');
        const paymentResult = await client.query(
          `INSERT INTO payments (
            order_id, razorpay_payment_id, razorpay_order_id, amount, currency, status, 
            method, captured_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING id`,
          [
            order.id,
            capturedPayment.id,
            razorpayOrderId, // Razorpay order ID (required field)
            capturedPayment.amount / 100, // Convert from paise
            capturedPayment.currency,
            'captured',
            capturedPayment.method,
            capturedPayment.captured_at ? new Date(capturedPayment.captured_at * 1000) : new Date(),
          ]
        );
        paymentId = paymentResult.rows[0].id;
        console.log('🔍 [VERIFY PAYMENT] ✅ Payment record created:', paymentId);
      } else {
        // Update existing payment
        console.log('🔍 [VERIFY PAYMENT] Updating existing payment record...');
        paymentId = existingPayment.rows[0].id;
        await client.query(
          `UPDATE payments 
           SET status = 'captured', 
               razorpay_order_id = COALESCE(razorpay_order_id, $1),
               captured_at = $2, 
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [
            razorpayOrderId, // Update razorpay_order_id if it's null
            capturedPayment.captured_at ? new Date(capturedPayment.captured_at * 1000) : new Date(),
            paymentId,
          ]
        );
      }

      // Commit transaction
      await client.query('COMMIT');
      console.log('🔍 [VERIFY PAYMENT] ✅ Transaction committed');

      // Trigger enrollment logic (similar to webhook handler)
      try {
        console.log('🔍 [VERIFY PAYMENT] Triggering enrollment...');
        
        // Call grantItemAccess directly (this handles enrollment/registration)
        await webhookHandlers.grantItemAccess(
          order.item_type,
          order.item_id,
          order.user_id,
          order.id
        );

        console.log('🔍 [VERIFY PAYMENT] ✅ Enrollment triggered');
      } catch (enrollmentError) {
        console.error('🔍 [VERIFY PAYMENT] ⚠️ Error triggering enrollment:', enrollmentError);
        // Don't fail the verification if enrollment fails - it can be retried
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified and order updated',
        orderId: order.id,
        status: 'paid',
        paymentId: paymentId,
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('🔍 [VERIFY PAYMENT] ❌ Error in transaction:', error);
      throw error;
    }

  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
    
    console.error('🔍 [VERIFY PAYMENT] ❌ Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to verify payment' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

