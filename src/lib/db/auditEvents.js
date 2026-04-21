/**
 * Audit Events Database Utilities
 * 
 * Provides CRUD operations for audit_events table.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/auditEvents
 */

import { query } from './index.js';

/**
 * Create a new audit event
 * @param {Object} data - Audit event data
 * @param {string} [data.actor_id] - User UUID who performed the action
 * @param {string} data.action - Action performed (create, update, delete, bulk_import, etc.)
 * @param {string} data.target_type - Target type (organization, user, etc.)
 * @param {string} [data.target_id] - Target UUID
 * @param {Object} [data.metadata] - Additional metadata as JSON
 * @param {string} [data.ip_address] - IP address of the actor
 * @param {string} [data.user_agent] - User agent string
 * @returns {Promise<Object>} Created audit event object
 */
export async function createAuditEvent(data) {
  try {
    const {
      actor_id,
      action,
      target_type,
      target_id,
      metadata,
      ip_address,
      user_agent,
    } = data;

    const result = await query(
      `INSERT INTO audit_events (
        actor_id, action, target_type, target_id,
        metadata, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        actor_id || null,
        action,
        target_type,
        target_id || null,
        metadata ? JSON.stringify(metadata) : null,
        ip_address || null,
        user_agent || null,
      ]
    );

    return result.rows[0];
  } catch (error) {
    // Handle check constraint violations
    if (error.code === '23514') {
      throw new Error(`Invalid audit event data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get audit events with filters
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.actor_id] - Filter by actor ID
 * @param {string} [filters.target_type] - Filter by target type
 * @param {string} [filters.target_id] - Filter by target ID
 * @param {string} [filters.action] - Filter by action
 * @param {Date|string} [filters.from] - Start date (inclusive)
 * @param {Date|string} [filters.to] - End date (inclusive)
 * @param {number} [filters.page=1] - Page number (1-based)
 * @param {number} [filters.limit=50] - Items per page
 * @param {string} [filters.sort='created_at'] - Sort field
 * @param {string} [filters.order='DESC'] - Sort order (ASC or DESC)
 * @returns {Promise<Object>} Object with audit events array and pagination info
 */
export async function getAuditEvents(filters = {}) {
  try {
    const {
      actor_id,
      target_type,
      target_id,
      action,
      from,
      to,
      page = 1,
      limit = 50,
      sort = 'created_at',
      order = 'DESC',
    } = filters;

    // Build WHERE clause
    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (actor_id) {
      whereConditions.push(`actor_id = $${paramIndex}`);
      params.push(actor_id);
      paramIndex++;
    }

    if (target_type) {
      whereConditions.push(`target_type = $${paramIndex}`);
      params.push(target_type);
      paramIndex++;
    }

    if (target_id) {
      whereConditions.push(`target_id = $${paramIndex}`);
      params.push(target_id);
      paramIndex++;
    }

    if (action) {
      whereConditions.push(`action = $${paramIndex}`);
      params.push(action);
      paramIndex++;
    }

    if (from) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      params.push(from instanceof Date ? from.toISOString() : from);
      paramIndex++;
    }

    if (to) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      params.push(to instanceof Date ? to.toISOString() : to);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Validate sort field (prevent SQL injection)
    const allowedSortFields = ['created_at', 'action', 'target_type'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count total matching records
    const countResult = await query(
      `SELECT COUNT(*) as total FROM audit_events ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Fetch paginated results
    const result = await query(
      `SELECT * FROM audit_events 
       ${whereClause} 
       ORDER BY ${sortField} ${sortOrder} 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Parse JSONB metadata
    const events = result.rows.map((event) => ({
      ...event,
      metadata: event.metadata ? (typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata) : null,
    }));

    return {
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get audit events for a specific target
 * @param {string} targetType - Target type (organization, user, etc.)
 * @param {string} targetId - Target UUID
 * @param {Object} [options] - Additional options
 * @param {number} [options.limit=50] - Maximum results to return
 * @returns {Promise<Object[]>} Array of audit event objects
 */
export async function getAuditEventsByTarget(targetType, targetId, options = {}) {
  try {
    const { limit = 50 } = options;

    const result = await query(
      `SELECT * FROM audit_events 
       WHERE target_type = $1 AND target_id = $2 
       ORDER BY created_at DESC 
       LIMIT $3`,
      [targetType, targetId, limit]
    );

    // Parse JSONB metadata
    return result.rows.map((event) => ({
      ...event,
      metadata: event.metadata ? (typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata) : null,
    }));
  } catch (error) {
    throw error;
  }
}

/**
 * Get audit events by actor (user)
 * @param {string} actorId - Actor (user) UUID
 * @param {Object} [options] - Additional options
 * @param {number} [options.limit=50] - Maximum results to return
 * @returns {Promise<Object[]>} Array of audit event objects
 */
export async function getAuditEventsByActor(actorId, options = {}) {
  try {
    const { limit = 50 } = options;

    const result = await query(
      `SELECT * FROM audit_events 
       WHERE actor_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [actorId, limit]
    );

    // Parse JSONB metadata
    return result.rows.map((event) => ({
      ...event,
      metadata: event.metadata ? (typeof event.metadata === 'string' ? JSON.parse(event.metadata) : event.metadata) : null,
    }));
  } catch (error) {
    throw error;
  }
}

