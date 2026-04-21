/**
 * Reconciliation Service
 * 
 * Settlement matching & exception reporting
 */

import { query } from '@/lib/db/index.js';
import { getRazorpayService } from './RazorpayService.js';

class ReconciliationService {
  /**
   * Fetch settlements from Razorpay API
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} Array of settlement objects
   */
  async fetchSettlements(params = {}) {
    try {
      const razorpayService = getRazorpayService();
      const response = await razorpayService.getSettlements(params);
      return response.items || [];
    } catch (error) {
      console.error('ReconciliationService fetchSettlements error:', error);
      throw new Error(`Failed to fetch settlements: ${error.message}`);
    }
  }

  /**
   * Match settlements to payments
   * @param {string} settlementId - Razorpay settlement ID
   * @returns {Promise<Object>} Matching results
   */
  async matchSettlementsToPayments(settlementId) {
    try {
      // Get settlement
      const settlementResult = await query(
        `SELECT * FROM settlements WHERE razorpay_settlement_id = $1`,
        [settlementId]
      );

      if (settlementResult.rows.length === 0) {
        throw new Error(`Settlement not found: ${settlementId}`);
      }

      const settlement = settlementResult.rows[0];

      // Get payments that should be in this settlement
      // This is a simplified matching - in production, you'd match by settlement date range
      const paymentsResult = await query(
        `SELECT p.*, o.id as order_id, o.user_id, o.item_type, o.item_id
         FROM payments p
         JOIN orders o ON p.order_id = o.id
         WHERE p.status = 'captured'
           AND p.captured_at >= $1::date - INTERVAL '7 days'
           AND p.captured_at <= $1::date + INTERVAL '1 day'
           AND NOT EXISTS (
             SELECT 1 FROM payment_splits ps
             WHERE ps.payment_id = p.id AND ps.settlement_id IS NOT NULL
           )`,
        [settlement.settled_on]
      );

      const matchedPayments = paymentsResult.rows;
      const expectedAmount = matchedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

      return {
        settlement,
        matchedPayments,
        expectedAmount,
        actualAmount: parseFloat(settlement.amount),
        difference: parseFloat(settlement.amount) - expectedAmount,
      };
    } catch (error) {
      console.error('ReconciliationService matchSettlementsToPayments error:', error);
      throw new Error(`Failed to match settlements: ${error.message}`);
    }
  }

  /**
   * Flag mismatches and create reconciliation exceptions
   * @param {string} settlementId - Razorpay settlement ID
   * @param {number} threshold - Threshold for flagging (default: 1.00)
   * @returns {Promise<Object>} Reconciliation result
   */
  async flagMismatches(settlementId, threshold = 1.00) {
    try {
      const matchResult = await this.matchSettlementsToPayments(settlementId);
      const { settlement, expectedAmount, actualAmount, difference } = matchResult;

      const hasMismatch = Math.abs(difference) > threshold;

      if (hasMismatch) {
        // Create reconciliation exception record
        // Note: You may want to create a reconciliation_exceptions table
        console.warn(`Settlement mismatch detected: ${settlementId}`, {
          expected: expectedAmount,
          actual: actualAmount,
          difference,
        });

        // Update settlement with mismatch flag
        await query(
          `UPDATE settlements
           SET razorpay_metadata = jsonb_set(
             COALESCE(razorpay_metadata, '{}'::jsonb),
             '{reconciliation_mismatch}',
             $1::jsonb
           )
           WHERE id = $2`,
          [
            JSON.stringify({
              expectedAmount,
              actualAmount,
              difference,
              flaggedAt: new Date().toISOString(),
            }),
            settlement.id,
          ]
        );
      } else {
        // Mark as reconciled
        await query(
          `UPDATE settlements
           SET reconciled_at = CURRENT_TIMESTAMP, status = 'processed'
           WHERE id = $1`,
          [settlement.id]
        );

        // Update payment splits with settlement ID (for all entity types)
        for (const payment of matchResult.matchedPayments) {
          await query(
            `UPDATE payment_splits
             SET settlement_id = $1, settled_at = CURRENT_TIMESTAMP, status = 'settled'
             WHERE payment_id = $2 AND status = 'pending'`,
            [settlement.id, payment.id]
          );
        }
      }

      return {
        settlementId,
        hasMismatch,
        difference,
        matched: !hasMismatch,
      };
    } catch (error) {
      console.error('ReconciliationService flagMismatches error:', error);
      throw new Error(`Failed to flag mismatches: ${error.message}`);
    }
  }

  /**
   * Compute vendor balances after hold period
   * @param {number} holdPeriodDays - Hold period in days (default: 7)
   * @returns {Promise<Object>} Balance computation results
   */
  async computeVendorBalances(holdPeriodDays = 7) {
    try {
      // Get payments that are past hold period and not yet settled
      const paymentsResult = await query(
        `SELECT ps.*, p.captured_at, p.amount as payment_amount
         FROM payment_splits ps
         JOIN payments p ON ps.payment_id = p.id
         WHERE ps.entity_type = 'vendor'
           AND ps.status = 'pending'
           AND p.captured_at <= NOW() - INTERVAL '${holdPeriodDays} days'
           AND ps.entity_id IS NOT NULL`
      );

      const vendorUpdates = {};

      for (const split of paymentsResult.rows) {
        const vendorId = split.entity_id;
        
        if (!vendorUpdates[vendorId]) {
          vendorUpdates[vendorId] = {
            vendorId,
            pendingToWithdrawable: 0,
          };
        }

        vendorUpdates[vendorId].pendingToWithdrawable += parseFloat(split.amount);
      }

      // Update vendor balances
      const ledgerService = await import('./LedgerService.js').then(m => m.getLedgerService());
      const results = [];

      for (const update of Object.values(vendorUpdates)) {
        // Get vendor account
        const vendorAccountResult = await query(
          `SELECT id FROM vendor_accounts WHERE user_id = $1`,
          [update.vendorId]
        );

        if (vendorAccountResult.rows.length > 0) {
          const vendorAccountId = vendorAccountResult.rows[0].id;

          // Move from pending to withdrawable
          await ledgerService.updateVendorBalance(vendorAccountId, {
            pending: -update.pendingToWithdrawable,
            withdrawable: update.pendingToWithdrawable,
          });

          results.push({
            vendorId: update.vendorId,
            amount: update.pendingToWithdrawable,
          });
        }
      }

      return {
        processed: results.length,
        totalAmount: results.reduce((sum, r) => sum + r.amount, 0),
        results,
      };
    } catch (error) {
      console.error('ReconciliationService computeVendorBalances error:', error);
      throw new Error(`Failed to compute vendor balances: ${error.message}`);
    }
  }

