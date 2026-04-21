/**
 * Payment Jobs
 * 
 * Scheduled tasks for payment processing, reconciliation, and payouts
 */

import { getReconciliationService } from '@/lib/services/razorpay/ReconciliationService.js';
import { query } from '@/lib/db/index.js';

/**
 * Reconcile settlements
 * Daily cron job to fetch and match settlements
 */
export async function reconcileSettlements() {
  try {
    console.log('Starting settlement reconciliation...');
    const reconciliationService = getReconciliationService();
    
    // Fetch latest settlements from Razorpay
    const settlements = await reconciliationService.fetchSettlements({
      count: 100, // Adjust as needed
    });

    let processed = 0;
    let mismatches = 0;

    for (const settlement of settlements) {
      try {
        // Check if settlement already exists
        const existingResult = await query(
          `SELECT id FROM settlements WHERE razorpay_settlement_id = $1`,
          [settlement.id]
        );

        if (existingResult.rows.length === 0) {
          // Parse settlement date (Razorpay returns Unix timestamp or ISO string)
          const settledAt = settlement.settled_at 
            ? (typeof settlement.settled_at === 'number' 
                ? new Date(settlement.settled_at * 1000) 
                : new Date(settlement.settled_at))
            : new Date();
          
          // Create settlement record
          await query(
            `INSERT INTO settlements (
              razorpay_settlement_id, amount, currency, status,
              settled_at, settled_on, fees, tax, utr, razorpay_metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              settlement.id,
              settlement.amount ? (settlement.amount / 100) : 0, // Convert from paise
              settlement.currency || 'INR',
              'pending',
              settledAt,
              settledAt.toISOString().split('T')[0],
              settlement.fees ? (settlement.fees / 100) : 0,
              settlement.tax ? (settlement.tax / 100) : 0,
              settlement.utr || null,
              JSON.stringify(settlement),
            ]
          );
        }

        // Match and flag mismatches
        const result = await reconciliationService.flagMismatches(settlement.id);
        
        if (result.hasMismatch) {
          mismatches++;
        }
        
        processed++;
      } catch (error) {
        console.error(`Error processing settlement ${settlement.id}:`, error);
      }
    }

    console.log(`Settlement reconciliation complete: ${processed} processed, ${mismatches} mismatches`);
    return { processed, mismatches };
  } catch (error) {
    console.error('reconcileSettlements error:', error);
    throw error;
  }
}

/**
 * Compute vendor balances
 * Calculates vendor balances after hold period
 */
export async function computeVendorBalances() {
  try {
    console.log('Starting vendor balance computation...');
    const reconciliationService = getReconciliationService();
    
    const result = await reconciliationService.computeVendorBalances(7); // 7 day hold period
    
    console.log(`Vendor balance computation complete: ${result.processed} vendors, ${result.totalAmount} moved to withdrawable`);
    return result;
  } catch (error) {
    console.error('computeVendorBalances error:', error);
    throw error;
  }
}

/**
 * Compute organization balances
 * Calculates organization balances after hold period
 */
export async function computeOrganizationBalances() {
  try {
    console.log('Starting organization balance computation...');
    const reconciliationService = getReconciliationService();
    
    const result = await reconciliationService.computeOrganizationBalances(7); // 7 day hold period
    
    console.log(`Organization balance computation complete: ${result.processed} organizations, ${result.totalAmount} moved to withdrawable`);
    return result;
  } catch (error) {
    console.error('computeOrganizationBalances error:', error);
    throw error;
  }
}

/**
 * Compute superadmin balances
 * Calculates superadmin balances after hold period
 */
export async function computeSuperadminBalances() {
  try {
    console.log('Starting superadmin balance computation...');
    const reconciliationService = getReconciliationService();
    
    const result = await reconciliationService.computeSuperadminBalances(7); // 7 day hold period
    
    console.log(`Superadmin balance computation complete: ${result.processed} superadmins, ${result.totalAmount} moved to withdrawable`);
    return result;
  } catch (error) {
    console.error('computeSuperadminBalances error:', error);
    throw error;
  }
}

/**
 * Process vendor payouts
 * Batches and processes payout requests
 */
export async function processVendorPayouts() {
  try {
    console.log('Starting vendor payout processing...');
    
    // Get queued payouts
    const payoutsResult = await query(
      `SELECT p.*, va.user_id, va.linked_account_id, va.fund_account_id
       FROM payouts p
       JOIN vendor_accounts va ON p.vendor_account_id = va.id
       WHERE p.status = 'queued'
         AND p.vendor_account_id IS NOT NULL
         AND va.kyc_status = 'verified'
       ORDER BY p.created_at ASC
       LIMIT 50` // Process in batches
    );

    const payouts = payoutsResult.rows;
    let processed = 0;
    let failed = 0;

    for (const payout of payouts) {
      try {
        // Create payout in RazorpayX
        const { getRazorpayService } = await import('@/lib/services/razorpay/RazorpayService.js');
        const razorpayService = getRazorpayService();
        
        const razorpayPayout = await razorpayService.createPayout({
          fundAccountId: payout.fund_account_id,
          amount: parseFloat(payout.amount),
          currency: payout.currency || 'INR',
          mode: payout.mode || 'NEFT',
          purpose: 'payout',
          notes: {
            payout_id: payout.id,
            vendor_id: payout.user_id,
          },
          referenceId: payout.reference_id || `payout_${payout.id}`,
        });

        // Update payout with Razorpay payout ID
        await query(
          `UPDATE payouts
           SET razorpay_payout_id = $1, status = 'processing', updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [razorpayPayout.id, payout.id]
        );

        console.log(`Payout ${payout.id} submitted to RazorpayX: ${razorpayPayout.id}`);
        processed++;
      } catch (error) {
        console.error(`Error processing payout ${payout.id}:`, error);
        await query(
          `UPDATE payouts
           SET status = 'failed', failure_reason = $1, failed_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [error.message, payout.id]
        );
        failed++;
      }
    }

    console.log(`Vendor payout processing complete: ${processed} processed, ${failed} failed`);
    return { processed, failed };
  } catch (error) {
    console.error('processVendorPayouts error:', error);
    throw error;
  }
}

/**
 * Process organization payouts
 * Batches and processes organization payout requests
 */
export async function processOrganizationPayouts() {
  try {
    console.log('Starting organization payout processing...');
    
    // Get queued payouts
    const payoutsResult = await query(
      `SELECT p.*, oa.org_id, oa.linked_account_id, oa.fund_account_id
       FROM payouts p
       JOIN organization_accounts oa ON p.organization_account_id = oa.id
       WHERE p.status = 'queued'
         AND p.organization_account_id IS NOT NULL
         AND oa.kyc_status = 'verified'
       ORDER BY p.created_at ASC
       LIMIT 50` // Process in batches
    );

    const payouts = payoutsResult.rows;
    let processed = 0;
    let failed = 0;

    for (const payout of payouts) {
      try {
        // Create payout in RazorpayX
        const { getRazorpayService } = await import('@/lib/services/razorpay/RazorpayService.js');
        const razorpayService = getRazorpayService();
        
        const razorpayPayout = await razorpayService.createPayout({
          fundAccountId: payout.fund_account_id,
          amount: parseFloat(payout.amount),
          currency: payout.currency || 'INR',
          mode: payout.mode || 'NEFT',
          purpose: 'payout',
          notes: {
            payout_id: payout.id,
            org_id: payout.org_id,
          },
          referenceId: payout.reference_id || `payout_${payout.id}`,
        });

        // Update payout with Razorpay payout ID
        await query(
          `UPDATE payouts
           SET razorpay_payout_id = $1, status = 'processing', updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [razorpayPayout.id, payout.id]
        );

        // Deduct from withdrawable balance
        const { getLedgerService } = await import('@/lib/services/razorpay/LedgerService.js');
        const ledgerService = getLedgerService();
        await ledgerService.updateOrganizationBalance(payout.organization_account_id, {
          withdrawable: -parseFloat(payout.amount),
        });

        console.log(`Organization payout ${payout.id} submitted to RazorpayX: ${razorpayPayout.id}`);
        processed++;
      } catch (error) {
        console.error(`Error processing organization payout ${payout.id}:`, error);
        await query(
          `UPDATE payouts
           SET status = 'failed', failure_reason = $1, failed_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [error.message, payout.id]
        );
        failed++;
      }
    }

    console.log(`Organization payout processing complete: ${processed} processed, ${failed} failed`);
    return { processed, failed };
  } catch (error) {
    console.error('processOrganizationPayouts error:', error);
    throw error;
  }
}

/**
 * Process superadmin payouts
 * Batches and processes superadmin payout requests
 */
export async function processSuperadminPayouts() {
  try {
    console.log('Starting superadmin payout processing...');
    
    // Get queued payouts
    const payoutsResult = await query(
      `SELECT p.*, sa.user_id, sa.linked_account_id, sa.fund_account_id
       FROM payouts p
       JOIN superadmin_accounts sa ON p.superadmin_account_id = sa.id
       WHERE p.status = 'queued'
         AND p.superadmin_account_id IS NOT NULL
         AND sa.kyc_status = 'verified'
       ORDER BY p.created_at ASC
       LIMIT 50` // Process in batches
    );

    const payouts = payoutsResult.rows;
    let processed = 0;
    let failed = 0;

    for (const payout of payouts) {
      try {
        // Create payout in RazorpayX
        const { getRazorpayService } = await import('@/lib/services/razorpay/RazorpayService.js');
        const razorpayService = getRazorpayService();
        
        const razorpayPayout = await razorpayService.createPayout({
          fundAccountId: payout.fund_account_id,
          amount: parseFloat(payout.amount),
          currency: payout.currency || 'INR',
          mode: payout.mode || 'NEFT',
          purpose: 'payout',
          notes: {
            payout_id: payout.id,
            superadmin_user_id: payout.user_id,
          },
          referenceId: payout.reference_id || `payout_${payout.id}`,
        });

        // Update payout with Razorpay payout ID
        await query(
          `UPDATE payouts
           SET razorpay_payout_id = $1, status = 'processing', updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [razorpayPayout.id, payout.id]
        );

        // Deduct from withdrawable balance
        const { getLedgerService } = await import('@/lib/services/razorpay/LedgerService.js');
        const ledgerService = getLedgerService();
        await ledgerService.updateSuperadminBalance(payout.superadmin_account_id, {
          withdrawable: -parseFloat(payout.amount),
        });

        console.log(`Superadmin payout ${payout.id} submitted to RazorpayX: ${razorpayPayout.id}`);
        processed++;
      } catch (error) {
        console.error(`Error processing superadmin payout ${payout.id}:`, error);
        await query(
          `UPDATE payouts
           SET status = 'failed', failure_reason = $1, failed_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [error.message, payout.id]
        );
        failed++;
      }
    }

    console.log(`Superadmin payout processing complete: ${processed} processed, ${failed} failed`);
    return { processed, failed };
  } catch (error) {
    console.error('processSuperadminPayouts error:', error);
    throw error;
  }
}

/**
 * Pending refund workflow
 * Processes pending refunds and updates balances
 */
export async function pendingRefundWorkflow() {
  try {
    console.log('Starting pending refund workflow...');
    
    // Get pending refunds
    const refundsResult = await query(
      `SELECT * FROM refunds WHERE status = 'pending' ORDER BY created_at ASC`
    );

    const refunds = refundsResult.rows;
    let processed = 0;

    for (const refund of refunds) {
      try {
        // Check refund status with Razorpay
        // const razorpayService = getRazorpayService();
        // const razorpayRefund = await razorpayService.getRefund(refund.razorpay_refund_id);
        
        // For now, this is handled by webhooks
        // This job can be used for reconciliation or retry logic
        
        processed++;
      } catch (error) {
        console.error(`Error processing refund ${refund.id}:`, error);
      }
    }

    console.log(`Pending refund workflow complete: ${processed} processed`);
    return { processed };
  } catch (error) {
    console.error('pendingRefundWorkflow error:', error);
    throw error;
  }
}

