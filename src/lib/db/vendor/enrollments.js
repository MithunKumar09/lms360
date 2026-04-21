/**
 * Vendor Enrollments Database Utilities
 * 
 * Provides vendor-specific enrollment queries.
 * All queries filter by vendor's courses (created_by = vendorId).
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/vendor/enrollments
 */

import { query, getClient } from '../index.js';

/**
 * Get vendor's courses with enrollment statistics
 * @param {string} vendorId - Vendor user UUID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 12)
 * @param {string} options.status - Filter by course status (optional)
 * @param {string} options.search - Search in course title (optional)
 * @returns {Promise<Object>} Object with courses array and pagination info
 */
export async function getVendorCourseEnrollments(vendorId, options = {}) {
  const {
    page = 1,
    limit = 12,
    status = null,
    search = null,
  } = options;

  const offset = (page - 1) * limit;
  const whereConditions = ['c.created_by = $1'];
  const queryParams = [vendorId];
  let paramIndex = 2;

  // Filter by course status
  if (status) {
    whereConditions.push(`c.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  // Search in course title
  if (search) {
    whereConditions.push(`c.title ILIKE $${paramIndex}`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = whereConditions.length > 0 
    ? `WHERE ${whereConditions.join(' AND ')}`
    : '';

  // Get total count
  const countQuery = `
    SELECT COUNT(DISTINCT c.id) as total
    FROM courses c
    ${whereClause}
  `;
  const countResult = await query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].total, 10);

  // Get courses with enrollment statistics
  const coursesQuery = `
    SELECT 
      c.id,
      c.title,
      c.slug,
      c.status,
      c.created_at,
      c.updated_at,
      -- Enrollment statistics
      COALESCE(COUNT(DISTINCT ce.id), 0) as total_enrollments,
      COALESCE(COUNT(DISTINCT ce.id) FILTER (WHERE ce.enrollment_status = 'active'), 0) as active_enrollments,
      COALESCE(COUNT(DISTINCT ce.id) FILTER (WHERE ce.enrollment_status = 'completed'), 0) as completed_enrollments,
      COALESCE(AVG(ce.progress_percentage), 0) as average_progress
    FROM courses c
    LEFT JOIN course_enrollments ce ON ce.course_id = c.id
    ${whereClause}
    GROUP BY c.id, c.title, c.slug, c.status, c.created_at, c.updated_at
    ORDER BY c.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  queryParams.push(limit, offset);

  const coursesResult = await query(coursesQuery, queryParams);

  const courses = coursesResult.rows.map(row => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    enrollmentStats: {
      total: parseInt(row.total_enrollments, 10),
      active: parseInt(row.active_enrollments, 10),
      completed: parseInt(row.completed_enrollments, 10),
      averageProgress: parseFloat(row.average_progress) || 0,
    },
  }));

  return {
    courses,
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
 * Get enrollment statistics for a specific vendor course
 * @param {string} vendorId - Vendor user UUID
 * @param {string} courseId - Course UUID
 * @returns {Promise<Object>} Enrollment statistics object
 */
export async function getVendorCourseEnrollmentStats(vendorId, courseId) {
  // First verify the course belongs to the vendor
  const courseCheck = await query(
    `SELECT id, title FROM courses WHERE id = $1 AND created_by = $2`,
    [courseId, vendorId]
  );

  if (courseCheck.rows.length === 0) {
    throw new Error('Course not found or does not belong to vendor');
  }

  const statsQuery = `
    SELECT 
      COUNT(*) as total_enrollments,
      COUNT(*) FILTER (WHERE enrollment_status = 'active') as active_enrollments,
      COUNT(*) FILTER (WHERE enrollment_status = 'completed') as completed_enrollments,
      COUNT(*) FILTER (WHERE enrollment_status = 'dropped') as dropped_enrollments,
      COUNT(*) FILTER (WHERE enrollment_status = 'suspended') as suspended_enrollments,
      AVG(progress_percentage) as average_progress,
      COUNT(*) FILTER (WHERE progress_percentage >= 100) as completed_count,
      COUNT(*) FILTER (WHERE progress_percentage >= 50 AND progress_percentage < 100) as in_progress_count,
      COUNT(*) FILTER (WHERE progress_percentage < 50) as not_started_count
    FROM course_enrollments
    WHERE course_id = $1
  `;

  const statsResult = await query(statsQuery, [courseId]);
  const stats = statsResult.rows[0];

  return {
    course: {
      id: courseCheck.rows[0].id,
      title: courseCheck.rows[0].title,
    },
    enrollments: {
      total: parseInt(stats.total_enrollments, 10),
      active: parseInt(stats.active_enrollments, 10),
      completed: parseInt(stats.completed_enrollments, 10),
      dropped: parseInt(stats.dropped_enrollments, 10),
      suspended: parseInt(stats.suspended_enrollments, 10),
    },
    progress: {
      average: parseFloat(stats.average_progress) || 0,
      completed: parseInt(stats.completed_count, 10),
      inProgress: parseInt(stats.in_progress_count, 10),
      notStarted: parseInt(stats.not_started_count, 10),
    },
  };
}

/**
 * Get enrolled students for vendor's courses
 * @param {string} vendorId - Vendor user UUID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.courseId - Filter by specific course (optional)
 * @param {string} options.status - Filter by enrollment status (optional)
 * @param {string} options.search - Search in student name/email (optional)
 * @param {number} options.minProgress - Minimum progress percentage (optional)
 * @param {number} options.maxProgress - Maximum progress percentage (optional)
 * @returns {Promise<Object>} Object with students array and pagination info
 */
export async function getVendorEnrolledStudents(vendorId, options = {}) {
  const {
    page = 1,
    limit = 20,
    courseId = null,
    status = null,
    search = null,
    minProgress = null,
    maxProgress = null,
  } = options;

  const offset = (page - 1) * limit;
  const whereConditions = ['c.created_by = $1'];
  const queryParams = [vendorId];
  let paramIndex = 2;

  // Filter by course
  if (courseId) {
    whereConditions.push(`ce.course_id = $${paramIndex}`);
    queryParams.push(courseId);
    paramIndex++;
  }

  // Filter by enrollment status
  if (status) {
    whereConditions.push(`ce.enrollment_status = $${paramIndex}`);
    queryParams.push(status);
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

  // Filter by progress range
  if (minProgress !== null) {
    whereConditions.push(`ce.progress_percentage >= $${paramIndex}`);
    queryParams.push(minProgress);
    paramIndex++;
  }

  if (maxProgress !== null) {
    whereConditions.push(`ce.progress_percentage <= $${paramIndex}`);
    queryParams.push(maxProgress);
    paramIndex++;
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  // Get total count
  const countQuery = `
    SELECT COUNT(DISTINCT ce.id) as total
    FROM course_enrollments ce
    INNER JOIN courses c ON c.id = ce.course_id
    INNER JOIN users u ON u.id = ce.user_id
    ${whereClause}
  `;
  const countResult = await query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].total, 10);

  // Get enrolled students
  const studentsQuery = `
    SELECT 
      ce.id as enrollment_id,
      ce.enrollment_status,
      ce.progress_percentage,
      ce.enrolled_at,
      ce.last_accessed_at,
      ce.completed_at,
      u.id as user_id,
      u.first_name,
      u.last_name,
      u.email,
      u.avatar_url,
      c.id as course_id,
      c.title as course_title,
      c.slug as course_slug
    FROM course_enrollments ce
    INNER JOIN courses c ON c.id = ce.course_id
    INNER JOIN users u ON u.id = ce.user_id
    ${whereClause}
    ORDER BY ce.enrolled_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  queryParams.push(limit, offset);

  const studentsResult = await query(studentsQuery, queryParams);

  const students = studentsResult.rows.map(row => ({
    enrollmentId: row.enrollment_id,
    user: {
      id: row.user_id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      avatarUrl: row.avatar_url,
      fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email,
    },
    course: {
      id: row.course_id,
      title: row.course_title,
      slug: row.course_slug,
    },
    enrollment: {
      status: row.enrollment_status,
      progress: parseFloat(row.progress_percentage) || 0,
      enrolledAt: row.enrolled_at,
      lastAccessedAt: row.last_accessed_at,
      completedAt: row.completed_at,
    },
  }));

  return {
    students,
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
 * Get enrolled students for a specific course
 * @param {string} vendorId - Vendor user UUID
 * @param {string} courseId - Course UUID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.status - Filter by enrollment status (optional)
 * @param {string} options.search - Search in student name/email (optional)
 * @returns {Promise<Object>} Object with students array and pagination info
 */
export async function getCourseEnrolledStudents(vendorId, courseId, options = {}) {
  // First verify the course belongs to the vendor
  const courseCheck = await query(
    `SELECT id, title FROM courses WHERE id = $1 AND created_by = $2`,
    [courseId, vendorId]
  );

  if (courseCheck.rows.length === 0) {
    throw new Error('Course not found or does not belong to vendor');
  }

  return getVendorEnrolledStudents(vendorId, {
    ...options,
    courseId,
  });
}
