/**
 * Course Inquiries Database Functions
 * 
 * Functions for managing course inquiries/contact form submissions
 */

import { query } from '../index.js';

/**
 * Create a new course inquiry
 * @param {string} courseId - Course ID
 * @param {string} name - Inquirer name
 * @param {string} email - Inquirer email
 * @param {string} message - Inquiry message
 * @returns {Promise<Object>} Created inquiry
 */
export async function createCourseInquiry(courseId, name, email, message) {
  const insertQuery = `
    INSERT INTO course_inquiries (course_id, name, email, message, status)
    VALUES ($1, $2, $3, $4, 'new')
    RETURNING *
  `;

  try {
    const result = await query(insertQuery, [courseId, name, email, message]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating course inquiry:', error);
    throw error;
  }
}

/**
 * Get inquiries for a course (admin/superadmin)
 * @param {string} courseId - Course ID (optional, if null gets all)
 * @param {string} status - Filter by status (optional)
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Number of inquiries per page
 * @returns {Promise<Object>} Inquiries with pagination
 */
export async function getCourseInquiries(courseId = null, status = null, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (courseId) {
    whereClause += ` AND course_id = $${paramIndex}`;
    params.push(courseId);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  const inquiriesQuery = `
    SELECT 
      ci.*,
      c.title as course_title,
      c.slug as course_slug
    FROM course_inquiries ci
    LEFT JOIN courses c ON ci.course_id = c.id
    ${whereClause}
    ORDER BY ci.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM course_inquiries ci
    ${whereClause}
  `;

  try {
    params.push(limit, offset);
    const [inquiriesResult, countResult] = await Promise.all([
      query(inquiriesQuery, params),
      query(countQuery, params.slice(0, -2)) // Remove limit and offset for count
    ]);

    const inquiries = inquiriesResult.rows || [];
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    return {
      inquiries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + inquiries.length < total
      }
    };
  } catch (error) {
    console.error('Error fetching course inquiries:', error);
    throw error;
  }
}

/**
 * Get a single inquiry by ID
 * @param {string} inquiryId - Inquiry ID
 * @returns {Promise<Object>} Inquiry data
 */
export async function getInquiryById(inquiryId) {
  const getQuery = `
    SELECT 
      ci.*,
      c.title as course_title,
      c.slug as course_slug
    FROM course_inquiries ci
    LEFT JOIN courses c ON ci.course_id = c.id
    WHERE ci.id = $1
  `;

  try {
    const result = await query(getQuery, [inquiryId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching inquiry:', error);
    throw error;
  }
}

/**
 * Update inquiry status
 * @param {string} inquiryId - Inquiry ID
 * @param {string} status - New status (new, read, replied, archived)
 * @returns {Promise<Object>} Updated inquiry
 */
export async function updateInquiryStatus(inquiryId, status) {
  const validStatuses = ['new', 'read', 'replied', 'archived'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  const updateQuery = `
    UPDATE course_inquiries
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
  `;

  try {
    const result = await query(updateQuery, [status, inquiryId]);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating inquiry status:', error);
    throw error;
  }
}

/**
 * Delete an inquiry
 * @param {string} inquiryId - Inquiry ID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteInquiry(inquiryId) {
  const deleteQuery = `
    DELETE FROM course_inquiries
    WHERE id = $1
    RETURNING id
  `;

  try {
    const result = await query(deleteQuery, [inquiryId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting inquiry:', error);
    throw error;
  }
}

/**
 * Get inquiry statistics
 * @param {string} courseId - Course ID (optional)
 * @returns {Promise<Object>} Statistics
 */
export async function getInquiryStatistics(courseId = null) {
  let whereClause = '';
  const params = [];

  if (courseId) {
    whereClause = 'WHERE course_id = $1';
    params.push(courseId);
  }

  const statsQuery = `
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
      COUNT(CASE WHEN status = 'read' THEN 1 END) as read_count,
      COUNT(CASE WHEN status = 'replied' THEN 1 END) as replied_count,
      COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_count
    FROM course_inquiries
    ${whereClause}
  `;

  try {
    const result = await query(statsQuery, params);
    const stats = result.rows[0] || {};
    return {
      total: parseInt(stats.total || 0, 10),
      new: parseInt(stats.new_count || 0, 10),
      read: parseInt(stats.read_count || 0, 10),
      replied: parseInt(stats.replied_count || 0, 10),
      archived: parseInt(stats.archived_count || 0, 10)
    };
  } catch (error) {
    console.error('Error fetching inquiry statistics:', error);
    throw error;
  }
}

