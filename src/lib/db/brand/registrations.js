/**
 * Brand Event Registrations Database Utilities
 * 
 * Provides database functions for brand event registration management.
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
    if (error.code === '42P01') {
      return null;
    }
    throw error;
  }
}

/**
 * Get brand event registrations
 * 
 * @param {string} userId - Brand user ID
 * @param {string} eventId - Event ID
 * @param {Object} options - Filter options (page, limit, status, search)
 * @returns {Promise<Object>} Registrations list with pagination
 */
export async function getBrandEventRegistrations(userId, eventId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = null,
    paymentStatus = null,
    search = null,
  } = options;

  const brandId = await getBrandProfileId(userId);
  const offset = (page - 1) * limit;

  // Verify event belongs to brand
  let eventCheckQuery;
  let eventCheckParams;
  
  if (brandId) {
    eventCheckQuery = `SELECT id, title, capacity FROM events WHERE id = $1 AND brand_id = $2`;
    eventCheckParams = [eventId, brandId];
  } else {
    // Fallback to created_by if brand_id not available
    eventCheckQuery = `SELECT id, title, capacity FROM events WHERE id = $1 AND created_by = $2`;
    eventCheckParams = [eventId, userId];
  }

  const eventCheck = await query(eventCheckQuery, eventCheckParams);

  if (eventCheck.rows.length === 0) {
    throw new Error('Event not found or does not belong to brand');
  }

  const event = eventCheck.rows[0];

  const whereConditions = ['er.event_id = $1'];
  const queryParams = [eventId];
  let paramIndex = 2;

  // Filter by registration status
  if (status) {
    whereConditions.push(`er.registration_status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  // Filter by payment status
  if (paymentStatus) {
    whereConditions.push(`er.payment_status = $${paramIndex}`);
    queryParams.push(paymentStatus);
    paramIndex++;
  }

  // Search in student name or email
  if (search) {
    whereConditions.push(`(
      u.first_name ILIKE $${paramIndex} OR 
      u.last_name ILIKE $${paramIndex} OR 
      u.email ILIKE $${paramIndex} OR
      CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramIndex}
    )`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM event_registrations er
    INNER JOIN users u ON u.id = er.user_id
    ${whereClause}
  `;
  const countResult = await query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].total, 10);

  // Get registrations
  const registrationsQuery = `
    SELECT 
      er.id,
      er.event_id,
      er.user_id,
      er.order_id,
      er.registered_at,
      er.registration_status,
      er.payment_status,
      er.slot_number,
      er.slot_booked_at,
      er.waitlist_position,
      er.created_at,
      er.updated_at,
      u.first_name,
      u.last_name,
      u.email,
      u.avatar_url
    FROM event_registrations er
    INNER JOIN users u ON u.id = er.user_id
    ${whereClause}
    ORDER BY 
      CASE WHEN er.slot_number IS NOT NULL THEN 0 ELSE 1 END,
      er.slot_number ASC NULLS LAST,
      er.waitlist_position ASC NULLS LAST,
      er.registered_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  queryParams.push(limit, offset);

  const registrationsResult = await query(registrationsQuery, queryParams);

  const registrations = registrationsResult.rows.map(row => ({
    id: row.id,
    eventId: row.event_id,
    user: {
      id: row.user_id,
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
      email: row.email,
      avatarUrl: row.avatar_url,
    },
    orderId: row.order_id,
    registeredAt: row.registered_at,
    registrationStatus: row.registration_status,
    paymentStatus: row.payment_status,
    slotNumber: row.slot_number,
    slotBookedAt: row.slot_booked_at,
    waitlistPosition: row.waitlist_position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    event,
    registrations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: offset + limit < total,
      hasPrev: page > 1,
    },
  };
}

/**
 * Update registration status
 * 
 * @param {string} userId - Brand user ID
 * @param {string} registrationId - Registration ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated registration
 */
export async function updateBrandRegistrationStatus(userId, registrationId, status) {
  const brandId = await getBrandProfileId(userId);

  // Verify registration belongs to brand's event
  let verifyQuery;
  let verifyParams;
  
  if (brandId) {
    verifyQuery = `
      SELECT er.id 
      FROM event_registrations er
      INNER JOIN events e ON e.id = er.event_id
      WHERE er.id = $1 AND e.brand_id = $2
    `;
    verifyParams = [registrationId, brandId];
  } else {
    verifyQuery = `
      SELECT er.id 
      FROM event_registrations er
      INNER JOIN events e ON e.id = er.event_id
      WHERE er.id = $1 AND e.created_by = $2
    `;
    verifyParams = [registrationId, userId];
  }

  const verifyResult = await query(verifyQuery, verifyParams);
  
  if (verifyResult.rows.length === 0) {
    throw new Error('Registration not found or does not belong to brand');
  }

  // Update status
  const updateQuery = `
    UPDATE event_registrations
    SET registration_status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;
  const updateResult = await query(updateQuery, [status, registrationId]);

  return updateResult.rows[0];
}

/**
 * Get registration statistics for an event
 * 
 * @param {string} userId - Brand user ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Registration statistics
 */
export async function getBrandEventRegistrationStats(userId, eventId) {
  const brandId = await getBrandProfileId(userId);

  // Verify event belongs to brand
  let eventCheckQuery;
  let eventCheckParams;
  
  if (brandId) {
    eventCheckQuery = `SELECT id FROM events WHERE id = $1 AND brand_id = $2`;
    eventCheckParams = [eventId, brandId];
  } else {
    eventCheckQuery = `SELECT id FROM events WHERE id = $1 AND created_by = $2`;
    eventCheckParams = [eventId, userId];
  }

  const eventCheck = await query(eventCheckQuery, eventCheckParams);
  if (eventCheck.rows.length === 0) {
    throw new Error('Event not found or does not belong to brand');
  }

  const statsQuery = `
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE registration_status = 'registered') as registered,
      COUNT(*) FILTER (WHERE registration_status = 'cancelled') as cancelled,
      COUNT(*) FILTER (WHERE registration_status = 'attended') as attended,
      COUNT(*) FILTER (WHERE registration_status = 'no_show') as no_show,
      COUNT(*) FILTER (WHERE payment_status = 'paid') as paid,
      COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_payment,
      COUNT(*) FILTER (WHERE payment_status = 'failed') as failed_payment,
      COUNT(*) FILTER (WHERE slot_number IS NOT NULL) as with_slots,
      COUNT(*) FILTER (WHERE waitlist_position IS NOT NULL) as waitlisted
    FROM event_registrations
    WHERE event_id = $1
  `;
  const statsResult = await query(statsQuery, [eventId]);

  return statsResult.rows[0];
}
