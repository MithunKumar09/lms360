/**
 * Organization Accounts Database Utilities
 * 
 * Provides CRUD operations for organization_accounts table.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/organizationAccounts
 */

import { query, getClient } from './index.js';

/**
 * Get organization account by organization ID
 * @param {string} orgId - Organization UUID
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object|null>} Organization account object or null if not found
 */
export async function getOrganizationAccountByOrgId(orgId, client = null) {
  const queryText = `
    SELECT * FROM organization_accounts 
    WHERE org_id = $1 
    LIMIT 1
  `;

  try {
    if (client) {
      const result = await client.query(queryText, [orgId]);
      return result.rows[0] || null;
    } else {
      const result = await query(queryText, [orgId]);
      return result.rows[0] || null;
    }
  } catch (error) {
    console.error('getOrganizationAccountByOrgId error:', error);
    throw error;
  }
}

/**
 * Get or create organization account
 * If account doesn't exist, creates a new one with default values
 * @param {string} orgId - Organization UUID
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object>} Organization account object
 */
export async function getOrganizationAccount(orgId, client = null) {
  try {
    // Try to get existing account
    let account = await getOrganizationAccountByOrgId(orgId, client);
    
    if (!account) {
      // Create new account with default values
      account = await createOrganizationAccount(orgId, {}, client);
    }
    
    return account;
  } catch (error) {
    console.error('getOrganizationAccount error:', error);
    throw error;
  }
}

/**
 * Create a new organization account
 * @param {string} orgId - Organization UUID
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
 * @returns {Promise<Object>} Created organization account object
 */
export async function createOrganizationAccount(orgId, accountData = {}, client = null) {
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
    INSERT INTO organization_accounts (
      org_id, linked_account_id, fund_account_id, kyc_status,
      kyc_submitted_at, kyc_verified_at, kyc_rejection_reason,
      bank_account_number_hash, bank_ifsc_code, bank_name, account_holder_name,
      currency, razorpay_metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `;

  const params = [
    orgId,
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
      return await getOrganizationAccountByOrgId(orgId, client);
    }
    console.error('createOrganizationAccount error:', error);
    throw error;
  }
}

/**
 * Update organization account
 * @param {string} accountId - Organization account UUID
 * @param {Object} updates - Fields to update (partial object)
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object|null>} Updated organization account object or null if not found
 */
export async function updateOrganizationAccount(accountId, updates, client = null) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    Object.keys(updates).forEach((key) => {
      // Skip undefined values and immutable fields
      if (updates[key] !== undefined && key !== 'id' && key !== 'org_id' && key !== 'created_at') {
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
      const queryText = 'SELECT * FROM organization_accounts WHERE id = $1';
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
      UPDATE organization_accounts 
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
    console.error('updateOrganizationAccount error:', error);
    throw error;
  }
}

/**
 * Get organization account by ID
 * @param {string} accountId - Organization account UUID
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object|null>} Organization account object or null if not found
 */
export async function getOrganizationAccountById(accountId, client = null) {
  const queryText = `
    SELECT * FROM organization_accounts 
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
    console.error('getOrganizationAccountById error:', error);
    throw error;
  }
}

