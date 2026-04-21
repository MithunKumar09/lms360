/**
 * Vendor Finance API Route
 * 
 * GET /api/vendor/finance - Get vendor finance data (statistics, balance, payments, payouts)
 */

import { NextResponse } from 'next/server';
import { requireVendor } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/vendor/finance
 * Get vendor finance data including statistics, balance, recent payments, and payouts
 * 
 * Query Parameters:
 * - type (optional): 'statistics' | 'balance' | 'payments' | 'payouts' | 'all' (default: 'all')
 * - page (optional): Page number for payments/payouts (default: 1)
 * - limit (optional): Limit for payments/payouts (default: 10)
 */
export async function GET(request) {
  try {
    const session = await requireVendor(request);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = (page - 1) * limit;

    // Get vendor account ID
    const vendorAccountResult = await query(
      `SELECT id, kyc_status, linked_account_id, fund_account_id
       FROM vendor_accounts
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (!Array.isArray(vendorAccountResult?.rows) || vendorAccountResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vendor account not found' },
        { status: 404 }
      );
    }

    const vendorAccount = vendorAccountResult.rows[0];
    if (!vendorAccount || typeof vendorAccount !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid vendor account data' },
        { status: 500 }
      );
    }
    const vendorAccountId = vendorAccount.id;
    const kycStatus = vendorAccount.kyc_status;

    const response = { success: true };

    // Get statistics
    if (type === 'all' || type === 'statistics') {
      // Total revenue (sum of settled payment splits)
      const revenueQuery = `
        SELECT 
          COALESCE(SUM(ps.amount) FILTER (WHERE ps.status = 'settled'), 0) as total_revenue,
          COUNT(*) FILTER (WHERE ps.status = 'settled') as settled_payments_count,
          COUNT(*) FILTER (WHERE ps.status = 'pending') as pending_payments_count,
          COALESCE(SUM(ps.amount) FILTER (WHERE ps.status = 'pending'), 0) as pending_amount,
          COUNT(*) as total_payments_count
        FROM payment_splits ps
        WHERE ps.entity_type = 'vendor' AND ps.entity_id = $1
      `;

      const revenueResult = await query(revenueQuery, [vendorAccountId]);
      const revenueStats = (Array.isArray(revenueResult?.rows) && revenueResult.rows[0]) || {};

      // Get orders count (orders where vendor received payment splits)
      const ordersQuery = `
        SELECT COUNT(DISTINCT ps.order_id) as total_orders_count
        FROM payment_splits ps
        WHERE ps.entity_type = 'vendor' AND ps.entity_id = $1
      `;

      const ordersResult = await query(ordersQuery, [vendorAccountId]);

      response.statistics = {
        totalRevenue: parseFloat(revenueStats.total_revenue || 0),
        totalOrders: parseInt(
          (Array.isArray(ordersResult?.rows) && ordersResult.rows[0]?.total_orders_count) || 0,
          10
        ),
        settledPayments: parseInt(revenueStats.settled_payments_count || 0, 10),
        pendingPayments: parseInt(revenueStats.pending_payments_count || 0, 10),
        totalPayments: parseInt(revenueStats.total_payments_count || 0, 10),
        pendingAmount: parseFloat(revenueStats.pending_amount || 0),
        kycStatus,
      };
    }

    // Get balance
    if (type === 'all' || type === 'balance') {
      const balanceQuery = `
        SELECT 
          withdrawable_amount,
          pending_amount,
          on_hold_amount,
          currency,
          updated_at
        FROM vendor_balances
        WHERE vendor_account_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      const balanceResult = await query(balanceQuery, [vendorAccountId]);
      const balance = (Array.isArray(balanceResult?.rows) && balanceResult.rows[0]) || {
        withdrawable_amount: 0,
        pending_amount: 0,
        on_hold_amount: 0,
        currency: 'INR',
        updated_at: new Date(),
      };

      response.balance = {
        withdrawable: parseFloat(balance.withdrawable_amount || 0),
        pending: parseFloat(balance.pending_amount || 0),
        onHold: parseFloat(balance.on_hold_amount || 0),
        currency: balance.currency || 'INR',
        lastUpdated: balance.updated_at,
      };
    }

    // Get recent payments (payment splits)
    if (type === 'all' || type === 'payments') {
      const paymentsQuery = `
        SELECT 
          ps.*,
          o.id as order_id,
          o.final_amount as order_amount,
          o.status as order_status,
          p.razorpay_payment_id,
          p.status as payment_status,
          p.created_at as payment_created_at
        FROM payment_splits ps
        JOIN orders o ON ps.order_id = o.id
        LEFT JOIN payments p ON o.id = p.order_id
        WHERE ps.entity_type = 'vendor' AND ps.entity_id = $1
        ORDER BY ps.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const paymentsResult = await query(paymentsQuery, [vendorAccountId, limit, offset]);

      // Get total count
      const paymentsCountQuery = `
        SELECT COUNT(*) as total
        FROM payment_splits ps
        WHERE ps.entity_type = 'vendor' AND ps.entity_id = $1
      `;
      const paymentsCountResult = await query(paymentsCountQuery, [vendorAccountId]);
      const totalPayments = parseInt(paymentsCountResult.rows[0]?.total || 0, 10);

      response.payments = {
        items: Array.isArray(paymentsResult?.rows) ? paymentsResult.rows.map(row => ({
          id: row.id,
          orderId: row.order_id,
          orderAmount: parseFloat(row.order_amount),
          orderStatus: row.order_status,
          amount: parseFloat(row.amount),
          status: row.status,
          currency: row.currency,
          razorpayPaymentId: row.razorpay_payment_id,
          paymentStatus: row.payment_status,
          createdAt: row.created_at,
          paymentCreatedAt: row.payment_created_at,
        })) : [],
        pagination: {
          page,
          limit,
          total: totalPayments,
          pages: Math.ceil(totalPayments / limit),
        },
      };
    }

    // Get recent payouts
    if (type === 'all' || type === 'payouts') {
      const payoutsQuery = `
        SELECT 
          p.*
        FROM payouts p
        WHERE p.vendor_account_id = $1
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const payoutsResult = await query(payoutsQuery, [vendorAccountId, limit, offset]);

      // Get total count
      const payoutsCountQuery = `
        SELECT COUNT(*) as total
        FROM payouts p
        WHERE p.vendor_account_id = $1
      `;
      const payoutsCountResult = await query(payoutsCountQuery, [vendorAccountId]);
      const totalPayouts = parseInt(
        (Array.isArray(payoutsCountResult?.rows) && payoutsCountResult.rows[0]?.total) || 0,
        10
      );

      response.payouts = {
        items: Array.isArray(payoutsResult?.rows)
          ? payoutsResult.rows
              .filter(row => row && typeof row === 'object')
              .map(row => ({
          id: row.id,
          razorpayPayoutId: row.razorpay_payout_id,
          amount: parseFloat(row.amount),
          currency: row.currency,
          status: row.status,
          mode: row.mode,
          referenceId: row.reference_id,
          failureReason: row.failure_reason,
          createdAt: row.created_at,
          processedAt: row.processed_at,
          failedAt: row.failed_at,
        }))
          : [],
        pagination: {
          page,
          limit,
          total: totalPayouts,
          pages: Math.ceil(totalPayouts / limit),
        },
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get vendor finance error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get vendor finance data' },
      { status: error.status || 500 }
    );
  }
}
