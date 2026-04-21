/**
 * Checkout Order Status API Route
 * 
 * GET /api/checkout/order/:id/status - Checks order and payment status
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';

/**
 * GET /api/checkout/order/:id/status
 * Checks order and payment status
 */
export async function GET(request, { params }) {
  try {
    // Authentication required
    const session = await requireRole(request, ['student', 'alumni', 'parent']);
    const userId = session.user.id;
    const orderId = params.id;

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get order from database
    const orderResult = await query(
      `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    );

    if (orderResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = orderResult.rows[0];

    // Get payment from database if exists
    const paymentResult = await query(
      `SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [orderId]
    );

    let payment = paymentResult.rows.length > 0 ? paymentResult.rows[0] : null;

    // Fetch latest status from Razorpay to handle webhook delays
    let razorpayOrder = null;
    let razorpayPayments = [];
    let razorpayPayment = null;

    if (order.razorpay_order_id) {
      try {
        const razorpayService = getRazorpayService();
        
        // Get Razorpay order status
        razorpayOrder = await razorpayService.getOrder(order.razorpay_order_id);
        
        // If order is paid, get payments from Razorpay (handles webhook delay)
        if (razorpayOrder.status === 'paid') {
          try {
            razorpayPayments = await razorpayService.getOrderPayments(order.razorpay_order_id);
            
            // Find captured payment
            razorpayPayment = razorpayPayments.items?.find(
              p => p.status === 'captured' || p.status === 'authorized'
            ) || razorpayPayments.items?.[0];
          } catch (error) {
            console.error('Failed to fetch Razorpay payments:', error);
          }
        }
      } catch (error) {
        console.error('Failed to fetch Razorpay order:', error);
        // Continue with DB data only
      }
    }

    // If payment not in DB but exists in Razorpay, use Razorpay data
    if (!payment && razorpayPayment) {
      payment = {
        id: null, // Not in DB yet
        status: razorpayPayment.status,
        amount: razorpayPayment.amount / 100, // Convert from paise
        method: razorpayPayment.method,
        razorpay_payment_id: razorpayPayment.id,
        created_at: new Date(razorpayPayment.created_at * 1000),
        captured_at: razorpayPayment.captured_at 
          ? new Date(razorpayPayment.captured_at * 1000) 
          : null,
      };
    }

    // Determine final payment status (prioritize Razorpay if webhook hasn't processed)
    const finalPaymentStatus = razorpayPayment?.status || payment?.status || null;
    const isCaptured = finalPaymentStatus === 'captured' || 
                      razorpayOrder?.status === 'paid' ||
                      order.status === 'paid';

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        amount: order.final_amount,
        currency: order.currency,
        itemType: order.item_type,
        itemId: order.item_id,
        createdAt: order.created_at,
        razorpayOrderId: order.razorpay_order_id,
        razorpayStatus: razorpayOrder?.status || null,
      },
      payment: payment
        ? {
            id: payment.id,
            status: finalPaymentStatus,
            amount: payment.amount,
            method: payment.method,
            createdAt: payment.created_at,
            capturedAt: payment.captured_at,
            razorpayPaymentId: razorpayPayment?.id || payment.razorpay_payment_id,
            // Indicate if this is from Razorpay API (webhook not processed yet)
            fromRazorpay: !payment.id,
          }
        : null,
      // Additional status flags for client-side verification
      isCaptured: isCaptured,
      isPaid: razorpayOrder?.status === 'paid' || order.status === 'paid',
    });
  } catch (error) {
    console.error('Get order status error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get order status' },
      { status: 500 }
    );
  }
}

