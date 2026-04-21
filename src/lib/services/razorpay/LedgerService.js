/**
 * Ledger Service
 * 
 * Double-entry ledger helpers for payment splits and balance tracking
 */

import { query } from '@/lib/db/index.js';

class LedgerService {
  /**
   * Calculate payment splits
   * @param {Object} params - Split calculation parameters
   * @param {number} params.amount - Total payment amount
   * @param {string} params.itemType - Item type (course, event, workshop)
   * @param {string} params.itemId - Item ID
   * @param {UUID} params.orgId - Organization ID (optional)
   * @param {Object} params.commissionRules - Commission rules (percentage, fixed fee)
   * @returns {Promise<Array>} Array of split objects
   */
  async calculatePaymentSplits({ amount, itemType, itemId, orgId, commissionRules = {} }) {
    try {
      const splits = [];
      
      // Default commission: 10% platform fee + 2% fixed fee
      const platformPercentage = commissionRules.platformPercentage || 10;
      const platformFixedFee = commissionRules.platformFixedFee || 0.02; // 2% of amount
      const taxRate = commissionRules.taxRate || 18; // 18% GST

      // Calculate platform commission
      const platformPercentageAmount = (amount * platformPercentage) / 100;
      const platformFixedFeeAmount = (amount * platformFixedFee) / 100;
      const platformTotal = platformPercentageAmount + platformFixedFeeAmount;

      // Calculate tax (on platform commission)
      const taxAmount = (platformTotal * taxRate) / (100 + taxRate);
      const platformAfterTax = platformTotal - taxAmount;

      // Calculate vendor share (remaining after platform and tax)
      const vendorAmount = amount - platformTotal;

      // Platform split
      splits.push({
        entityType: 'platform',
        entityId: null,
        amount: platformAfterTax,
        percentage: (platformAfterTax / amount) * 100,
      });

      // Tax split
      splits.push({
        entityType: 'tax',
        entityId: null,
        amount: taxAmount,
        percentage: (taxAmount / amount) * 100,
      });

      // Beneficiary split (vendor, organization, or superadmin)
      if (itemType === 'course' || itemType === 'event' || itemType === 'workshop') {
        // Get creator ID and role
        const creatorId = await this.getItemCreator(itemType, itemId);
        const creatorRole = await this.getItemCreatorRole(itemType, itemId);
        const itemOrgId = await this.getItemOrganization(itemType, itemId);
        
        if (creatorId && creatorRole) {
          // Determine split based on creator role
          if (creatorRole === 'vendor') {
            // Vendor split: goes to vendor user_id
            splits.push({
              entityType: 'vendor',
              entityId: creatorId,
              amount: vendorAmount,
              percentage: (vendorAmount / amount) * 100,
            });
          } else if (creatorRole === 'admin' || creatorRole === 'instructor') {
            // Organization split: goes to organization (org_id)
            // Admin and instructor content payments go to their organization
            if (itemOrgId) {
              splits.push({
                entityType: 'organization',
                entityId: itemOrgId,
                amount: vendorAmount,
                percentage: (vendorAmount / amount) * 100,
              });
            }
          } else if (creatorRole === 'superadmin') {
            // Superadmin split: goes directly to superadmin user_id (bypasses org)
            // Even if content has org_id, payment goes to superadmin
            splits.push({
              entityType: 'superadmin',
              entityId: creatorId,
              amount: vendorAmount,
              percentage: (vendorAmount / amount) * 100,
            });
          }
        }
      }

      return splits;
    } catch (error) {
      console.error('LedgerService calculatePaymentSplits error:', error);
      throw new Error(`Failed to calculate payment splits: ${error.message}`);
    }
  }

  /**
   * Get item creator/vendor ID
   * @param {string} itemType - Item type
   * @param {string} itemId - Item ID
   * @returns {Promise<UUID|null>} Creator user ID or null
   */
  async getItemCreator(itemType, itemId) {
    try {
      let queryText;
      
      switch (itemType) {
        case 'course':
          queryText = 'SELECT created_by FROM courses WHERE id = $1';
          break;
        case 'event':
          queryText = 'SELECT created_by FROM events WHERE id = $1';
          break;
        case 'workshop':
          queryText = 'SELECT created_by FROM workshops WHERE id = $1';
          break;
        default:
          return null;
      }

      const result = await query(queryText, [itemId]);
      return result.rows[0]?.created_by || null;
    } catch (error) {
      console.error('LedgerService getItemCreator error:', error);
      return null;
    }
  }

