/**
 * Vendor Events Database Utilities
 * 
 * Provides vendor-specific event registration queries.
 * All queries filter by vendor's events (events.created_by = vendorId).
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/vendor/events
 */

import { query, getClient } from '../index.js';

/**
 * Get event registrations for vendor's event
 * @param {string} vendorId - Vendor user UUID
 * @param {string} eventId - Event UUID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.status - Filter by registration status (optional)
 * @param {string} options.paymentStatus - Filter by payment status (optional)
 * @param {string} options.search - Search in student name/email (optional)
 * @returns {Promise<Object>} Object with registrations array and pagination info
 */
export async function getVendorEventRegistrations(vendorId, eventId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = null,
    paymentStatus = null,
    search = null,
  } = options;

  // First verify the event belongs to the vendor
  const eventCheck = await query(
    `SELECT id, title, capacity FROM events WHERE id = $1 AND created_by = $2`,
    [eventId, vendorId]
  );

  if (eventCheck.rows.length === 0) {
    throw new Error('Event not found or does not belong to vendor');
  }

  const event = eventCheck.rows[0];
  const offset = (page - 1) * limit;
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
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      avatarUrl: row.avatar_url,
      fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
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
    event: {
      id: event.id,
      title: event.title,
      capacity: event.capacity,
    },
    registrations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/**
 * Get event registration statistics
 * @param {string} vendorId - Vendor user UUID
 * @param {string} eventId - Event UUID
 * @returns {Promise<Object>} Registration statistics object
 */
export async function getEventRegistrationStats(vendorId, eventId) {
  // First verify the event belongs to the vendor
  const eventCheck = await query(
    `SELECT id, title, capacity, price, is_free FROM events WHERE id = $1 AND created_by = $2`,
    [eventId, vendorId]
  );

  if (eventCheck.rows.length === 0) {
    throw new Error('Event not found or does not belong to vendor');
  }

  const event = eventCheck.rows[0];

  const statsQuery = `
    SELECT 
      COUNT(*) as total_registrations,
      COUNT(*) FILTER (WHERE er.registration_status = 'registered') as confirmed_registrations,
      COUNT(*) FILTER (WHERE er.registration_status = 'cancelled') as cancelled_registrations,
      COUNT(*) FILTER (WHERE er.registration_status = 'attended') as attended_registrations,
      COUNT(*) FILTER (WHERE er.registration_status = 'no_show') as no_show_registrations,
      COUNT(*) FILTER (WHERE er.payment_status = 'paid') as paid_registrations,
      COUNT(*) FILTER (WHERE er.slot_number IS NOT NULL) as slots_booked,
      COUNT(*) FILTER (WHERE er.waitlist_position IS NOT NULL) as waitlist_count,
      COALESCE(SUM(CASE WHEN er.payment_status = 'paid' AND p.status = 'captured' AND o.final_amount IS NOT NULL THEN o.final_amount ELSE 0 END), 0) as total_revenue
    FROM event_registrations er
    LEFT JOIN orders o ON er.order_id = o.id
    LEFT JOIN payments p ON p.order_id = o.id
    WHERE er.event_id = $1
  `;

  const statsResult = await query(statsQuery, [eventId]);
  const stats = statsResult.rows[0];

  const totalRegistrations = parseInt(stats.total_registrations, 10);
  const slotsBooked = parseInt(stats.slots_booked, 10);
  const capacity = event.capacity;
  const availableSlots = capacity ? Math.max(0, capacity - slotsBooked) : null;

  return {
    event: {
      id: event.id,
      title: event.title,
      capacity,
      price: event.is_free ? 0 : parseFloat(event.price || 0),
      isFree: event.is_free,
    },
    registrations: {
      total: totalRegistrations,
      confirmed: parseInt(stats.confirmed_registrations, 10),
      cancelled: parseInt(stats.cancelled_registrations, 10),
      attended: parseInt(stats.attended_registrations, 10),
      noShow: parseInt(stats.no_show_registrations, 10),
    },
    slots: {
      total: capacity,
      booked: slotsBooked,
      available: availableSlots,
      waitlist: parseInt(stats.waitlist_count, 10),
      isFull: capacity ? slotsBooked >= capacity : false,
    },
    payments: {
      paid: parseInt(stats.paid_registrations, 10),
      totalRevenue: parseFloat(stats.total_revenue || 0),
    },
  };
}

