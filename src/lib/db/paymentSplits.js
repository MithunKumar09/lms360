/**
 * Payment Splits Database Utilities
 * 
 * Provides helper functions for payment_splits table operations.
 * Includes functions to resolve entity details by entity_type and entity_id.
 * 
 * @module db/paymentSplits
 */

import { query, getClient } from './index.js';

/**
 * Get entity details by entity_type and entity_id
 * Returns entity information based on the entity type
 * @param {string} entityType - Entity type ('vendor', 'organization', 'superadmin', 'platform', 'tax', 'fee')
 * @param {string} entityId - Entity ID (UUID)
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object|null>} Entity details object or null if not found
 */
export async function getEntityDetails(entityType, entityId, client = null) {
  if (!entityId) {
    return null;
  }

  try {
    let queryText;
    let params = [entityId];

    switch (entityType) {
      case 'vendor':
        // Get vendor user details
        queryText = `
          SELECT 
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.role,
            va.id as account_id,
            va.kyc_status
          FROM users u
          LEFT JOIN vendor_accounts va ON va.user_id = u.id
          WHERE u.id = $1 AND u.role = 'vendor'
        `;
        break;

      case 'organization':
        // Get organization details
        queryText = `
          SELECT 
            o.id,
            o.name,
            o.display_name,
            o.slug,
            oa.id as account_id,
            oa.kyc_status
          FROM organizations o
          LEFT JOIN organization_accounts oa ON oa.org_id = o.id
          WHERE o.id = $1
        `;
        break;

      case 'superadmin':
        // Get superadmin user details
        queryText = `
          SELECT 
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.role,
            sa.id as account_id,
            sa.kyc_status
          FROM users u
          LEFT JOIN superadmin_accounts sa ON sa.user_id = u.id
          WHERE u.id = $1 AND u.role = 'superadmin'
        `;
        break;

      case 'platform':
      case 'tax':
      case 'fee':
        // Platform, tax, and fee don't have entity IDs
        return {
          type: entityType,
          name: entityType === 'platform' ? 'Platform' : entityType === 'tax' ? 'Tax' : 'Fee',
          id: null,
        };

      default:
        return null;
    }

    if (client) {
      const result = await client.query(queryText, params);
      if (result.rows.length === 0) {
        return null;
      }
      const row = result.rows[0];
      
      // Format response based on entity type
      if (entityType === 'vendor' || entityType === 'superadmin') {
        return {
          type: entityType,
          id: row.id,
          email: row.email,
          name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
          accountId: row.account_id,
          kycStatus: row.kyc_status,
        };
      } else if (entityType === 'organization') {
        return {
          type: entityType,
          id: row.id,
          name: row.display_name || row.name,
          slug: row.slug,
          accountId: row.account_id,
          kycStatus: row.kyc_status,
        };
      }
      
      return row;
    } else {
      const result = await query(queryText, params);
      if (result.rows.length === 0) {
        return null;
      }
      const row = result.rows[0];
      
      // Format response based on entity type
      if (entityType === 'vendor' || entityType === 'superadmin') {
        return {
          type: entityType,
          id: row.id,
          email: row.email,
          name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
          accountId: row.account_id,
          kycStatus: row.kyc_status,
        };
      } else if (entityType === 'organization') {
        return {
          type: entityType,
          id: row.id,
          name: row.display_name || row.name,
          slug: row.slug,
          accountId: row.account_id,
          kycStatus: row.kyc_status,
        };
      }
      
      return row;
    }
  } catch (error) {
    console.error('getEntityDetails error:', error);
    return null;
  }
}

/**
 * Get payment splits with entity details
 * Returns payment splits with resolved entity information
 * @param {Object} filters - Filter options
 * @param {string} [filters.paymentId] - Payment ID filter
 * @param {string} [filters.orderId] - Order ID filter
 * @param {string} [filters.entityType] - Entity type filter
 * @param {string} [filters.entityId] - Entity ID filter
 * @param {string} [filters.status] - Status filter
 * @param {number} [filters.limit] - Limit results (default: 100)
 * @param {number} [filters.offset] - Offset for pagination (default: 0)
 * @param {Object} [client] - Database client for transaction (optional)
 * @returns {Promise<Object[]>} Array of payment splits with entity details
 */
export async function getPaymentSplitsWithEntityDetails(filters = {}, client = null) {
  const {
    paymentId,
    orderId,
    entityType,
    entityId,
    status,
    limit = 100,
    offset = 0,
  } = filters;

  let whereClause = 'WHERE 1=1';
  const queryParams = [];
  let paramIndex = 1;

  if (paymentId) {
    whereClause += ` AND ps.payment_id = $${paramIndex}`;
    queryParams.push(paymentId);
    paramIndex++;
  }

  if (orderId) {
    whereClause += ` AND ps.order_id = $${paramIndex}`;
    queryParams.push(orderId);
    paramIndex++;
  }

  if (entityType) {
    whereClause += ` AND ps.entity_type = $${paramIndex}`;
    queryParams.push(entityType);
    paramIndex++;
  }

  if (entityId) {
    whereClause += ` AND ps.entity_id = $${paramIndex}`;
    queryParams.push(entityId);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND ps.status = $${paramIndex}`;
    queryParams.push(status);
    paramIndex++;
  }

  const queryText = `
    SELECT 
      ps.*,
      p.razorpay_payment_id,
      p.amount as payment_amount,
      p.status as payment_status,
      o.razorpay_order_id,
      o.item_type,
      o.item_id,
      o.final_amount as order_amount
    FROM payment_splits ps
    JOIN payments p ON ps.payment_id = p.id
    JOIN orders o ON ps.order_id = o.id
    ${whereClause}
    ORDER BY ps.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  try {
    let result;
    if (client) {
      result = await client.query(queryText, [...queryParams, limit, offset]);
    } else {
      result = await query(queryText, [...queryParams, limit, offset]);
    }

    // Resolve entity details for each split
    const splits = await Promise.all(
      result.rows.map(async (row) => {
        const entityDetails = await getEntityDetails(row.entity_type, row.entity_id, client);
        
        return {
          id: row.id,
          paymentId: row.payment_id,
          orderId: row.order_id,
          entityType: row.entity_type,
          entityId: row.entity_id,
          entityDetails: entityDetails,
          amount: parseFloat(row.amount),
          percentage: parseFloat(row.percentage),
          status: row.status,
          settlementId: row.settlement_id,
          settledAt: row.settled_at,
          razorpayPaymentId: row.razorpay_payment_id,
          paymentAmount: parseFloat(row.payment_amount),
          paymentStatus: row.payment_status,
          razorpayOrderId: row.razorpay_order_id,
          itemType: row.item_type,
          itemId: row.item_id,
          orderAmount: parseFloat(row.order_amount),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      })
    );

    return splits;
  } catch (error) {
    console.error('getPaymentSplitsWithEntityDetails error:', error);
    throw error;
  }
}

