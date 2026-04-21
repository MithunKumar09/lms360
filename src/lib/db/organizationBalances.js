/**
 * Organization Balances Database Utilities
 * 
 * Provides operations for organization_balances table.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/organizationBalances
 */

import { query, getClient } from './index.js';

/**
 * Get latest organization balance snapshot
 * @param {string} organizationAccountId - Organization account UUID
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object|null>} Latest balance snapshot or null if not found
 */
export async function getLatestOrganizationBalance(organizationAccountId, client = null) {
  const queryText = `
    SELECT * FROM organization_balances 
    WHERE organization_account_id = $1 
    ORDER BY snapshot_at DESC 
    LIMIT 1
  `;

  try {
    if (client) {
      const result = await client.query(queryText, [organizationAccountId]);
      return result.rows[0] || null;
    } else {
      const result = await query(queryText, [organizationAccountId]);
      return result.rows[0] || null;
    }
  } catch (error) {
    console.error('getLatestOrganizationBalance error:', error);
    throw error;
  }
}

/**
 * Create a new organization balance snapshot
 * @param {string} organizationAccountId - Organization account UUID
 * @param {Object} balances - Balance amounts
 * @param {number} balances.withdrawable_amount - Withdrawable amount (default: 0)
 * @param {number} balances.pending_amount - Pending amount (default: 0)
 * @param {number} balances.on_hold_amount - On hold amount (default: 0)
 * @param {string} [balances.currency] - Currency (default: 'INR')
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object>} Created balance snapshot
 */
export async function createOrganizationBalanceSnapshot(organizationAccountId, balances = {}, client = null) {
  const {
    withdrawable_amount = 0,
    pending_amount = 0,
    on_hold_amount = 0,
    currency = 'INR',
  } = balances;

  const queryText = `
    INSERT INTO organization_balances (
      organization_account_id, withdrawable_amount, pending_amount, 
      on_hold_amount, currency, snapshot_at
    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const params = [
    organizationAccountId,
    withdrawable_amount,
    pending_amount,
    on_hold_amount,
    currency,
  ];

  try {
    if (client) {
      const result = await client.query(queryText, params);
      return result.rows[0];
    } else {
      const result = await query(queryText, params);
      return result.rows[0];
    }
  } catch (error) {
    console.error('createOrganizationBalanceSnapshot error:', error);
    throw error;
  }
}

/**
 * Get organization balance history
 * @param {string} organizationAccountId - Organization account UUID
 * @param {number} [limit] - Maximum number of records to return (default: 100)
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object[]>} Array of balance snapshots, ordered by snapshot_at DESC
 */
export async function getOrganizationBalanceHistory(organizationAccountId, limit = 100, client = null) {
  const queryText = `
    SELECT * FROM organization_balances 
    WHERE organization_account_id = $1 
    ORDER BY snapshot_at DESC 
    LIMIT $2
  `;

  try {
    if (client) {
      const result = await client.query(queryText, [organizationAccountId, limit]);
      return result.rows;
    } else {
      const result = await query(queryText, [organizationAccountId, limit]);
      return result.rows;
    }
  } catch (error) {
    console.error('getOrganizationBalanceHistory error:', error);
    throw error;
  }
}

/**
 * Get current organization balance (latest snapshot)
 * Returns zero balances if no snapshot exists
 * @param {string} organizationAccountId - Organization account UUID
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object>} Current balance object with withdrawable, pending, on_hold amounts
 */
export async function getCurrentOrganizationBalance(organizationAccountId, client = null) {
  const balance = await getLatestOrganizationBalance(organizationAccountId, client);
  
  if (!balance) {
    return {
      organization_account_id: organizationAccountId,
      withdrawable_amount: 0,
      pending_amount: 0,
      on_hold_amount: 0,
      currency: 'INR',
      snapshot_at: null,
    };
  }
  
  return balance;
}