  /**
   * Get item creator role
   * @param {string} itemType - Item type
   * @param {string} itemId - Item ID
   * @returns {Promise<string|null>} Creator role (vendor, admin, instructor, superadmin) or null
   */
  async getItemCreatorRole(itemType, itemId) {
    try {
      const creatorId = await this.getItemCreator(itemType, itemId);
      
      if (!creatorId) {
        return null;
      }

      // Get creator role from users table
      const result = await query(
        'SELECT role FROM users WHERE id = $1',
        [creatorId]
      );

      return result.rows[0]?.role || null;
    } catch (error) {
      console.error('LedgerService getItemCreatorRole error:', error);
      return null;
    }
  }

  /**
   * Get item organization ID
   * @param {string} itemType - Item type
   * @param {string} itemId - Item ID
   * @returns {Promise<UUID|null>} Organization ID or null
   */
  async getItemOrganization(itemType, itemId) {
    try {
      let queryText;
      
      switch (itemType) {
        case 'course':
          queryText = 'SELECT org_id FROM courses WHERE id = $1';
          break;
        case 'event':
          queryText = 'SELECT org_id FROM events WHERE id = $1';
          break;
        case 'workshop':
          queryText = 'SELECT org_id FROM workshops WHERE id = $1';
          break;
        default:
          return null;
      }

      const result = await query(queryText, [itemId]);
      return result.rows[0]?.org_id || null;
    } catch (error) {
      console.error('LedgerService getItemOrganization error:', error);
      return null;
    }
  }

  /**
   * Create payment splits in database
   * @param {UUID} paymentId - Payment ID
   * @param {UUID} orderId - Order ID
   * @param {Array} splits - Array of split objects
   * @returns {Promise<Array>} Array of created split IDs
   */
  async createPaymentSplits(paymentId, orderId, splits) {
    try {
      const splitIds = [];

      for (const split of splits) {
        const result = await query(
          `INSERT INTO payment_splits (
            payment_id, order_id, entity_type, entity_id, amount, percentage, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id`,
          [
            paymentId,
            orderId,
            split.entityType,
            split.entityId || null,
            split.amount,
            split.percentage,
            'pending',
          ]
        );

        splitIds.push(result.rows[0].id);
      }

      return splitIds;
    } catch (error) {
      console.error('LedgerService createPaymentSplits error:', error);
      throw new Error(`Failed to create payment splits: ${error.message}`);
    }
  }

