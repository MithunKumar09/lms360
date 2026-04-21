/**
 * Vendor Earnings API Route
 * 
 * GET /api/vendor/earnings - Get vendor earnings, balances, and payout history
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/vendor/earnings
 * Get vendor earnings, balances, and payout history
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['vendor']);
    
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

    // Get vendor account
    const vendorAccountResult = await query(
      `SELECT id FROM vendor_accounts WHERE user_id = $1`,
      [userId]
    );

    if (!Array.isArray(vendorAccountResult?.rows) || vendorAccountResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        balance: {
          withdrawable: 0,
          pending: 0,
          onHold: 0,
        },
        earnings: [],
        payouts: [],
      });
    }

    const vendorAccountId = vendorAccountResult.rows[0]?.id;
    if (!vendorAccountId) {
      return NextResponse.json({
        success: true,
        balance: {
          withdrawable: 0,
          pending: 0,
          onHold: 0,
        },
        earnings: [],
        payouts: [],
      });
    }

    // Get current balance
    const balanceResult = await query(
      `SELECT withdrawable_amount, pending_amount, on_hold_amount, snapshot_at
       FROM vendor_balances
       WHERE vendor_account_id = $1
       ORDER BY snapshot_at DESC
       LIMIT 1`,
      [vendorAccountId]
    );

    const balance = (Array.isArray(balanceResult?.rows) && balanceResult.rows.length > 0)
      ? {
          withdrawable: parseFloat(balanceResult.rows[0]?.withdrawable_amount) || 0,
          pending: parseFloat(balanceResult.rows[0]?.pending_amount) || 0,
          onHold: parseFloat(balanceResult.rows[0]?.on_hold_amount) || 0,
          lastUpdated: balanceResult.rows[0]?.snapshot_at || null,
        }
      : {
          withdrawable: 0,
          pending: 0,
          onHold: 0,
          lastUpdated: null,
        };

    // Get earnings (payment splits for this vendor)
    const earningsResult = await query(
      `SELECT 
         ps.id,
         ps.amount,
         ps.status,
         ps.created_at,
         ps.settled_at,
         p.razorpay_payment_id,
         o.item_type,
         o.item_id,
         o.final_amount as order_amount
       FROM payment_splits ps
       JOIN payments p ON ps.payment_id = p.id
       JOIN orders o ON ps.order_id = o.id
       WHERE ps.entity_type = 'vendor' AND ps.entity_id = $1
       ORDER BY ps.created_at DESC
       LIMIT 50`,
      [userId]
    );

    const earnings = Array.isArray(earningsResult?.rows)
      ? earningsResult.rows
          .filter(row => row && typeof row === 'object')
          .map(row => ({
      id: row.id,
      amount: parseFloat(row.amount),
      status: row.status,
      createdAt: row.created_at,
      settledAt: row.settled_at,
      paymentId: row.razorpay_payment_id,
      itemType: row.item_type,
      itemId: row.item_id,
      orderAmount: parseFloat(row.order_amount),
    }))
      : [];

    // Get payout history
    const payoutsResult = await query(
      `SELECT 
         id,
         razorpay_payout_id,
         amount,
         currency,
         status,
         mode,
         reference_id,
         failure_reason,
         created_at,
         processed_at,
         failed_at
       FROM payouts
       WHERE vendor_account_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [vendorAccountId]
    );

    const payouts = Array.isArray(payoutsResult?.rows) ? payoutsResult.rows.map(row => ({
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
    })) : [];

    // Calculate totals
    const totalEarnings = Array.isArray(earnings)
      ? earnings.reduce((sum, e) => (typeof e?.amount === 'number' ? sum + e.amount : sum), 0)
      : 0;
    const totalPayouts = Array.isArray(payouts)
      ? payouts
          .filter(p => p && typeof p === 'object' && p.status === 'processed')
          .reduce((sum, p) => (typeof p?.amount === 'number' ? sum + p.amount : sum), 0)
      : 0;

    // Get KYC status
    const kycResult = await query(
      `SELECT kyc_status FROM vendor_accounts WHERE id = $1`,
      [vendorAccountId]
    );
    const kycStatus = (Array.isArray(kycResult?.rows) && kycResult.rows[0]?.kyc_status) || 'not_submitted';

    return NextResponse.json({
      success: true,
      earnings: {
        withdrawableBalance: balance.withdrawable,
        pendingBalance: balance.pending,
        onHoldBalance: balance.onHold,
        kycStatus,
      },
      payouts,
    });
  } catch (error) {
    console.error('Get vendor earnings error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get earnings' },
      { status: 500 }
    );
  }
}

