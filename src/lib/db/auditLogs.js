/**
 * Audit Logging Utilities
 * Provides functions for creating and retrieving audit logs
 */

import { query } from './index.js';

/**
 * Create an audit log entry
 * @param {Object} params - Audit log parameters
 * @param {string} params.actorId - User ID who performed the action (null for system)
 * @param {string} params.targetUserId - User ID who was the target (if applicable)
 * @param {string} params.action - Action performed (e.g., 'create_user', 'update_user', 'delete_user', 'assign_role', 'remove_role', 'suspend_user', 'activate_user', 'invite_user', 'accept_invitation', 'force_password_reset')
 * @param {string} params.resourceType - Type of resource (e.g., 'user', 'role', 'invitation', 'session')
 * @param {string} params.resourceId - Resource ID (if applicable)
 * @param {Object} params.oldValues - Old values before change (JSON object)
 * @param {Object} params.newValues - New values after change (JSON object)
 * @param {Object} params.metadata - Additional metadata (JSON object)
 * @param {string} params.ipAddress - IP address of the request
 * @param {string} params.userAgent - User agent of the request
 * @returns {Promise<Object>} Created audit log entry
 */
export async function createAuditLog({
  actorId = null,
  targetUserId = null,
  action,
  resourceType,
  resourceId = null,
  oldValues = null,
  newValues = null,
  metadata = {},
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const res = await query(
      `INSERT INTO audit_logs (
        id, actor_id, target_user_id, action, resource_type, resource_id,
        old_values, new_values, metadata, ip_address, user_agent, created_at
      )
      VALUES (
        uuid_generate_v4(), $1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10, CURRENT_TIMESTAMP
      )
      RETURNING id, actor_id, target_user_id, action, resource_type, resource_id, created_at`,
      [
        actorId,
        targetUserId,
        action,
        resourceType,
        resourceId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        JSON.stringify(metadata),
        ipAddress,
        userAgent,
      ]
    );

    return res.rows[0];
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw - audit logging should not break the main operation
    return null;
  }
}

/**
 * Get audit logs for a specific user
 * @param {string} userId - User ID to get audit logs for
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of logs to return (default: 50)
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @param {string} options.action - Filter by action type
 * @param {Date} options.startDate - Filter logs from this date
 * @param {Date} options.endDate - Filter logs to this date
 * @returns {Promise<Object>} Audit logs with total count
 */
export async function getUserAuditLogs(userId, options = {}) {
  const {
    limit = 50,
    offset = 0,
    action = null,
    startDate = null,
    endDate = null,
  } = options;

  try {
    const conditions = ['(actor_id = $1 OR target_user_id = $1)'];
    const params = [userId];
    let paramIndex = 2;

    if (action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(action);
    }

    if (startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(startDate);
    }

    if (endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countRes = await query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].total, 10);

    // Get logs
    const logsRes = await query(
      `SELECT 
        al.id,
        al.actor_id,
        al.target_user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.old_values,
        al.new_values,
        al.metadata,
        al.ip_address,
        al.user_agent,
        al.created_at,
        actor.email AS actor_email,
        target.email AS target_email
      FROM audit_logs al
      LEFT JOIN users actor ON actor.id = al.actor_id
      LEFT JOIN users target ON target.id = al.target_user_id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    return {
      logs: logsRes.rows,
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error('Error getting user audit logs:', error);
    throw error;
  }
}

/**
 * Get audit logs for a specific resource
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - Resource ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Audit logs with total count
 */
export async function getResourceAuditLogs(resourceType, resourceId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  try {
    const countRes = await query(
      `SELECT COUNT(*) as total 
       FROM audit_logs 
       WHERE resource_type = $1 AND resource_id = $2`,
      [resourceType, resourceId]
    );
    const total = parseInt(countRes.rows[0].total, 10);

    const logsRes = await query(
      `SELECT 
        al.id,
        al.actor_id,
        al.target_user_id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.old_values,
        al.new_values,
        al.metadata,
        al.ip_address,
        al.user_agent,
        al.created_at,
        actor.email AS actor_email,
        target.email AS target_email
      FROM audit_logs al
      LEFT JOIN users actor ON actor.id = al.actor_id
      LEFT JOIN users target ON target.id = al.target_user_id
      WHERE al.resource_type = $1 AND al.resource_id = $2
      ORDER BY al.created_at DESC
      LIMIT $3 OFFSET $4`,
      [resourceType, resourceId, limit, offset]
    );

    return {
      logs: logsRes.rows,
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error('Error getting resource audit logs:', error);
    throw error;
  }
}

/**
 * Helper function to extract IP address and user agent from request
 * @param {Request} request - Next.js request object
 * @returns {Object} Object with ipAddress and userAgent
 */
export function extractRequestInfo(request) {
  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    null;

  const userAgent = request.headers.get('user-agent') || null;

  return { ipAddress, userAgent };
}

