/**
 * Brand Events Database Utilities
 * 
 * Provides database functions for brand event management.
 */

import { query } from '@/lib/db/index.js';

/**
 * Get brand profile ID from user ID
 * 
 * @param {string} userId - Brand user ID
 * @returns {Promise<string|null>} Brand profile ID or null
 */
async function getBrandProfileId(userId) {
  try {
    const profileQuery = `
      SELECT id FROM brand_profiles WHERE user_id = $1 LIMIT 1
    `;
    const result = await query(profileQuery, [userId]);
    return result.rows[0]?.id || null;
  } catch (error) {
    // Table doesn't exist - that's okay, brand can still function
    if (error.code === '42P01') {
      // Table doesn't exist - expected behavior, no logging needed
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Get brand events
 * 
 * @param {string} userId - Brand user ID
 * @param {Object} filters - Filter options (status, page, limit)
 * @returns {Promise<Object>} Events list with pagination
 */
export async function getBrandEvents(userId, filters = {}) {
  const brandId = await getBrandProfileId(userId);
  // Use created_by as fallback if brand_id column doesn't exist or brandId is null
  // This allows brands to see their events even if brand_profiles table doesn't exist
  
  const { status = null, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  // Use created_by instead of brand_id (graceful degradation)
  let whereClause = 'WHERE created_by = $1';
  const params = [userId];
  let paramIndex = 2;

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  const eventsQuery = `
    SELECT 
      e.*,
      COUNT(DISTINCT er.id) as registration_count
    FROM events e
    LEFT JOIN event_registrations er ON er.event_id = e.id
    ${whereClause}
    GROUP BY e.id
    ORDER BY e.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const countQuery = `
    SELECT COUNT(*) as total
    FROM events
    ${whereClause}
  `;

  const [eventsResult, countResult] = await Promise.all([
    query(eventsQuery, params),
    query(countQuery, params.slice(0, paramIndex - 1)),
  ]);

  return {
    events: eventsResult.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0].total) || 0,
      totalPages: Math.ceil((parseInt(countResult.rows[0].total) || 0) / limit),
    },
  };
}

/**
 * Get brand event by ID
 * 
 * @param {string} eventId - Event ID
 * @param {string} userId - Brand user ID (for verification)
 * @returns {Promise<Object|null>} Event or null
 */
export async function getBrandEvent(eventId, userId) {
  // Use created_by instead of brand_id (graceful degradation)
  const eventQuery = `
    SELECT 
      e.*,
      COUNT(DISTINCT er.id) as registration_count
    FROM events e
    LEFT JOIN event_registrations er ON er.event_id = e.id
    WHERE e.id = $1 AND e.created_by = $2
    GROUP BY e.id
    LIMIT 1
  `;
  const result = await query(eventQuery, [eventId, userId]);
  return result.rows[0] || null;
}

/**
 * Create brand event
 * 
 * @param {string} userId - Brand user ID
 * @param {Object} eventData - Event data
 * @returns {Promise<Object>} Created event
 */
export async function createBrandEvent(userId, eventData) {
  const brandId = await getBrandProfileId(userId);
  // Allow creating events even if brand_profiles table doesn't exist
  // brand_id can be NULL in events table (graceful degradation)
  // If table exists but profile not found, still allow (profile can be created later)

  const {
    title,
    description,
    banner_url,
    event_type, // Not stored in DB, but kept for API compatibility
    start_date,
    end_date,
    mode,
    external_link,
    is_free,
    price,
    capacity,
    status = 'draft',
  } = eventData;

  const insertQuery = `
    INSERT INTO events (
      title,
      description,
      banner_url,
      start_date,
      end_date,
      mode,
      external_link,
      is_free,
      price,
      capacity,
      status,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;
  // Handle price according to constraint: if is_free=true, price must be NULL; if is_free=false, price must be NOT NULL
  const isFree = is_free !== false;
  const finalPrice = isFree ? null : (price || 0);

  const result = await query(insertQuery, [
    title,
    description || null,
    banner_url || null,
    start_date,
    end_date,
    mode || 'online',
    external_link || null,
    isFree,
    finalPrice,
    capacity || null,
    status,
    userId, // created_by should be user_id, not brand_id
  ]);
  return result.rows[0];
}

/**
 * Update brand event
 * 
 * @param {string} eventId - Event ID
 * @param {string} userId - Brand user ID (for verification)
 * @param {Object} eventData - Event data to update
 * @returns {Promise<Object|null>} Updated event or null
 */
export async function updateBrandEvent(eventId, userId, eventData) {
  const brandId = await getBrandProfileId(userId);
  if (!brandId) {
    return null;
  }

  const {
    title,
    description,
    banner_url,
    event_type, // Not stored in DB, but kept for API compatibility
    start_date,
    end_date,
    mode,
    external_link,
    is_free,
    price,
    capacity,
    status,
  } = eventData;

  // Build dynamic update query
  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    params.push(title);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    params.push(description);
  }
  if (banner_url !== undefined) {
    updates.push(`banner_url = $${paramIndex++}`);
    params.push(banner_url);
  }
  // event_type is not stored in the events table, so skip it
  if (start_date !== undefined) {
    updates.push(`start_date = $${paramIndex++}`);
    params.push(start_date);
  }
  if (end_date !== undefined) {
    updates.push(`end_date = $${paramIndex++}`);
    params.push(end_date);
  }
  if (mode !== undefined) {
    updates.push(`mode = $${paramIndex++}`);
    params.push(mode);
  }
  if (external_link !== undefined) {
    updates.push(`external_link = $${paramIndex++}`);
    params.push(external_link);
  }
  // Handle is_free and price together to satisfy constraint
  if (is_free !== undefined) {
    updates.push(`is_free = $${paramIndex++}`);
    params.push(is_free);
    // If setting is_free to true, also set price to NULL to satisfy constraint
    if (is_free === true) {
      updates.push(`price = NULL`);
    } else if (is_free === false && price !== undefined) {
      // If setting is_free to false, ensure price is set
      updates.push(`price = $${paramIndex++}`);
      params.push(price || 0);
    }
  } else if (price !== undefined) {
    // If only price is being updated (and is_free is not), update it normally
    // Note: This assumes the existing is_free value is compatible
    updates.push(`price = $${paramIndex++}`);
    params.push(price);
  }
  if (capacity !== undefined) {
    updates.push(`capacity = $${paramIndex++}`);
    params.push(capacity);
  }
  if (status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    params.push(status);
  }

  if (updates.length === 0) {
    // No updates, return existing event
    return await getBrandEvent(eventId, userId);
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(eventId, userId); // Use userId instead of brandId

  // Use created_by instead of brand_id (graceful degradation)
  const updateQuery = `
    UPDATE events
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex++} AND created_by = $${paramIndex}
    RETURNING *
  `;
  const result = await query(updateQuery, params);

  return result.rows[0] || null;
}

/**
 * Delete brand event
 * 
 * @param {string} eventId - Event ID
 * @param {string} userId - Brand user ID (for verification)
 * @returns {Promise<boolean>} Success status
 */
export async function deleteBrandEvent(eventId, userId) {
  // Use created_by instead of brand_id (graceful degradation)
  const deleteQuery = `
    DELETE FROM events
    WHERE id = $1 AND created_by = $2
  `;
  const result = await query(deleteQuery, [eventId, userId]);
  return result.rowCount > 0;
}

/**
 * Propose event for superadmin approval
 * 
 * @param {string} eventId - Event ID
 * @param {string} userId - Brand user ID (for verification)
 * @returns {Promise<Object|null>} Updated event or null
 */
export async function proposeBrandEvent(eventId, userId) {
  // Use created_by instead of brand_id (graceful degradation)
  const updateQuery = `
    UPDATE events
    SET 
      status = 'proposed',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND created_by = $2 AND status = 'draft'
    RETURNING *
  `;
  const result = await query(updateQuery, [eventId, userId]);
  return result.rows[0] || null;
}

/**
 * Get all proposed events (for superadmin)
 * 
 * @param {Object} filters - Filter options (page, limit)
 * @returns {Promise<Object>} Proposed events list with pagination
 */
export async function getProposedEvents(filters = {}) {
  const { page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  try {
    // Try to join with brand_profiles if table exists (using user_id match since brand_id column doesn't exist)
    const eventsQuery = `
      SELECT 
        e.*,
        bp.brand_name,
        bp.user_id as brand_user_id,
        u.email as brand_email,
        COUNT(DISTINCT er.id) as registration_count
      FROM events e
      LEFT JOIN brand_profiles bp ON bp.user_id = e.created_by
      LEFT JOIN users u ON u.id = e.created_by
      LEFT JOIN event_registrations er ON er.event_id = e.id
      WHERE e.status = 'proposed'
      GROUP BY e.id, bp.brand_name, bp.user_id, u.email
      ORDER BY e.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const countQuery = `
      SELECT COUNT(*) as total
      FROM events
      WHERE status = 'proposed'
    `;

    const [eventsResult, countResult] = await Promise.all([
      query(eventsQuery, [limit, offset]),
      query(countQuery, []),
    ]);

    return {
      events: eventsResult.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total) || 0,
        totalPages: Math.ceil((parseInt(countResult.rows[0].total) || 0) / limit),
      },
    };
  } catch (error) {
    // If brand_profiles table doesn't exist, fallback to simple query
    if (error.code === '42P01') {
      const eventsQuery = `
        SELECT 
          e.*,
          NULL as brand_name,
          e.created_by as brand_user_id,
          u.email as brand_email,
          COUNT(DISTINCT er.id) as registration_count
        FROM events e
        LEFT JOIN users u ON u.id = e.created_by
        LEFT JOIN event_registrations er ON er.event_id = e.id
        WHERE e.status = 'proposed'
        GROUP BY e.id, u.email
        ORDER BY e.created_at DESC
        LIMIT $1 OFFSET $2
      `;
      const countQuery = `
        SELECT COUNT(*) as total
        FROM events
        WHERE status = 'proposed'
      `;

      const [eventsResult, countResult] = await Promise.all([
        query(eventsQuery, [limit, offset]),
        query(countQuery, []),
      ]);

      return {
        events: eventsResult.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total) || 0,
          totalPages: Math.ceil((parseInt(countResult.rows[0].total) || 0) / limit),
        },
      };
    }
    throw error;
  }
}

/**
 * Approve or reject event (superadmin only)
 * 
 * @param {string} eventId - Event ID
 * @param {string} action - 'approve' or 'reject'
 * @param {string} approvedBy - Superadmin user ID
 * @returns {Promise<Object|null>} Updated event or null
 */
export async function approveOrRejectEvent(eventId, action, approvedBy) {
  if (action !== 'approve' && action !== 'reject') {
    throw new Error('Action must be either "approve" or "reject"');
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  const updateQuery = `
    UPDATE events
    SET 
      status = $1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND status = 'proposed'
    RETURNING *
  `;
  const result = await query(updateQuery, [newStatus, eventId]);
  return result.rows[0] || null;
}
