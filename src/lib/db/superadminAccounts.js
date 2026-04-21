/**
 * Superadmin Accounts Database Utilities
 * 
 * Provides CRUD operations for superadmin_accounts table.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/superadminAccounts
 */

import { query, getClient } from './index.js';

/**
 * Get superadmin account by user ID
 * @param {string} userId - Superadmin user UUID
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object|null>} Superadmin account object or null if not found
 */
export async function getSuperadminAccountByUserId(userId, client = null) {
  const queryText = `
    SELECT * FROM superadmin_accounts 
    WHERE user_id = $1 
    LIMIT 1
  `;

  try {
    if (client) {
      const result = await client.query(queryText, [userId]);
      return result.rows[0] || null;
    } else {
      const result = await query(queryText, [userId]);
      return result.rows[0] || null;
    }
  } catch (error) {
    console.error('getSuperadminAccountByUserId error:', error);
    throw error;
  }
}

/**
 * Get or create superadmin account
 * If account doesn't exist, creates a new one with default values
 * @param {string} userId - Superadmin user UUID
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object>} Superadmin account object
 */
export async function getSuperadminAccount(userId, client = null) {
  try {
    // Try to get existing account
    let account = await getSuperadminAccountByUserId(userId, client);
    
    if (!account) {
      // Create new account with default values
      account = await createSuperadminAccount(userId, {}, client);
    }
    
    return account;
  } catch (error) {
    console.error('getSuperadminAccount error:', error);
    throw error;
  }
}

/**
 * Create a new superadmin account
 * @param {string} userId - Superadmin user UUID
 * @param {Object} [accountData] - Account data (optional)
 * @param {string} [accountData.linked_account_id] - RazorpayX linked account ID
 * @param {string} [accountData.fund_account_id] - RazorpayX fund account ID
 * @param {string} [accountData.kyc_status] - KYC status (default: 'not_submitted')
 * @param {string} [accountData.bank_account_number_hash] - Hashed bank account number
 * @param {string} [accountData.bank_ifsc_code] - Bank IFSC code
 * @param {string} [accountData.bank_name] - Bank name
 * @param {string} [accountData.account_holder_name] - Account holder name
 * @param {string} [accountData.currency] - Currency (default: 'INR')
 * @param {Object} [accountData.razorpay_metadata] - Razorpay metadata JSON
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object>} Created superadmin account object
 */
export async function createSuperadminAccount(userId, accountData = {}, client = null) {
  const {
    linked_account_id = null,
    fund_account_id = null,
    kyc_status = 'not_submitted',
    bank_account_number_hash = null,
    bank_ifsc_code = null,
    bank_name = null,
    account_holder_name = null,
    currency = 'INR',
    razorpay_metadata = {},
  } = accountData;

  const queryText = `
    INSERT INTO superadmin_accounts (
      user_id, linked_account_id, fund_account_id, kyc_status,
      kyc_submitted_at, kyc_verified_at, kyc_rejection_reason,
      bank_account_number_hash, bank_ifsc_code, bank_name, account_holder_name,
      currency, razorpay_metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;

  const params = [
    userId,
    linked_account_id,
    fund_account_id,
    kyc_status,
    null, // kyc_submitted_at
    null, // kyc_verified_at
    null, // kyc_rejection_reason
    bank_account_number_hash,
    bank_ifsc_code,
    bank_name,
    account_holder_name,
    currency,
    JSON.stringify(razorpay_metadata),
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
    // Handle unique constraint violations
    if (error.code === '23505') {
      // Account already exists, return existing account
      return await getSuperadminAccountByUserId(userId, client);
    }
    console.error('createSuperadminAccount error:', error);
    throw error;
  }
}

/**
 * Update superadmin account
 * @param {string} accountId - Superadmin account UUID
 * @param {Object} updates - Fields to update (partial object)
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object|null>} Updated superadmin account object or null if not found
 */
export async function updateSuperadminAccount(accountId, updates, client = null) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    Object.keys(updates).forEach((key) => {
      // Skip undefined values and immutable fields
      if (updates[key] !== undefined && key !== 'id' && key !== 'user_id' && key !== 'created_at') {
        if (key === 'razorpay_metadata' && typeof updates[key] === 'object') {
          // Handle JSONB fields
          fields.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(updates[key]));
        } else {
          fields.push(`${key} = $${paramIndex}`);
          values.push(updates[key]);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      // No fields to update, return current account
      const queryText = 'SELECT * FROM superadmin_accounts WHERE id = $1';
      if (client) {
        const result = await client.query(queryText, [accountId]);
        return result.rows[0] || null;
      } else {
        const result = await query(queryText, [accountId]);
        return result.rows[0] || null;
      }
    }

    // Add updated_at and id as last parameters
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(accountId);

    const queryText = `
      UPDATE superadmin_accounts 
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex + 1}
      RETURNING *
    `;

    if (client) {
      const result = await client.query(queryText, values);
      return result.rows[0] || null;
    } else {
      const result = await query(queryText, values);
      return result.rows[0] || null;
    }
  } catch (error) {
    console.error('updateSuperadminAccount error:', error);
    throw error;
  }
}

/**
 * Get superadmin account by ID
 * @param {string} accountId - Superadmin account UUID
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object|null>} Superadmin account object or null if not found
 */
export async function getSuperadminAccountById(accountId, client = null) {
  const queryText = `
    SELECT * FROM superadmin_accounts 
    WHERE id = $1 
    LIMIT 1
  `;

  try {
    if (client) {
      const result = await client.query(queryText, [accountId]);
      return result.rows[0] || null;
    } else {
      const result = await query(queryText, [accountId]);
      return result.rows[0] || null;
    }
  } catch (error) {
    console.error('getSuperadminAccountById error:', error);
    throw error;
  }
}

