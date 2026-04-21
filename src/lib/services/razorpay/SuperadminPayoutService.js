/**
 * Superadmin Payout Service
 * 
 * Handles superadmin payout processing with RazorpayX
 */

import { query } from '@/lib/db/index.js';
import { getRazorpayService } from './RazorpayService.js';
import { getSuperadminAccountById } from '@/lib/db/superadminAccounts.js';
import { getCurrentSuperadminBalance } from '@/lib/db/superadminBalances.js';
import { getLedgerService } from './LedgerService.js';

class SuperadminPayoutService {
  /**
   * Create superadmin payout
   * @param {string} superadminAccountId - Superadmin account ID
   * @param {number} amount - Payout amount
   * @param {Object} options - Additional options
   * @param {string} options.currency - Currency (default: INR)
   * @param {string} options.mode - Payout mode (default: NEFT)
   * @param {string} options.referenceId - Reference ID
   * @returns {Promise<Object>} Created payout object
   */
  async createSuperadminPayout(superadminAccountId, amount, options = {}) {
    try {
      const { currency = 'INR', mode = 'NEFT', referenceId } = options;

      // Get superadmin account
      const superadminAccount = await getSuperadminAccountById(superadminAccountId);
      if (!superadminAccount) {
        throw new Error('Superadmin account not found');
      }

      // Check KYC status
      if (superadminAccount.kyc_status !== 'verified') {
        throw new Error('Superadmin KYC must be verified before requesting payout');
      }

      // Check fund account
      if (!superadminAccount.fund_account_id) {
        throw new Error('Fund account not configured for superadmin');
      }

      // Check balance
      const balance = await getCurrentSuperadminBalance(superadminAccountId);
      const withdrawableAmount = parseFloat(balance.withdrawable_amount) || 0;

      if (amount > withdrawableAmount) {
        throw new Error(`Insufficient balance. Available: ${withdrawableAmount}, Requested: ${amount}`);
      }

      // Create payout record
      const payoutResult = await query(
        `INSERT INTO payouts (
          superadmin_account_id, amount, currency, mode, reference_id, status
        ) VALUES ($1, $2, $3, $4, $5, 'queued')
        RETURNING *`,
        [
          superadminAccountId,
          amount,
          currency,
          mode,
          referenceId || `superadmin_payout_${superadminAccount.user_id}_${Date.now()}`,
        ]
      );

      const payout = payoutResult.rows[0];

      // Note: Payout will be processed by processSuperadminPayouts() job
      // which will create the payout in RazorpayX and update the status
      // Balance deduction will happen when payout is processed

      return payout;
    } catch (error) {
      console.error('SuperadminPayoutService createSuperadminPayout error:', error);
      throw error;
    }
  }

  /**
   * Get superadmin payout
   * @param {string} payoutId - Payout ID
   * @returns {Promise<Object|null>} Payout object or null
   */
  async getSuperadminPayout(payoutId) {
    try {
      const result = await query(
        `SELECT p.*, sa.user_id
         FROM payouts p
         JOIN superadmin_accounts sa ON p.superadmin_account_id = sa.id
         WHERE p.id = $1`,
        [payoutId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('SuperadminPayoutService getSuperadminPayout error:', error);
      throw error;
    }
  }

  /**
   * List superadmin payouts
   * @param {string} superadminAccountId - Superadmin account ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of payout objects
   */
  async listSuperadminPayouts(superadminAccountId, filters = {}) {
    try {
      const { status, limit = 50, offset = 0 } = filters;

      let whereClause = 'WHERE p.superadmin_account_id = $1';
      const params = [superadminAccountId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND p.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      const result = await query(
        `SELECT p.*, sa.user_id
         FROM payouts p
         JOIN superadmin_accounts sa ON p.superadmin_account_id = sa.id
         ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      return result.rows;
    } catch (error) {
      console.error('SuperadminPayoutService listSuperadminPayouts error:', error);
      throw error;
    }
  }

  /**
   * Update superadmin payout status
   * @param {string} payoutId - Payout ID
   * @param {string} status - New status
   * @param {string} failureReason - Failure reason (if failed)
   * @returns {Promise<Object>} Updated payout object
   */
  async updateSuperadminPayoutStatus(payoutId, status, failureReason = null) {
    try {
      const updates = {
        status,
        updated_at: new Date(),
      };

      if (status === 'processed') {
        updates.processed_at = new Date();
      } else if (status === 'failed') {
        updates.failed_at = new Date();
        if (failureReason) {
          updates.failure_reason = failureReason;
        }
      }

      const setClause = Object.keys(updates)
        .map((key, index) => {
          if (key === 'updated_at') {
            return 'updated_at = CURRENT_TIMESTAMP';
          }
          return `${key} = $${index + 1}`;
        })
        .join(', ');

      const values = Object.values(updates).filter(v => v !== 'updated_at');

      const result = await query(
        `UPDATE payouts
         SET ${setClause}
         WHERE id = $${values.length + 1}
         RETURNING *`,
        [...values, payoutId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('SuperadminPayoutService updateSuperadminPayoutStatus error:', error);
      throw error;
    }
  }
}

// Export singleton instance
let superadminPayoutServiceInstance = null;

export function getSuperadminPayoutService() {
  if (!superadminPayoutServiceInstance) {
    superadminPayoutServiceInstance = new SuperadminPayoutService();
  }
  return superadminPayoutServiceInstance;
}

export default SuperadminPayoutService;

