/**
 * Automatic Payout Job
 * 
 * Processes automatic payouts based on configured thresholds
 * Checks balances against payout_settings and creates payouts when conditions are met
 */

import { query } from '@/lib/db/index.js';
import { getRazorpayService } from '@/lib/services/razorpay/RazorpayService.js';
import { getOrgStatus } from '@/lib/tenant/orgStatus.js';

/**
 * Process automatic payouts for vendors
 * Checks vendor balances against payout_settings and creates payouts if threshold is met
 */
export async function processAutoVendorPayouts() {
  try {
    console.log('Starting automatic vendor payout processing...');

    // Get all enabled vendor payout settings — join to organizations to skip suspended/deleted orgs
    const settingsResult = await query(
      `SELECT ps.*, va.user_id, va.fund_account_id, va.kyc_status, va.org_id
       FROM payout_settings ps
       JOIN vendor_accounts va ON ps.vendor_account_id = va.id
       LEFT JOIN organizations o ON o.id = va.org_id
       WHERE ps.entity_type = 'vendor'
         AND ps.enabled = true
         AND va.kyc_status = 'verified'
         AND va.fund_account_id IS NOT NULL
         AND (va.org_id IS NULL OR o.status = 'active')`
    );

    const settings = settingsResult.rows;
    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const setting of settings) {
      try {
        // Get current vendor balance
        const balanceResult = await query(
          `SELECT withdrawable_amount, currency
           FROM vendor_balances
           WHERE vendor_account_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [setting.vendor_account_id]
        );

        if (balanceResult.rows.length === 0) {
          console.log(`No balance found for vendor account ${setting.vendor_account_id}`);
          skipped++;
          continue;
        }

        const balance = balanceResult.rows[0];
        const withdrawableAmount = parseFloat(balance.withdrawable_amount) || 0;

        // Check if balance meets threshold
        if (withdrawableAmount < parseFloat(setting.threshold_amount)) {
          console.log(`Vendor ${setting.vendor_account_id}: Balance ${withdrawableAmount} below threshold ${setting.threshold_amount}`);
          skipped++;
          continue;
        }

        // Determine payout amount
        let payoutAmount = withdrawableAmount;
        
        // Apply max_payout_amount limit if set
        if (setting.max_payout_amount && payoutAmount > parseFloat(setting.max_payout_amount)) {
          payoutAmount = parseFloat(setting.max_payout_amount);
        }

        // Ensure payout amount is at least min_payout_amount
        if (payoutAmount < parseFloat(setting.min_payout_amount)) {
          console.log(`Vendor ${setting.vendor_account_id}: Payout amount ${payoutAmount} below minimum ${setting.min_payout_amount}`);
          skipped++;
          continue;
        }

        // Check if there's already a queued payout for this vendor (avoid duplicates)
        const existingPayoutResult = await query(
          `SELECT id FROM payouts
           WHERE vendor_account_id = $1
             AND status IN ('queued', 'processing')
           LIMIT 1`,
          [setting.vendor_account_id]
        );

        if (existingPayoutResult.rows.length > 0) {
          console.log(`Vendor ${setting.vendor_account_id}: Already has a queued/processing payout`);
          skipped++;
          continue;
        }

        // Create payout record
        const payoutResult = await query(
          `INSERT INTO payouts (
            vendor_account_id, amount, currency, mode, status, reference_id
          ) VALUES ($1, $2, $3, $4, 'queued', $5)
          RETURNING id`,
          [
            setting.vendor_account_id,
            payoutAmount,
            setting.currency || 'INR',
            setting.default_mode || 'NEFT',
            `auto_payout_vendor_${setting.vendor_account_id}_${Date.now()}`,
          ]
        );

        const payout = payoutResult.rows[0];
        console.log(`Created automatic vendor payout ${payout.id} for vendor account ${setting.vendor_account_id}, amount: ${payoutAmount}`);
        processed++;

      } catch (error) {
        console.error(`Error processing auto payout for vendor account ${setting.vendor_account_id}:`, error);
        failed++;
      }
    }

    console.log(`Automatic vendor payout processing complete: ${processed} created, ${skipped} skipped, ${failed} failed`);
    return { processed, skipped, failed };
  } catch (error) {
    console.error('processAutoVendorPayouts error:', error);
    throw error;
  }
}

/**
 * Process automatic payouts for organizations
 * Checks organization balances against payout_settings and creates payouts if threshold is met
 */
export async function processAutoOrganizationPayouts() {
  try {
    console.log('Starting automatic organization payout processing...');

    // Get all enabled organization payout settings
    const settingsResult = await query(
      `SELECT ps.*, oa.org_id, oa.fund_account_id, oa.kyc_status
       FROM payout_settings ps
       JOIN organization_accounts oa ON ps.organization_account_id = oa.id
       WHERE ps.entity_type = 'organization'
         AND ps.enabled = true
         AND oa.kyc_status = 'verified'
         AND oa.fund_account_id IS NOT NULL`
    );

    const settings = settingsResult.rows;
    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const setting of settings) {
      try {
        // Get current organization balance
        const balanceResult = await query(
          `SELECT withdrawable_amount, currency
           FROM organization_balances
           WHERE organization_account_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [setting.organization_account_id]
        );

        if (balanceResult.rows.length === 0) {
          console.log(`No balance found for organization account ${setting.organization_account_id}`);
          skipped++;
          continue;
        }

        const balance = balanceResult.rows[0];
        const withdrawableAmount = parseFloat(balance.withdrawable_amount) || 0;

        // Check if balance meets threshold
        if (withdrawableAmount < parseFloat(setting.threshold_amount)) {
          console.log(`Organization ${setting.org_id}: Balance ${withdrawableAmount} below threshold ${setting.threshold_amount}`);
          skipped++;
          continue;
        }

        // Determine payout amount
        let payoutAmount = withdrawableAmount;
        
        // Apply max_payout_amount limit if set
        if (setting.max_payout_amount && payoutAmount > parseFloat(setting.max_payout_amount)) {
          payoutAmount = parseFloat(setting.max_payout_amount);
        }

        // Ensure payout amount is at least min_payout_amount
        if (payoutAmount < parseFloat(setting.min_payout_amount)) {
          console.log(`Organization ${setting.org_id}: Payout amount ${payoutAmount} below minimum ${setting.min_payout_amount}`);
          skipped++;
          continue;
        }

        // Check if there's already a queued payout for this organization (avoid duplicates)
        const existingPayoutResult = await query(
          `SELECT id FROM payouts
           WHERE organization_account_id = $1
             AND status IN ('queued', 'processing')
           LIMIT 1`,
          [setting.organization_account_id]
        );

        if (existingPayoutResult.rows.length > 0) {
          console.log(`Organization ${setting.org_id}: Already has a queued/processing payout`);
          skipped++;
          continue;
        }

        // Create payout record
        const payoutResult = await query(
          `INSERT INTO payouts (
            organization_account_id, amount, currency, mode, status, reference_id
          ) VALUES ($1, $2, $3, $4, 'queued', $5)
          RETURNING id`,
          [
            setting.organization_account_id,
            payoutAmount,
            setting.currency || 'INR',
            setting.default_mode || 'NEFT',
            `auto_payout_org_${setting.org_id}_${Date.now()}`,
          ]
        );

        const payout = payoutResult.rows[0];
        console.log(`Created automatic organization payout ${payout.id} for org ${setting.org_id}, amount: ${payoutAmount}`);
        processed++;

      } catch (error) {
        console.error(`Error processing auto payout for organization ${setting.org_id}:`, error);
        failed++;
      }
    }

    console.log(`Automatic organization payout processing complete: ${processed} created, ${skipped} skipped, ${failed} failed`);
    return { processed, skipped, failed };
  } catch (error) {
    console.error('processAutoOrganizationPayouts error:', error);
    throw error;
  }
}

