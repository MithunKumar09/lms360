/**
 * Superadmin Balances Database Utilities
 * 
 * Provides operations for superadmin_balances table.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/superadminBalances
 */

import { query, getClient } from './index.js';

/**
 * Get latest superadmin balance snapshot
 * @param {string} superadminAccountId - Superadmin account UUID
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object|null>} Latest balance snapshot or null if not found
 */
export async function getLatestSuperadminBalance(superadminAccountId, client = null) {
  const queryText = `
    SELECT * FROM superadmin_balances 
    WHERE superadmin_account_id = $1 
    ORDER BY snapshot_at DESC 
    LIMIT 1
  `;

  try {
    if (client) {
      const result = await client.query(queryText, [superadminAccountId]);
      return result.rows[0] || null;
    } else {
      const result = await query(queryText, [superadminAccountId]);
      return result.rows[0] || null;
    }
  } catch (error) {
    console.error('getLatestSuperadminBalance error:', error);
    throw error;
  }
}

/**
 * Create a new superadmin balance snapshot
 * @param {string} superadminAccountId - Superadmin account UUID
 * @param {Object} balances - Balance amounts
 * @param {number} balances.withdrawable_amount - Withdrawable amount (default: 0)
 * @param {number} balances.pending_amount - Pending amount (default: 0)
 * @param {number} balances.on_hold_amount - On hold amount (default: 0)
 * @param {string} [balances.currency] - Currency (default: 'INR')
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object>} Created balance snapshot
 */
export async function createSuperadminBalanceSnapshot(superadminAccountId, balances = {}, client = null) {
  const {
    withdrawable_amount = 0,
    pending_amount = 0,
    on_hold_amount = 0,
    currency = 'INR',
  } = balances;

  const queryText = `
    INSERT INTO superadmin_balances (
      superadmin_account_id, withdrawable_amount, pending_amount, 
      on_hold_amount, currency, snapshot_at
    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    RETURNING *
  `;

  const params = [
    superadminAccountId,
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
    console.error('createSuperadminBalanceSnapshot error:', error);
    throw error;
  }
}

/**
 * Get superadmin balance history
 * @param {string} superadminAccountId - Superadmin account UUID
 * @param {number} [limit] - Maximum number of records to return (default: 100)
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object[]>} Array of balance snapshots, ordered by snapshot_at DESC
 */
export async function getSuperadminBalanceHistory(superadminAccountId, limit = 100, client = null) {
  const queryText = `
    SELECT * FROM superadmin_balances 
    WHERE superadmin_account_id = $1 
    ORDER BY snapshot_at DESC 
    LIMIT $2
  `;

  try {
    if (client) {
      const result = await client.query(queryText, [superadminAccountId, limit]);
      return result.rows;
    } else {
      const result = await query(queryText, [superadminAccountId, limit]);
      return result.rows;
    }
  } catch (error) {
    console.error('getSuperadminBalanceHistory error:', error);
    throw error;
  }
}

/**
 * Get current superadmin balance (latest snapshot)
 * Returns zero balances if no snapshot exists
 * @param {string} superadminAccountId - Superadmin account UUID
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object>} Current balance object with withdrawable, pending, on_hold amounts
 */
export async function getCurrentSuperadminBalance(superadminAccountId, client = null) {
  const balance = await getLatestSuperadminBalance(superadminAccountId, client);
  
  if (!balance) {
    return {
      superadmin_account_id: superadminAccountId,
      withdrawable_amount: 0,
      pending_amount: 0,
      on_hold_amount: 0,
      currency: 'INR',
      snapshot_at: null,
    };
  }
  
  return balance;
}