/**
 * Get event slot availability
 * @param {string} eventId - Event UUID
 * @returns {Promise<Object>} Slot availability information
 */
export async function getEventSlotAvailability(eventId) {
  const eventQuery = `
    SELECT id, title, capacity FROM events WHERE id = $1
  `;
  const eventResult = await query(eventQuery, [eventId]);

  if (eventResult.rows.length === 0) {
    throw new Error('Event not found');
  }

  const event = eventResult.rows[0];
  const capacity = event.capacity;

  if (!capacity) {
    return {
      eventId: event.id,
      eventTitle: event.title,
      hasCapacity: false,
      capacity: null,
      availableSlots: null,
      bookedSlots: 0,
      isFull: false,
    };
  }

  const bookedQuery = `
    SELECT COUNT(*) as booked_count
    FROM event_registrations
    WHERE event_id = $1 AND slot_number IS NOT NULL AND registration_status != 'cancelled'
  `;
  const bookedResult = await query(bookedQuery, [eventId]);
  const bookedSlots = parseInt(bookedResult.rows[0].booked_count, 10);
  const availableSlots = Math.max(0, capacity - bookedSlots);

  return {
    eventId: event.id,
    eventTitle: event.title,
    hasCapacity: true,
    capacity,
    availableSlots,
    bookedSlots,
    isFull: bookedSlots >= capacity,
  };
}

/**
 * Get event waitlist
 * @param {string} eventId - Event UUID
 * @returns {Promise<Array>} Array of waitlist registrations
 */
export async function getEventWaitlist(eventId) {
  const waitlistQuery = `
    SELECT 
      er.id,
      er.user_id,
      er.waitlist_position,
      er.registered_at,
      u.first_name,
      u.last_name,
      u.email,
      u.avatar_url
    FROM event_registrations er
    INNER JOIN users u ON u.id = er.user_id
    WHERE er.event_id = $1 
      AND er.waitlist_position IS NOT NULL
      AND er.registration_status != 'cancelled'
    ORDER BY er.waitlist_position ASC
  `;

  const result = await query(waitlistQuery, [eventId]);

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    waitlistPosition: row.waitlist_position,
    registeredAt: row.registered_at,
    user: {
      id: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      avatarUrl: row.avatar_url,
      fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
    },
  }));
}

/**
 * Get all event registrations across vendor's events
 * @param {string} vendorId - Vendor user UUID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.eventId - Filter by specific event (optional)
 * @param {string} options.status - Filter by registration status (optional)
 * @param {string} options.search - Search in student name/email or event title (optional)
 * @returns {Promise<Object>} Object with registrations array and pagination info
 */
export async function getVendorAllEventRegistrations(vendorId, options = {}) {
  const {
    page = 1,
    limit = 20,
    eventId = null,
    status = null,
    search = null,
  } = options;

  const offset = (page - 1) * limit;
  const whereConditions = ['e.created_by = $1'];
  const queryParams = [vendorId];
  let paramIndex = 2;

  // Filter by event
  if (eventId) {
    whereConditions.push(`er.event_id = $${paramIndex}`);
    queryParams.push(eventId);
    paramIndex++;
  }

  // Filter by registration status
  if (status) {
    whereConditions.push(`er.registration_status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  // Search in student name/email or event title
  if (search) {
    whereConditions.push(`(
      u.first_name ILIKE $${paramIndex} OR 
      u.last_name ILIKE $${paramIndex} OR 
      u.email ILIKE $${paramIndex} OR
      CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramIndex} OR
      e.title ILIKE $${paramIndex}
    )`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM event_registrations er
    INNER JOIN events e ON e.id = er.event_id
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
      e.title as event_title,
      e.start_date as event_start_date,
      u.first_name,
      u.last_name,
      u.email,
      u.avatar_url
    FROM event_registrations er
    INNER JOIN events e ON e.id = er.event_id
    INNER JOIN users u ON u.id = er.user_id
    ${whereClause}
    ORDER BY er.registered_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  queryParams.push(limit, offset);

  const registrationsResult = await query(registrationsQuery, queryParams);

  const registrations = registrationsResult.rows.map(row => ({
    id: row.id,
    event: {
      id: row.event_id,
      title: row.event_title,
      startDate: row.event_start_date,
    },
    user: {
      id: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      avatarUrl: row.avatar_url,
      fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
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
    registrations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}