/**
 * Process automatic payouts for superadmin
 * Checks superadmin balances against payout_settings and creates payouts if threshold is met
 */
export async function processAutoSuperadminPayouts() {
  try {
    console.log('Starting automatic superadmin payout processing...');

    // Get all enabled superadmin payout settings
    const settingsResult = await query(
      `SELECT ps.*, sa.user_id, sa.fund_account_id, sa.kyc_status
       FROM payout_settings ps
       JOIN superadmin_accounts sa ON ps.superadmin_account_id = sa.id
       WHERE ps.entity_type = 'superadmin'
         AND ps.enabled = true
         AND sa.kyc_status = 'verified'
         AND sa.fund_account_id IS NOT NULL`
    );

    const settings = settingsResult.rows;
    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const setting of settings) {
      try {
        // Get current superadmin balance
        const balanceResult = await query(
          `SELECT withdrawable_amount, currency
           FROM superadmin_balances
           WHERE superadmin_account_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [setting.superadmin_account_id]
        );

        if (balanceResult.rows.length === 0) {
          console.log(`No balance found for superadmin account ${setting.superadmin_account_id}`);
          skipped++;
          continue;
        }

        const balance = balanceResult.rows[0];
        const withdrawableAmount = parseFloat(balance.withdrawable_amount) || 0;

        // Check if balance meets threshold
        if (withdrawableAmount < parseFloat(setting.threshold_amount)) {
          console.log(`Superadmin ${setting.user_id}: Balance ${withdrawableAmount} below threshold ${setting.threshold_amount}`);
          skipped++;
          continue;
        }

        // Determine payout amount
        let payoutAmount = withdrawableAmount;
        
        // Apply max_payout_amount limit if set
        if (setting.max_payout_amount && payoutAmount > parseFloat(setting.max_payout_amount)) {
          payoutAmount = parseFloat(setting.max_payout_amount);
        }

        // Ensure payout amount is at least min_payout_amount
        if (payoutAmount < parseFloat(setting.min_payout_amount)) {
          console.log(`Superadmin ${setting.user_id}: Payout amount ${payoutAmount} below minimum ${setting.min_payout_amount}`);
          skipped++;
          continue;
        }

        // Check if there's already a queued payout for this superadmin (avoid duplicates)
        const existingPayoutResult = await query(
          `SELECT id FROM payouts
           WHERE superadmin_account_id = $1
             AND status IN ('queued', 'processing')
           LIMIT 1`,
          [setting.superadmin_account_id]
        );

        if (existingPayoutResult.rows.length > 0) {
          console.log(`Superadmin ${setting.user_id}: Already has a queued/processing payout`);
          skipped++;
          continue;
        }

        // Create payout record
        const payoutResult = await query(
          `INSERT INTO payouts (
            superadmin_account_id, amount, currency, mode, status, reference_id
          ) VALUES ($1, $2, $3, $4, 'queued', $5)
          RETURNING id`,
          [
            setting.superadmin_account_id,
            payoutAmount,
            setting.currency || 'INR',
            setting.default_mode || 'NEFT',
            `auto_payout_superadmin_${setting.user_id}_${Date.now()}`,
          ]
        );

        const payout = payoutResult.rows[0];
        console.log(`Created automatic superadmin payout ${payout.id} for user ${setting.user_id}, amount: ${payoutAmount}`);
        processed++;

      } catch (error) {
        console.error(`Error processing auto payout for superadmin ${setting.user_id}:`, error);
        failed++;
      }
    }

    console.log(`Automatic superadmin payout processing complete: ${processed} created, ${skipped} skipped, ${failed} failed`);
    return { processed, skipped, failed };
  } catch (error) {
    console.error('processAutoSuperadminPayouts error:', error);
    throw error;
  }
}

/**
 * Process all automatic payouts
 * Runs all entity types sequentially
 */
export async function processAllAutoPayouts() {
  try {
    console.log('Starting automatic payout processing for all entity types...');
    
    const vendorResult = await processAutoVendorPayouts();
    const orgResult = await processAutoOrganizationPayouts();
    const superadminResult = await processAutoSuperadminPayouts();

    const total = {
      processed: vendorResult.processed + orgResult.processed + superadminResult.processed,
      skipped: vendorResult.skipped + orgResult.skipped + superadminResult.skipped,
      failed: vendorResult.failed + orgResult.failed + superadminResult.failed,
    };

    console.log(`Automatic payout processing complete: ${total.processed} created, ${total.skipped} skipped, ${total.failed} failed`);
    return total;
  } catch (error) {
    console.error('processAllAutoPayouts error:', error);
    throw error;
  }
}