  /**
   * Update vendor balance
   * @param {UUID} vendorAccountId - Vendor account ID
   * @param {Object} changes - Balance changes
   * @param {number} changes.withdrawable - Change to withdrawable amount
   * @param {number} changes.pending - Change to pending amount
   * @param {number} changes.onHold - Change to on_hold amount
   * @returns {Promise<Object>} Updated balance
   */
  async updateVendorBalance(vendorAccountId, changes) {
    try {
      // Get current balance
      const currentBalance = await query(
        `SELECT withdrawable_amount, pending_amount, on_hold_amount
         FROM vendor_balances
         WHERE vendor_account_id = $1
         ORDER BY snapshot_at DESC
         LIMIT 1`,
        [vendorAccountId]
      );

      let withdrawable = 0;
      let pending = 0;
      let onHold = 0;

      if (currentBalance.rows.length > 0) {
        withdrawable = parseFloat(currentBalance.rows[0].withdrawable_amount) || 0;
        pending = parseFloat(currentBalance.rows[0].pending_amount) || 0;
        onHold = parseFloat(currentBalance.rows[0].on_hold_amount) || 0;
      }

      // Apply changes
      withdrawable += changes.withdrawable || 0;
      pending += changes.pending || 0;
      onHold += changes.onHold || 0;

      // Ensure non-negative
      withdrawable = Math.max(0, withdrawable);
      pending = Math.max(0, pending);
      onHold = Math.max(0, onHold);

      // Create new snapshot
      const result = await query(
        `INSERT INTO vendor_balances (
          vendor_account_id, withdrawable_amount, pending_amount, on_hold_amount, currency
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [vendorAccountId, withdrawable, pending, onHold, 'INR']
      );

      return result.rows[0];
    } catch (error) {
      console.error('LedgerService updateVendorBalance error:', error);
      throw new Error(`Failed to update vendor balance: ${error.message}`);
    }
  }

  /**
   * Update organization balance
   * @param {UUID} organizationAccountId - Organization account ID
   * @param {Object} changes - Balance changes
   * @param {number} changes.withdrawable - Change to withdrawable amount
   * @param {number} changes.pending - Change to pending amount
   * @param {number} changes.onHold - Change to on_hold amount
   * @returns {Promise<Object>} Updated balance
   */
  async updateOrganizationBalance(organizationAccountId, changes) {
    try {
      // Get current balance
      const currentBalance = await query(
        `SELECT withdrawable_amount, pending_amount, on_hold_amount
         FROM organization_balances
         WHERE organization_account_id = $1
         ORDER BY snapshot_at DESC
         LIMIT 1`,
        [organizationAccountId]
      );

      let withdrawable = 0;
      let pending = 0;
      let onHold = 0;

      if (currentBalance.rows.length > 0) {
        withdrawable = parseFloat(currentBalance.rows[0].withdrawable_amount) || 0;
        pending = parseFloat(currentBalance.rows[0].pending_amount) || 0;
        onHold = parseFloat(currentBalance.rows[0].on_hold_amount) || 0;
      }

      // Apply changes
      withdrawable += changes.withdrawable || 0;
      pending += changes.pending || 0;
      onHold += changes.onHold || 0;

      // Ensure non-negative
      withdrawable = Math.max(0, withdrawable);
      pending = Math.max(0, pending);
      onHold = Math.max(0, onHold);

      // Create new snapshot
      const result = await query(
        `INSERT INTO organization_balances (
          organization_account_id, withdrawable_amount, pending_amount, on_hold_amount, currency
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [organizationAccountId, withdrawable, pending, onHold, 'INR']
      );

      return result.rows[0];
    } catch (error) {
      console.error('LedgerService updateOrganizationBalance error:', error);
      throw new Error(`Failed to update organization balance: ${error.message}`);
    }
  }

  /**
   * Update superadmin balance
   * @param {UUID} superadminAccountId - Superadmin account ID
   * @param {Object} changes - Balance changes
   * @param {number} changes.withdrawable - Change to withdrawable amount
   * @param {number} changes.pending - Change to pending amount
   * @param {number} changes.onHold - Change to on_hold amount
   * @returns {Promise<Object>} Updated balance
   */
  async updateSuperadminBalance(superadminAccountId, changes) {
    try {
      // Get current balance
      const currentBalance = await query(
        `SELECT withdrawable_amount, pending_amount, on_hold_amount
         FROM superadmin_balances
         WHERE superadmin_account_id = $1
         ORDER BY snapshot_at DESC
         LIMIT 1`,
        [superadminAccountId]
      );

      let withdrawable = 0;
      let pending = 0;
      let onHold = 0;

      if (currentBalance.rows.length > 0) {
        withdrawable = parseFloat(currentBalance.rows[0].withdrawable_amount) || 0;
        pending = parseFloat(currentBalance.rows[0].pending_amount) || 0;
        onHold = parseFloat(currentBalance.rows[0].on_hold_amount) || 0;
      }

      // Apply changes
      withdrawable += changes.withdrawable || 0;
      pending += changes.pending || 0;
      onHold += changes.onHold || 0;

      // Ensure non-negative
      withdrawable = Math.max(0, withdrawable);
      pending = Math.max(0, pending);
      onHold = Math.max(0, onHold);

      // Create new snapshot
      const result = await query(
        `INSERT INTO superadmin_balances (
          superadmin_account_id, withdrawable_amount, pending_amount, on_hold_amount, currency
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [superadminAccountId, withdrawable, pending, onHold, 'INR']
      );

      return result.rows[0];
    } catch (error) {
      console.error('LedgerService updateSuperadminBalance error:', error);
      throw new Error(`Failed to update superadmin balance: ${error.message}`);
    }
  }
}

// Export singleton instance
let ledgerServiceInstance = null;

export function getLedgerService() {
  if (!ledgerServiceInstance) {
    ledgerServiceInstance = new LedgerService();
  }
  return ledgerServiceInstance;
}

export default LedgerService;

