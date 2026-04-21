/**
 * Vendor Workshops Database Utilities
 * 
 * Provides vendor-specific workshop registration queries.
 * All queries filter by vendor's workshops (workshops.created_by = vendorId).
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/vendor/workshops
 */

import { query, getClient } from '../index.js';

/**
 * Get workshop registrations for vendor's workshop
 * @param {string} vendorId - Vendor user UUID
 * @param {string} workshopId - Workshop UUID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.status - Filter by registration status (optional)
 * @param {string} options.paymentStatus - Filter by payment status (optional)
 * @param {string} options.search - Search in student name/email (optional)
 * @returns {Promise<Object>} Object with registrations array and pagination info
 */
export async function getVendorWorkshopRegistrations(vendorId, workshopId, options = {}) {
  const {
    page = 1,
    limit = 20,
    status = null,
    paymentStatus = null,
    search = null,
  } = options;

  // First verify the workshop belongs to the vendor
  const workshopCheck = await query(
    `SELECT id, title, capacity FROM workshops WHERE id = $1 AND created_by = $2`,
    [workshopId, vendorId]
  );

  if (workshopCheck.rows.length === 0) {
    throw new Error('Workshop not found or does not belong to vendor');
  }

  const workshop = workshopCheck.rows[0];
  const offset = (page - 1) * limit;
  const whereConditions = ['wr.workshop_id = $1'];
  const queryParams = [workshopId];
  let paramIndex = 2;

  // Filter by registration status
  if (status) {
    whereConditions.push(`wr.registration_status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  // Filter by payment status
  if (paymentStatus) {
    whereConditions.push(`wr.payment_status = $${paramIndex}`);
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
    FROM workshop_registrations wr
    INNER JOIN users u ON u.id = wr.user_id
    ${whereClause}
  `;
  const countResult = await query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].total, 10);

  // Get registrations
  const registrationsQuery = `
    SELECT 
      wr.id,
      wr.workshop_id,
      wr.user_id,
      wr.order_id,
      wr.registered_at,
      wr.registration_status,
      wr.payment_status,
      wr.slot_number,
      wr.slot_booked_at,
      wr.waitlist_position,
      wr.created_at,
      wr.updated_at,
      u.first_name,
      u.last_name,
      u.email,
      u.avatar_url
    FROM workshop_registrations wr
    INNER JOIN users u ON u.id = wr.user_id
    ${whereClause}
    ORDER BY 
      CASE WHEN wr.slot_number IS NOT NULL THEN 0 ELSE 1 END,
      wr.slot_number ASC NULLS LAST,
      wr.waitlist_position ASC NULLS LAST,
      wr.registered_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  queryParams.push(limit, offset);

  const registrationsResult = await query(registrationsQuery, queryParams);

  const registrations = registrationsResult.rows.map(row => ({
    id: row.id,
    workshopId: row.workshop_id,
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
    workshop: {
      id: workshop.id,
      title: workshop.title,
      capacity: workshop.capacity,
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
 * Get workshop registration statistics
 * @param {string} vendorId - Vendor user UUID
 * @param {string} workshopId - Workshop UUID
 * @returns {Promise<Object>} Registration statistics object
 */
export async function getWorkshopRegistrationStats(vendorId, workshopId) {
  // First verify the workshop belongs to the vendor
  const workshopCheck = await query(
    `SELECT id, title, capacity, price, is_free FROM workshops WHERE id = $1 AND created_by = $2`,
    [workshopId, vendorId]
  );

  if (workshopCheck.rows.length === 0) {
    throw new Error('Workshop not found or does not belong to vendor');
  }

  const workshop = workshopCheck.rows[0];

  const statsQuery = `
    SELECT 
      COUNT(*) as total_registrations,
      COUNT(*) FILTER (WHERE wr.registration_status = 'registered') as confirmed_registrations,
      COUNT(*) FILTER (WHERE wr.registration_status = 'cancelled') as cancelled_registrations,
      COUNT(*) FILTER (WHERE wr.registration_status = 'attended') as attended_registrations,
      COUNT(*) FILTER (WHERE wr.registration_status = 'no_show') as no_show_registrations,
      COUNT(*) FILTER (WHERE wr.payment_status = 'paid') as paid_registrations,
      COUNT(*) FILTER (WHERE wr.slot_number IS NOT NULL) as slots_booked,
      COUNT(*) FILTER (WHERE wr.waitlist_position IS NOT NULL) as waitlist_count,
      COALESCE(SUM(CASE WHEN wr.payment_status = 'paid' AND p.status = 'captured' AND o.final_amount IS NOT NULL THEN o.final_amount ELSE 0 END), 0) as total_revenue
    FROM workshop_registrations wr
    LEFT JOIN orders o ON wr.order_id = o.id
    LEFT JOIN payments p ON p.order_id = o.id
    WHERE wr.workshop_id = $1
  `;

  const statsResult = await query(statsQuery, [workshopId]);
  const stats = statsResult.rows[0];

  const totalRegistrations = parseInt(stats.total_registrations, 10);
  const slotsBooked = parseInt(stats.slots_booked, 10);
  const capacity = workshop.capacity;
  const availableSlots = capacity ? Math.max(0, capacity - slotsBooked) : null;

  return {
    workshop: {
      id: workshop.id,
      title: workshop.title,
      capacity,
      price: workshop.is_free ? 0 : parseFloat(workshop.price || 0),
      isFree: workshop.is_free,
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
 * Get workshop slot availability
 * @param {string} workshopId - Workshop UUID
 * @returns {Promise<Object>} Slot availability information
 */
export async function getWorkshopSlotAvailability(workshopId) {
  const workshopQuery = `
    SELECT id, title, capacity FROM workshops WHERE id = $1
  `;
  const workshopResult = await query(workshopQuery, [workshopId]);

  if (workshopResult.rows.length === 0) {
    throw new Error('Workshop not found');
  }

  const workshop = workshopResult.rows[0];
  const capacity = workshop.capacity;

  if (!capacity) {
    return {
      workshopId: workshop.id,
      workshopTitle: workshop.title,
      hasCapacity: false,
      capacity: null,
      availableSlots: null,
      bookedSlots: 0,
      isFull: false,
    };
  }

  const bookedQuery = `
    SELECT COUNT(*) as booked_count
    FROM workshop_registrations
    WHERE workshop_id = $1 AND slot_number IS NOT NULL AND registration_status != 'cancelled'
  `;
  const bookedResult = await query(bookedQuery, [workshopId]);
  const bookedSlots = parseInt(bookedResult.rows[0].booked_count, 10);
  const availableSlots = Math.max(0, capacity - bookedSlots);

  return {
    workshopId: workshop.id,
    workshopTitle: workshop.title,
    hasCapacity: true,
    capacity,
    availableSlots,
    bookedSlots,
    isFull: bookedSlots >= capacity,
  };
}

/**
 * Get workshop waitlist
 * @param {string} workshopId - Workshop UUID
 * @returns {Promise<Array>} Array of waitlist registrations
 */
export async function getWorkshopWaitlist(workshopId) {
  const waitlistQuery = `
    SELECT 
      wr.id,
      wr.user_id,
      wr.waitlist_position,
      wr.registered_at,
      u.first_name,
      u.last_name,
      u.email,
      u.avatar_url
    FROM workshop_registrations wr
    INNER JOIN users u ON u.id = wr.user_id
    WHERE wr.workshop_id = $1 
      AND wr.waitlist_position IS NOT NULL
      AND wr.registration_status != 'cancelled'
    ORDER BY wr.waitlist_position ASC
  `;

  const result = await query(waitlistQuery, [workshopId]);

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
 * Get all workshop registrations across vendor's workshops
 * @param {string} vendorId - Vendor user UUID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.workshopId - Filter by specific workshop (optional)
 * @param {string} options.status - Filter by registration status (optional)
 * @param {string} options.search - Search in student name/email or workshop title (optional)
 * @returns {Promise<Object>} Object with registrations array and pagination info
 */
export async function getVendorAllWorkshopRegistrations(vendorId, options = {}) {
  const {
    page = 1,
    limit = 20,
    workshopId = null,
    status = null,
    search = null,
  } = options;

  const offset = (page - 1) * limit;
  const whereConditions = ['w.created_by = $1'];
  const queryParams = [vendorId];
  let paramIndex = 2;

  // Filter by workshop
  if (workshopId) {
    whereConditions.push(`wr.workshop_id = $${paramIndex}`);
    queryParams.push(workshopId);
    paramIndex++;
  }

  // Filter by registration status
  if (status) {
    whereConditions.push(`wr.registration_status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  // Search in student name/email or workshop title
  if (search) {
    whereConditions.push(`(
      u.first_name ILIKE $${paramIndex} OR 
      u.last_name ILIKE $${paramIndex} OR 
      u.email ILIKE $${paramIndex} OR
      CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramIndex} OR
      w.title ILIKE $${paramIndex}
    )`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM workshop_registrations wr
    INNER JOIN workshops w ON w.id = wr.workshop_id
    INNER JOIN users u ON u.id = wr.user_id
    ${whereClause}
  `;
  const countResult = await query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].total, 10);

  // Get registrations
  const registrationsQuery = `
    SELECT 
      wr.id,
      wr.workshop_id,
      wr.user_id,
      wr.order_id,
      wr.registered_at,
      wr.registration_status,
      wr.payment_status,
      wr.slot_number,
      wr.slot_booked_at,
      wr.waitlist_position,
      wr.created_at,
      wr.updated_at,
      w.title as workshop_title,
      w.start_date as workshop_start_date,
      u.first_name,
      u.last_name,
      u.email,
      u.avatar_url
    FROM workshop_registrations wr
    INNER JOIN workshops w ON w.id = wr.workshop_id
    INNER JOIN users u ON u.id = wr.user_id
    ${whereClause}
    ORDER BY wr.registered_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  queryParams.push(limit, offset);

  const registrationsResult = await query(registrationsQuery, queryParams);

  const registrations = registrationsResult.rows.map(row => ({
    id: row.id,
    workshop: {
      id: row.workshop_id,
      title: row.workshop_title,
      startDate: row.workshop_start_date,
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
