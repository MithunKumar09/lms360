/**
 * Checkout Create Order API Route
 * 
 * POST /api/checkout/create-order - Creates an order in DB and Razorpay
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';

/**
 * POST /api/checkout/create-order
 * Creates an order in database and Razorpay
 * 
 * Request Body:
 * {
 *   "itemType": "course" | "event" | "workshop",
 *   "itemId": "uuid",
 *   "amount": 1000.00,
 *   "currency": "INR",
 *   "metadata": {}
 * }
 */
export async function POST(request) {
  try {
    // Authentication required
    const session = await requireRole(request, ['student', 'alumni', 'parent']);
    const userId = session.user.id;
    const orgId = session.user.orgId || session.user.org_id;

    const body = await request.json();
    const { itemType, itemId, amount, currency = 'INR', metadata = {} } = body;

    // Validate input
    if (!itemType || !itemId || !amount) {
      return NextResponse.json(
        { success: false, error: 'itemType, itemId, and amount are required' },
        { status: 400 }
      );
    }

    if (!['course', 'event', 'workshop'].includes(itemType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid itemType. Must be course, event, or workshop' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Verify item exists and get details
    let itemQuery;
    switch (itemType) {
      case 'course':
        itemQuery = `SELECT id, title, regular_price, discounted_price, status FROM courses WHERE id = $1`;
        break;
      case 'event':
        itemQuery = `SELECT id, title, price, status FROM events WHERE id = $1`;
        break;
      case 'workshop':
        itemQuery = `SELECT id, title, price, status FROM workshops WHERE id = $1`;
        break;
    }

    const itemResult = await query(itemQuery, [itemId]);
    if (itemResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: `${itemType} not found` },
        { status: 404 }
      );
    }

    const item = itemResult.rows[0];

    // Verify item is published/available
    if (item.status !== 'published') {
      return NextResponse.json(
        { success: false, error: `${itemType} is not available for purchase` },
        { status: 400 }
      );
    }

    // Verify amount matches item price
    let expectedPrice;
    if (itemType === 'course') {
      expectedPrice = item.discounted_price > 0 ? item.discounted_price : item.regular_price;
    } else {
      expectedPrice = item.price;
    }

    if (Math.abs(parseFloat(amount) - parseFloat(expectedPrice)) > 0.01) {
      return NextResponse.json(
        { success: false, error: 'Amount does not match item price' },
        { status: 400 }
      );
    }

    // Check if user already has a paid order for this item
    const existingOrder = await query(
      `SELECT id, status FROM orders
       WHERE user_id = $1 AND item_type = $2 AND item_id = $3 AND status = 'paid'`,
      [userId, itemType, itemId]
    );

    if (existingOrder.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'You already have access to this item' },
        { status: 400 }
      );
    }

    // Calculate final amount (with tax if needed)
    const taxAmount = 0; // TODO: Calculate tax based on rules
    const discountAmount = 0; // TODO: Apply discounts/coupons
    const finalAmount = amount + taxAmount - discountAmount;

    // Create Razorpay order first (before database insert to get razorpay_order_id)
    const razorpayService = getRazorpayService();
    const razorpayOrder = await razorpayService.createOrder({
      amount: finalAmount,
      currency,
      receipt: `order_${Date.now()}_${userId.substring(0, 8)}`, // Temporary receipt until we have order ID
      notes: {
        item_type: itemType,
        item_id: itemId,
        user_id: userId,
        ...metadata,
      },
    });

    // Create order in database with Razorpay order ID
    const orderResult = await query(
      `INSERT INTO orders (
        razorpay_order_id, user_id, org_id, item_type, item_id, amount, currency,
        discount_amount, tax_amount, final_amount, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id, razorpay_order_id`,
      [
        razorpayOrder.id, // Include razorpay_order_id in insert
        userId,
        orgId,
        itemType,
        itemId,
        amount,
        currency,
        discountAmount,
        taxAmount,
        finalAmount,
        'created',
        JSON.stringify(metadata),
      ]
    );

    const order = orderResult.rows[0];

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        razorpayOrderId: razorpayOrder.id,
        amount: finalAmount,
        currency,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}

