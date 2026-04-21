/**
 * Vendor Withdraw Request API Route
 * 
 * POST /api/vendor/withdraw-request - Creates a payout request for vendor
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * POST /api/vendor/withdraw-request
 * Creates a payout request for vendor
 * 
 * Request Body:
 * {
 *   "amount": 1000.00,
 *   "currency": "INR"
 * }
 */
export async function POST(request) {
  try {
    // Authentication: Only vendors can request payouts
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
    const orgId = session.user.orgId || session.user.org_id;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const { amount, currency = 'INR' } = body;

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      );
    }

    // Get vendor account
    const vendorAccountResult = await query(
      `SELECT id, kyc_status FROM vendor_accounts WHERE user_id = $1`,
      [userId]
    );

    if (!Array.isArray(vendorAccountResult?.rows) || vendorAccountResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Vendor account not found. Please complete KYC first.' },
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

    // Check KYC status
    if (vendorAccount.kyc_status !== 'verified') {
      return NextResponse.json(
        { success: false, error: 'KYC verification required before requesting payouts' },
        { status: 403 }
      );
    }

    // Get current vendor balance
    const balanceResult = await query(
      `SELECT withdrawable_amount, pending_amount, on_hold_amount
       FROM vendor_balances
       WHERE vendor_account_id = $1
       ORDER BY snapshot_at DESC
       LIMIT 1`,
      [vendorAccount.id]
    );

    const withdrawableAmount = (Array.isArray(balanceResult?.rows) && balanceResult.rows.length > 0)
      ? parseFloat(balanceResult.rows[0]?.withdrawable_amount) || 0
      : 0;

    // Check if sufficient balance
    if (amount > withdrawableAmount) {
      return NextResponse.json(
        { success: false, error: 'Insufficient withdrawable balance' },
        { status: 400 }
      );
    }

    // Check if fund account exists
    if (!vendorAccount.fund_account_id) {
      return NextResponse.json(
        { success: false, error: 'Bank details not configured. Please add bank details first.' },
        { status: 400 }
      );
    }

    // Create payout request in database first
    const payoutResult = await query(
      `INSERT INTO payouts (
        vendor_account_id, amount, currency, status, fund_account_id, mode, reference_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, amount, currency, status, created_at`,
      [
        vendorAccount.id,
        amount,
        currency,
        'queued',
        vendorAccount.fund_account_id,
        'NEFT',
        `payout_${Date.now()}_${vendorAccount.id}`,
      ]
    );

    if (!Array.isArray(payoutResult?.rows) || payoutResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to create payout request' },
        { status: 500 }
      );
    }
    
    const payout = payoutResult.rows[0];
    if (!payout || typeof payout !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid payout data' },
        { status: 500 }
      );
    }

    // Try to create payout in RazorpayX immediately (async, don't wait)
    // The payout will be processed by cron job if this fails
    try {
      const { getRazorpayService } = await import('@/lib/services/razorpay/RazorpayService.js');
      const razorpayService = getRazorpayService();
      
      const razorpayPayout = await razorpayService.createPayout({
        fundAccountId: vendorAccount.fund_account_id,
        amount,
        currency,
        mode: 'NEFT',
        purpose: 'payout',
        notes: {
          vendor_id: userId,
          payout_id: payout.id,
        },
        referenceId: payout.reference_id,
      });

      // Update payout with Razorpay payout ID
      await query(
        `UPDATE payouts
         SET razorpay_payout_id = $1, status = 'processing', updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [razorpayPayout.id, payout.id]
      );

      return NextResponse.json({
        success: true,
        payout: {
          id: payout.id,
          razorpayPayoutId: razorpayPayout.id,
          amount: payout.amount,
          currency: payout.currency,
          status: 'processing',
          createdAt: payout.created_at,
        },
        message: 'Payout request created and submitted. It will be processed within 1-2 business days.',
      });
    } catch (error) {
      console.error('RazorpayX payout creation error:', error);
      // Payout is queued, will be processed by cron job
      return NextResponse.json({
        success: true,
        payout: {
          id: payout.id,
          amount: payout.amount,
          currency: payout.currency,
          status: 'queued',
          createdAt: payout.created_at,
        },
        message: 'Payout request created. It will be processed shortly.',
        warning: 'Payout submission pending, will be retried automatically.',
      });
    }
  } catch (error) {
    console.error('Create withdraw request error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create payout request' },
      { status: 500 }
    );
  }
}

