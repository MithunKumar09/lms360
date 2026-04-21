/**
 * Vendor Assignments Database Utilities
 * 
 * Provides vendor-specific assignment queries.
 * All queries filter by vendor's courses (courses.created_by = vendorId).
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/vendor/assignments
 */

import { query, getClient } from '../index.js';

/**
 * Get vendor's assignments
 * @param {string} vendorId - Vendor user UUID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.courseId - Filter by course ID (optional)
 * @param {string} options.status - Filter by status (optional)
 * @param {string} options.search - Search in title (optional)
 * @returns {Promise<Object>} Object with assignments array and pagination info
 */
export async function getVendorAssignments(vendorId, options = {}) {
  const {
    page = 1,
    limit = 20,
    courseId = null,
    status = null,
    search = null,
  } = options;

  const offset = (page - 1) * limit;
  const whereConditions = ['c.created_by = $1'];
  const queryParams = [vendorId];
  let paramIndex = 2;

  // Filter by course (must be vendor's course)
  if (courseId) {
    whereConditions.push(`a.course_id = $${paramIndex}`);
    queryParams.push(courseId);
    paramIndex++;
  }

  // Filter by status
  if (status) {
    whereConditions.push(`a.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  // Search in title
  if (search) {
    whereConditions.push(`a.title ILIKE $${paramIndex}`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM assignments a
    INNER JOIN courses c ON a.course_id = c.id
    ${whereClause}
  `;
  const countResult = await query(countQuery, queryParams);
  const total = parseInt(
    (Array.isArray(countResult?.rows) && countResult.rows[0]?.total) || 0,
    10
  );

  // Get assignments with course info and submission count
  const assignmentsQuery = `
    SELECT 
      a.id,
      a.course_id,
      a.created_by,
      a.title,
      a.description,
      a.instructions,
      a.max_marks,
      a.passing_marks,
      a.due_date,
      a.allow_late_submission,
      a.late_submission_penalty,
      a.max_file_size_mb,
      a.allowed_file_types,
      a.status,
      a.created_at,
      a.updated_at,
      c.title as course_title,
      c.slug as course_slug,
      COUNT(DISTINCT asub.id) as submission_count
    FROM assignments a
    INNER JOIN courses c ON a.course_id = c.id
    LEFT JOIN assignment_submissions asub ON asub.assignment_id = a.id
    ${whereClause}
    GROUP BY a.id, a.course_id, a.created_by, a.title, a.description, a.instructions,
             a.max_marks, a.passing_marks, a.due_date, a.allow_late_submission,
             a.late_submission_penalty, a.max_file_size_mb, a.allowed_file_types,
             a.status, a.created_at, a.updated_at, c.title, c.slug
    ORDER BY a.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  queryParams.push(limit, offset);

  const assignmentsResult = await query(assignmentsQuery, queryParams);

  const assignments = Array.isArray(assignmentsResult?.rows)
    ? assignmentsResult.rows
        .filter(row => row && typeof row === 'object')
        .map(row => ({
    id: row.id,
    courseId: row.course_id,
    courseTitle: row.course_title,
    courseSlug: row.course_slug,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    instructions: row.instructions,
    maxMarks: parseFloat(row.max_marks),
    passingMarks: parseFloat(row.passing_marks),
    dueDate: row.due_date,
    allowLateSubmission: row.allow_late_submission,
    lateSubmissionPenalty: parseFloat(row.late_submission_penalty || 0),
    maxFileSizeMb: row.max_file_size_mb,
    allowedFileTypes: row.allowed_file_types || [],
    status: row.status,
    submissionCount: parseInt(row.submission_count, 10),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
    : [];

  return {
    assignments,
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
 * Create assignment for vendor's course
 * @param {string} vendorId - Vendor user UUID
 * @param {Object} data - Assignment data
 * @returns {Promise<Object>} Created assignment object
 */
export async function createVendorAssignment(vendorId, data) {
  const {
    courseId,
    title,
    description,
    instructions,
    maxMarks,
    passingMarks,
    dueDate,
    allowLateSubmission,
    lateSubmissionPenalty,
    maxFileSizeMb,
    allowedFileTypes,
    status = 'draft',
  } = data;

  // Verify course belongs to vendor
  const courseCheck = await query(
    `SELECT id, title FROM courses WHERE id = $1 AND created_by = $2`,
    [courseId, vendorId]
  );

  if (courseCheck.rows.length === 0) {
    throw new Error('Course not found or does not belong to vendor');
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO assignments (
        course_id,
        created_by,
        title,
        description,
        instructions,
        max_marks,
        passing_marks,
        due_date,
        allow_late_submission,
        late_submission_penalty,
        max_file_size_mb,
        allowed_file_types,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      courseId,
      vendorId,
      title,
      description || null,
      instructions || null,
      maxMarks || 100,
      passingMarks || 50,
      dueDate,
      allowLateSubmission || false,
      lateSubmissionPenalty || 0,
      maxFileSizeMb || 10,
      allowedFileTypes || [],
      status,
    ]);

    await client.query('COMMIT');

    const assignment = result.rows[0];
    return {
      id: assignment.id,
      courseId: assignment.course_id,
      createdBy: assignment.created_by,
      title: assignment.title,
      description: assignment.description,
      instructions: assignment.instructions,
      maxMarks: parseFloat(assignment.max_marks),
      passingMarks: parseFloat(assignment.passing_marks),
      dueDate: assignment.due_date,
      allowLateSubmission: assignment.allow_late_submission,
      lateSubmissionPenalty: parseFloat(assignment.late_submission_penalty || 0),
      maxFileSizeMb: assignment.max_file_size_mb,
      allowedFileTypes: assignment.allowed_file_types || [],
      status: assignment.status,
      createdAt: assignment.created_at,
      updatedAt: assignment.updated_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update vendor assignment
 * @param {string} vendorId - Vendor user UUID
 * @param {string} assignmentId - Assignment UUID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated assignment object
 */
export async function updateVendorAssignment(vendorId, assignmentId, data) {
  // Verify assignment belongs to vendor's course
  const assignmentCheck = await query(
    `SELECT a.id, a.course_id, c.created_by
     FROM assignments a
     INNER JOIN courses c ON a.course_id = c.id
     WHERE a.id = $1 AND c.created_by = $2`,
    [assignmentId, vendorId]
  );

  if (assignmentCheck.rows.length === 0) {
    throw new Error('Assignment not found or does not belong to vendor');
  }

  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  const allowedFields = [
    'title',
    'description',
    'instructions',
    'max_marks',
    'passing_marks',
    'due_date',
    'allow_late_submission',
    'late_submission_penalty',
    'max_file_size_mb',
    'allowed_file_types',
    'status',
  ];

  for (const [key, value] of Object.entries(data)) {
    const dbKey = key
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
    
    if (allowedFields.includes(dbKey) && value !== undefined) {
      updateFields.push(`${dbKey} = $${paramIndex}`);
      updateValues.push(value);
      paramIndex++;
    }
  }

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  // Add updated_at
  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

  const updateQuery = `
    UPDATE assignments
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  updateValues.push(assignmentId);

  const result = await query(updateQuery, updateValues);

  if (result.rows.length === 0) {
    throw new Error('Failed to update assignment');
  }

  const assignment = result.rows[0];
  return {
    id: assignment.id,
    courseId: assignment.course_id,
    createdBy: assignment.created_by,
    title: assignment.title,
    description: assignment.description,
    instructions: assignment.instructions,
    maxMarks: parseFloat(assignment.max_marks),
    passingMarks: parseFloat(assignment.passing_marks),
    dueDate: assignment.due_date,
    allowLateSubmission: assignment.allow_late_submission,
    lateSubmissionPenalty: parseFloat(assignment.late_submission_penalty || 0),
    maxFileSizeMb: assignment.max_file_size_mb,
    allowedFileTypes: assignment.allowed_file_types || [],
    status: assignment.status,
    createdAt: assignment.created_at,
    updatedAt: assignment.updated_at,
  };
}

/**
 * Delete vendor assignment
 * @param {string} vendorId - Vendor user UUID
 * @param {string} assignmentId - Assignment UUID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteVendorAssignment(vendorId, assignmentId) {
  // Verify assignment belongs to vendor's course
  const assignmentCheck = await query(
    `SELECT a.id, a.course_id, c.created_by
     FROM assignments a
     INNER JOIN courses c ON a.course_id = c.id
     WHERE a.id = $1 AND c.created_by = $2`,
    [assignmentId, vendorId]
  );

  if (assignmentCheck.rows.length === 0) {
    throw new Error('Assignment not found or does not belong to vendor');
  }

  // Delete assignment (CASCADE will handle related records)
  const deleteQuery = `DELETE FROM assignments WHERE id = $1`;
  const result = await query(deleteQuery, [assignmentId]);

  return result.rowCount > 0;
}

/**
 * Get vendor's courses for assignment creation
 * @param {string} vendorId - Vendor user UUID
 * @returns {Promise<Array>} Array of course objects
 */
export async function getVendorCoursesForAssignment(vendorId) {
  const coursesQuery = `
    SELECT 
      id,
      title,
      slug,
      status
    FROM courses
    WHERE created_by = $1 AND status = 'published'
    ORDER BY title ASC
  `;

  const result = await query(coursesQuery, [vendorId]);

  return result.rows.map(row => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
  }));
}
