/**
 * Razorpay Webhook API Route
 * 
 * POST /api/webhook/razorpay - Handles Razorpay webhook events
 */

import { NextResponse } from 'next/server';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';
import * as webhookHandlers from '@/lib/services/razorpay/webhookHandlers.js';

/**
 * POST /api/webhook/razorpay
 * Handles Razorpay webhook events
 */
export async function POST(request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Missing webhook signature' },
        { status: 400 }
      );
    }

    if (!webhookSecret) {
      console.error('RAZORPAY_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { success: false, error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    const razorpayService = getRazorpayService();
    const isValid = razorpayService.verifyWebhookSignature(body, signature, webhookSecret);

    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { success: false, error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse webhook payload
    const event = JSON.parse(body);

    // Route to appropriate handler based on event type
    const eventType = event.event;

    switch (eventType) {
      case 'payment.captured':
        await webhookHandlers.handlePaymentCaptured(event);
        break;

      case 'payment.failed':
        await webhookHandlers.handlePaymentFailed(event);
        break;

      case 'order.paid':
        await webhookHandlers.handleOrderPaid(event);
        break;

      case 'refund.created':
      case 'refund.processed':
        // Handle refund events
        if (event.payload.refund?.entity?.status === 'processed') {
          await webhookHandlers.handleRefundSucceeded(event);
        }
        break;

      case 'settlement.processed':
        await webhookHandlers.handleSettlementProcessed(event);
        break;

      case 'payout.processed':
        await webhookHandlers.handlePayoutProcessed(event);
        break;

      case 'payout.failed':
        await webhookHandlers.handlePayoutProcessed(event);
        break;

      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
        // Log but don't fail - new event types may be added
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

