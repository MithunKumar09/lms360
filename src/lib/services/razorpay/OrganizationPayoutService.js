/**
 * Organization Payout Service
 * 
 * Handles organization payout processing with RazorpayX
 */

import { query } from '@/lib/db/index.js';
import { getRazorpayService } from './RazorpayService.js';
import { getOrganizationAccountById } from '@/lib/db/organizationAccounts.js';
import { getCurrentOrganizationBalance } from '@/lib/db/organizationBalances.js';
import { getLedgerService } from './LedgerService.js';

class OrganizationPayoutService {
  /**
   * Create organization payout
   * @param {string} organizationAccountId - Organization account ID
   * @param {number} amount - Payout amount
   * @param {Object} options - Additional options
   * @param {string} options.currency - Currency (default: INR)
   * @param {string} options.mode - Payout mode (default: NEFT)
   * @param {string} options.referenceId - Reference ID
   * @returns {Promise<Object>} Created payout object
   */
  async createOrganizationPayout(organizationAccountId, amount, options = {}) {
    try {
      const { currency = 'INR', mode = 'NEFT', referenceId } = options;

      // Get organization account
      const organizationAccount = await getOrganizationAccountById(organizationAccountId);
      if (!organizationAccount) {
        throw new Error('Organization account not found');
      }

      // Check KYC status
      if (organizationAccount.kyc_status !== 'verified') {
        throw new Error('Organization KYC must be verified before requesting payout');
      }

      // Check fund account
      if (!organizationAccount.fund_account_id) {
        throw new Error('Fund account not configured for organization');
      }

      // Check balance
      const balance = await getCurrentOrganizationBalance(organizationAccountId);
      const withdrawableAmount = parseFloat(balance.withdrawable_amount) || 0;

      if (amount > withdrawableAmount) {
        throw new Error(`Insufficient balance. Available: ${withdrawableAmount}, Requested: ${amount}`);
      }

      // Create payout record
      const payoutResult = await query(
        `INSERT INTO payouts (
          organization_account_id, amount, currency, mode, reference_id, status
        ) VALUES ($1, $2, $3, $4, $5, 'queued')
        RETURNING *`,
        [
          organizationAccountId,
          amount,
          currency,
          mode,
          referenceId || `org_payout_${organizationAccount.org_id}_${Date.now()}`,
        ]
      );

      const payout = payoutResult.rows[0];

      // Note: Payout will be processed by processOrganizationPayouts() job
      // which will create the payout in RazorpayX and update the status
      // Balance deduction will happen when payout is processed

      return payout;
    } catch (error) {
      console.error('OrganizationPayoutService createOrganizationPayout error:', error);
      throw error;
    }
  }

  /**
   * Get organization payout
   * @param {string} payoutId - Payout ID
   * @returns {Promise<Object|null>} Payout object or null
   */
  async getOrganizationPayout(payoutId) {
    try {
      const result = await query(
        `SELECT p.*, oa.org_id
         FROM payouts p
         JOIN organization_accounts oa ON p.organization_account_id = oa.id
         WHERE p.id = $1`,
        [payoutId]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('OrganizationPayoutService getOrganizationPayout error:', error);
      throw error;
    }
  }

  /**
   * List organization payouts
   * @param {string} organizationAccountId - Organization account ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of payout objects
   */
  async listOrganizationPayouts(organizationAccountId, filters = {}) {
    try {
      const { status, limit = 50, offset = 0 } = filters;

      let whereClause = 'WHERE p.organization_account_id = $1';
      const params = [organizationAccountId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND p.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      const result = await query(
        `SELECT p.*, oa.org_id
         FROM payouts p
         JOIN organization_accounts oa ON p.organization_account_id = oa.id
         ${whereClause}
         ORDER BY p.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      return result.rows;
    } catch (error) {
      console.error('OrganizationPayoutService listOrganizationPayouts error:', error);
      throw error;
    }
  }

  /**
   * Update organization payout status
   * @param {string} payoutId - Payout ID
   * @param {string} status - New status
   * @param {string} failureReason - Failure reason (if failed)
   * @returns {Promise<Object>} Updated payout object
   */
  async updateOrganizationPayoutStatus(payoutId, status, failureReason = null) {
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
      console.error('OrganizationPayoutService updateOrganizationPayoutStatus error:', error);
      throw error;
    }
  }
}

// Export singleton instance
let organizationPayoutServiceInstance = null;

export function getOrganizationPayoutService() {
  if (!organizationPayoutServiceInstance) {
    organizationPayoutServiceInstance = new OrganizationPayoutService();
  }
  return organizationPayoutServiceInstance;
}

export default OrganizationPayoutService;

