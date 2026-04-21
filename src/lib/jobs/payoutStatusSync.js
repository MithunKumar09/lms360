/**
 * Payout Status Sync Job
 * 
 * Syncs payout status from RazorpayX API
 */

import { query } from '@/lib/db/index.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';

/**
 * Sync payout statuses from RazorpayX
 * Checks payouts in processing/queued status and updates them
 */
export async function syncPayoutStatuses() {
  try {
    console.log('Starting payout status sync...');

    // Get payouts that need status sync (vendor, organization, and superadmin)
    const payoutsResult = await query(
      `SELECT id, razorpay_payout_id, status
       FROM payouts
       WHERE status IN ('processing', 'queued')
         AND razorpay_payout_id IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 100`
    );

    const payouts = payoutsResult.rows;
    let updated = 0;
    let failed = 0;

    const razorpayService = getRazorpayService();

    for (const payout of payouts) {
      try {
        // Get payout status from RazorpayX
        const razorpayPayout = await razorpayService.getPayout(payout.razorpay_payout_id);

        // Map Razorpay status to our status
        let newStatus = payout.status;
        if (razorpayPayout.status === 'processed' || razorpayPayout.status === 'queued') {
          newStatus = 'processed';
        } else if (razorpayPayout.status === 'failed' || razorpayPayout.status === 'reversed') {
          newStatus = 'failed';
        } else if (razorpayPayout.status === 'pending') {
          newStatus = 'processing';
        }

        // Update if status changed
        if (newStatus !== payout.status) {
          await query(
            `UPDATE payouts
             SET status = $1,
                 processed_at = CASE WHEN $1 = 'processed' THEN CURRENT_TIMESTAMP ELSE processed_at END,
                 failed_at = CASE WHEN $1 = 'failed' THEN CURRENT_TIMESTAMP ELSE failed_at END,
                 failure_reason = CASE WHEN $1 = 'failed' THEN $2 ELSE failure_reason END,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [
              newStatus,
              razorpayPayout.failure_reason || razorpayPayout.status_description || null,
              payout.id,
            ]
          );

          updated++;
          console.log(`Payout ${payout.id} status updated: ${payout.status} -> ${newStatus}`);
        }
      } catch (error) {
        console.error(`Error syncing payout ${payout.id}:`, error);
        failed++;
      }
    }

    console.log(`Payout status sync complete: ${updated} updated, ${failed} failed`);
    return { updated, failed, total: payouts.length };
  } catch (error) {
    console.error('syncPayoutStatuses error:', error);
    throw error;
  }
}

