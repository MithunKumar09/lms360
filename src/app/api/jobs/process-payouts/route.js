/**
 * Process Payouts Job API Route
 * 
 * POST /api/jobs/process-payouts - Trigger payout processing
 * Protected with API key authentication
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';

/**
 * Verify API key for job endpoints
 */
function verifyApiKey(request) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const expectedKey = process.env.JOB_API_KEY || process.env.CRON_SECRET;
  
  if (!expectedKey) {
    console.warn('JOB_API_KEY or CRON_SECRET not set - allowing request (development mode)');
    return true;
  }
  
  return apiKey === expectedKey;
}

/**
 * POST /api/jobs/process-payouts
 * Process queued payouts
 */
export async function POST(request) {
  try {
    // Verify API key
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get pending payouts
    const payoutsResult = await query(
      `SELECT p.*, va.user_id as vendor_user_id, va.fund_account_id
       FROM payouts p
       JOIN vendor_accounts va ON p.vendor_account_id = va.id
       WHERE p.status = 'pending'
       ORDER BY p.created_at ASC
       LIMIT 50`
    );

    const payouts = payoutsResult.rows;
    const results = [];

    const razorpayService = getRazorpayService();

    for (const payout of payouts) {
      try {
        // Create payout in RazorpayX
        const razorpayPayout = await razorpayService.createPayout({
          accountNumber: process.env.RAZORPAYX_ACCOUNT_NUMBER,
          fundAccountId: payout.fund_account_id,
          amount: payout.amount * 100, // Convert to paise
          currency: payout.currency || 'INR',
          mode: payout.mode || 'NEFT',
          purpose: payout.purpose || 'payout',
          queueIfLowBalance: true,
          referenceId: `payout_${payout.id}`,
          narration: payout.narration || `Payout for vendor ${payout.vendor_account_id}`,
        });

        // Update payout with Razorpay payout ID
        await query(
          `UPDATE payouts
           SET razorpay_payout_id = $1, status = 'processing', updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [razorpayPayout.id, payout.id]
        );

        results.push({
          payoutId: payout.id,
          razorpayPayoutId: razorpayPayout.id,
          status: 'processing',
        });
      } catch (error) {
        console.error(`Error processing payout ${payout.id}:`, error);
        results.push({
          payoutId: payout.id,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} payouts`,
      results,
    });
  } catch (error) {
    console.error('Process payouts job error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process payouts' },
      { status: 500 }
    );
  }
}