  /**
   * Compute organization balances after hold period
   * @param {number} holdPeriodDays - Hold period in days (default: 7)
   * @returns {Promise<Object>} Balance computation results
   */
  async computeOrganizationBalances(holdPeriodDays = 7) {
    try {
      // Get payments that are past hold period and not yet settled
      const paymentsResult = await query(
        `SELECT ps.*, p.captured_at, p.amount as payment_amount
         FROM payment_splits ps
         JOIN payments p ON ps.payment_id = p.id
         WHERE ps.entity_type = 'organization'
           AND ps.status = 'pending'
           AND p.captured_at <= NOW() - INTERVAL '${holdPeriodDays} days'
           AND ps.entity_id IS NOT NULL`
      );

      const organizationUpdates = {};

      for (const split of paymentsResult.rows) {
        const orgId = split.entity_id;
        
        if (!organizationUpdates[orgId]) {
          organizationUpdates[orgId] = {
            orgId,
            pendingToWithdrawable: 0,
          };
        }

        organizationUpdates[orgId].pendingToWithdrawable += parseFloat(split.amount);
      }

      // Update organization balances
      const ledgerService = await import('./LedgerService.js').then(m => m.getLedgerService());
      const results = [];

      for (const update of Object.values(organizationUpdates)) {
        // Get organization account
        const organizationAccountResult = await query(
          `SELECT id FROM organization_accounts WHERE org_id = $1`,
          [update.orgId]
        );

        if (organizationAccountResult.rows.length > 0) {
          const organizationAccountId = organizationAccountResult.rows[0].id;

          // Move from pending to withdrawable
          await ledgerService.updateOrganizationBalance(organizationAccountId, {
            pending: -update.pendingToWithdrawable,
            withdrawable: update.pendingToWithdrawable,
          });

          results.push({
            orgId: update.orgId,
            amount: update.pendingToWithdrawable,
          });
        }
      }

      return {
        processed: results.length,
        totalAmount: results.reduce((sum, r) => sum + r.amount, 0),
        results,
      };
    } catch (error) {
      console.error('ReconciliationService computeOrganizationBalances error:', error);
      throw new Error(`Failed to compute organization balances: ${error.message}`);
    }
  }

  /**
   * Compute superadmin balances after hold period
   * @param {number} holdPeriodDays - Hold period in days (default: 7)
   * @returns {Promise<Object>} Balance computation results
   */
  async computeSuperadminBalances(holdPeriodDays = 7) {
    try {
      // Get payments that are past hold period and not yet settled
      const paymentsResult = await query(
        `SELECT ps.*, p.captured_at, p.amount as payment_amount
         FROM payment_splits ps
         JOIN payments p ON ps.payment_id = p.id
         WHERE ps.entity_type = 'superadmin'
           AND ps.status = 'pending'
           AND p.captured_at <= NOW() - INTERVAL '${holdPeriodDays} days'
           AND ps.entity_id IS NOT NULL`
      );

      const superadminUpdates = {};

      for (const split of paymentsResult.rows) {
        const superadminUserId = split.entity_id;
        
        if (!superadminUpdates[superadminUserId]) {
          superadminUpdates[superadminUserId] = {
            superadminUserId,
            pendingToWithdrawable: 0,
          };
        }

        superadminUpdates[superadminUserId].pendingToWithdrawable += parseFloat(split.amount);
      }

      // Update superadmin balances
      const ledgerService = await import('./LedgerService.js').then(m => m.getLedgerService());
      const results = [];

      for (const update of Object.values(superadminUpdates)) {
        // Get superadmin account
        const superadminAccountResult = await query(
          `SELECT id FROM superadmin_accounts WHERE user_id = $1`,
          [update.superadminUserId]
        );

        if (superadminAccountResult.rows.length > 0) {
          const superadminAccountId = superadminAccountResult.rows[0].id;

          // Move from pending to withdrawable
          await ledgerService.updateSuperadminBalance(superadminAccountId, {
            pending: -update.pendingToWithdrawable,
            withdrawable: update.pendingToWithdrawable,
          });

          results.push({
            superadminUserId: update.superadminUserId,
            amount: update.pendingToWithdrawable,
          });
        }
      }

      return {
        processed: results.length,
        totalAmount: results.reduce((sum, r) => sum + r.amount, 0),
        results,
      };
    } catch (error) {
      console.error('ReconciliationService computeSuperadminBalances error:', error);
      throw new Error(`Failed to compute superadmin balances: ${error.message}`);
    }
  }
}

// Export singleton instance
let reconciliationServiceInstance = null;

export function getReconciliationService() {
  if (!reconciliationServiceInstance) {
    reconciliationServiceInstance = new ReconciliationService();
  }
  return reconciliationServiceInstance;
}

export default ReconciliationService;

