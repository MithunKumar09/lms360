/**
 * Vendor Quizzes Database Utilities
 * 
 * Provides vendor-specific quiz queries.
 * All queries filter by vendor's courses (courses.created_by = vendorId).
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/vendor/quizzes
 */

import { query, getClient } from '../index.js';

/**
 * Get vendor's quizzes
 * @param {string} vendorId - Vendor user UUID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {string} options.courseId - Filter by course ID (optional)
 * @param {string} options.status - Filter by status (optional)
 * @param {string} options.search - Search in title (optional)
 * @returns {Promise<Object>} Object with quizzes array and pagination info
 */
export async function getVendorQuizzes(vendorId, options = {}) {
  const {
    page = 1,
    limit = 20,
    courseId = null,
    status = null,
    search = null,
  } = options;

  const offset = (page - 1) * limit;
  const whereConditions = ['(q.course_id IS NULL OR c.created_by = $1)'];
  const queryParams = [vendorId];
  let paramIndex = 2;

  // Filter by course (must be vendor's course or NULL for standalone)
  if (courseId) {
    whereConditions.push(`q.course_id = $${paramIndex}`);
    queryParams.push(courseId);
    paramIndex++;
  } else {
    // Only show quizzes linked to vendor's courses or standalone quizzes created by vendor
    whereConditions.push(`(q.course_id IS NULL AND q.created_by = $1) OR (q.course_id IS NOT NULL AND c.created_by = $1)`);
  }

  // Filter by status
  if (status) {
    whereConditions.push(`q.status = $${paramIndex}`);
    queryParams.push(status);
    paramIndex++;
  }

  // Search in title
  if (search) {
    whereConditions.push(`q.title ILIKE $${paramIndex}`);
    queryParams.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM quizzes q
    LEFT JOIN courses c ON q.course_id = c.id
    ${whereClause}
  `;
  const countResult = await query(countQuery, queryParams);
  const total = parseInt(
    (Array.isArray(countResult?.rows) && countResult.rows[0]?.total) || 0,
    10
  );

  // Get quizzes with course info and attempt count
  const quizzesQuery = `
    SELECT 
      q.id,
      q.course_id,
      q.created_by,
      q.title,
      q.description,
      q.instructions,
      q.total_marks,
      q.passing_marks,
      q.time_limit_minutes,
      q.max_attempts,
      q.show_results_immediately,
      q.show_correct_answers,
      q.randomize_questions,
      q.randomize_options,
      q.status,
      q.start_date,
      q.end_date,
      q.created_at,
      q.updated_at,
      c.title as course_title,
      c.slug as course_slug,
      COUNT(DISTINCT qa.id) as attempt_count
    FROM quizzes q
    LEFT JOIN courses c ON q.course_id = c.id
    LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
    ${whereClause}
    GROUP BY q.id, q.course_id, q.created_by, q.title, q.description, q.instructions,
             q.total_marks, q.passing_marks, q.time_limit_minutes, q.max_attempts,
             q.show_results_immediately, q.show_correct_answers, q.randomize_questions,
             q.randomize_options, q.status, q.start_date, q.end_date, q.created_at,
             q.updated_at, c.title, c.slug
    ORDER BY q.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  queryParams.push(limit, offset);

  const quizzesResult = await query(quizzesQuery, queryParams);

  const quizzes = Array.isArray(quizzesResult?.rows)
    ? quizzesResult.rows
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
    totalMarks: parseFloat(row.total_marks),
    passingMarks: parseFloat(row.passing_marks),
    timeLimitMinutes: row.time_limit_minutes,
    maxAttempts: row.max_attempts,
    showResultsImmediately: row.show_results_immediately,
    showCorrectAnswers: row.show_correct_answers,
    randomizeQuestions: row.randomize_questions,
    randomizeOptions: row.randomize_options,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    attemptCount: parseInt(row.attempt_count, 10),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
    : [];

  return {
    quizzes,
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
 * Create quiz for vendor's course
 * @param {string} vendorId - Vendor user UUID
 * @param {Object} data - Quiz data
 * @returns {Promise<Object>} Created quiz object
 */
export async function createVendorQuiz(vendorId, data) {
  const {
    courseId,
    title,
    description,
    instructions,
    totalMarks,
    passingMarks,
    timeLimitMinutes,
    maxAttempts,
    showResultsImmediately,
    showCorrectAnswers,
    randomizeQuestions,
    randomizeOptions,
    status = 'draft',
    startDate,
    endDate,
  } = data;

  // If courseId is provided, verify course belongs to vendor
  if (courseId) {
    const courseCheck = await query(
      `SELECT id, title FROM courses WHERE id = $1 AND created_by = $2`,
      [courseId, vendorId]
    );

    if (courseCheck.rows.length === 0) {
      throw new Error('Course not found or does not belong to vendor');
    }
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const insertQuery = `
      INSERT INTO quizzes (
        course_id,
        created_by,
        title,
        description,
        instructions,
        total_marks,
        passing_marks,
        time_limit_minutes,
        max_attempts,
        show_results_immediately,
        show_correct_answers,
        randomize_questions,
        randomize_options,
        status,
        start_date,
        end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      courseId || null,
      vendorId,
      title,
      description || null,
      instructions || null,
      totalMarks || 100,
      passingMarks || 50,
      timeLimitMinutes || null,
      maxAttempts || 1,
      showResultsImmediately || false,
      showCorrectAnswers || false,
      randomizeQuestions || false,
      randomizeOptions || false,
      status,
      startDate || null,
      endDate || null,
    ]);

    await client.query('COMMIT');

    const quiz = result.rows[0];
    return {
      id: quiz.id,
      courseId: quiz.course_id,
      createdBy: quiz.created_by,
      title: quiz.title,
      description: quiz.description,
      instructions: quiz.instructions,
      totalMarks: parseFloat(quiz.total_marks),
      passingMarks: parseFloat(quiz.passing_marks),
      timeLimitMinutes: quiz.time_limit_minutes,
      maxAttempts: quiz.max_attempts,
      showResultsImmediately: quiz.show_results_immediately,
      showCorrectAnswers: quiz.show_correct_answers,
      randomizeQuestions: quiz.randomize_questions,
      randomizeOptions: quiz.randomize_options,
      status: quiz.status,
      startDate: quiz.start_date,
      endDate: quiz.end_date,
      createdAt: quiz.created_at,
      updatedAt: quiz.updated_at,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update vendor quiz
 * @param {string} vendorId - Vendor user UUID
 * @param {string} quizId - Quiz UUID
 * @param {Object} data - Update data
 * @returns {Promise<Object>} Updated quiz object
 */
export async function updateVendorQuiz(vendorId, quizId, data) {
  // Verify quiz belongs to vendor (either standalone or vendor's course)
  const quizCheck = await query(
    `SELECT q.id, q.course_id, c.created_by
     FROM quizzes q
     LEFT JOIN courses c ON q.course_id = c.id
     WHERE q.id = $1 AND (
       (q.course_id IS NULL AND q.created_by = $2) OR
       (q.course_id IS NOT NULL AND c.created_by = $2)
     )`,
    [quizId, vendorId]
  );

  if (quizCheck.rows.length === 0) {
    throw new Error('Quiz not found or does not belong to vendor');
  }

  // If updating courseId, verify new course belongs to vendor
  if (data.courseId !== undefined) {
    if (data.courseId) {
      const courseCheck = await query(
        `SELECT id FROM courses WHERE id = $1 AND created_by = $2`,
        [data.courseId, vendorId]
      );

      if (courseCheck.rows.length === 0) {
        throw new Error('Course not found or does not belong to vendor');
      }
    }
  }

  const updateFields = [];
  const updateValues = [];
  let paramIndex = 1;

  const allowedFields = [
    'course_id',
    'title',
    'description',
    'instructions',
    'total_marks',
    'passing_marks',
    'time_limit_minutes',
    'max_attempts',
    'show_results_immediately',
    'show_correct_answers',
    'randomize_questions',
    'randomize_options',
    'status',
    'start_date',
    'end_date',
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
    UPDATE quizzes
    SET ${updateFields.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;
  updateValues.push(quizId);

  const result = await query(updateQuery, updateValues);

  if (result.rows.length === 0) {
    throw new Error('Failed to update quiz');
  }

  const quiz = result.rows[0];
  return {
    id: quiz.id,
    courseId: quiz.course_id,
    createdBy: quiz.created_by,
    title: quiz.title,
    description: quiz.description,
    instructions: quiz.instructions,
    totalMarks: parseFloat(quiz.total_marks),
    passingMarks: parseFloat(quiz.passing_marks),
    timeLimitMinutes: quiz.time_limit_minutes,
    maxAttempts: quiz.max_attempts,
    showResultsImmediately: quiz.show_results_immediately,
    showCorrectAnswers: quiz.show_correct_answers,
    randomizeQuestions: quiz.randomize_questions,
    randomizeOptions: quiz.randomize_options,
    status: quiz.status,
    startDate: quiz.start_date,
    endDate: quiz.end_date,
    createdAt: quiz.created_at,
    updatedAt: quiz.updated_at,
  };
}

/**
 * Delete vendor quiz
 * @param {string} vendorId - Vendor user UUID
 * @param {string} quizId - Quiz UUID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteVendorQuiz(vendorId, quizId) {
  // Verify quiz belongs to vendor
  const quizCheck = await query(
    `SELECT q.id, q.course_id, c.created_by
     FROM quizzes q
     LEFT JOIN courses c ON q.course_id = c.id
     WHERE q.id = $1 AND (
       (q.course_id IS NULL AND q.created_by = $2) OR
       (q.course_id IS NOT NULL AND c.created_by = $2)
     )`,
    [quizId, vendorId]
  );

  if (quizCheck.rows.length === 0) {
    throw new Error('Quiz not found or does not belong to vendor');
  }

  // Delete quiz (CASCADE will handle related records)
  const deleteQuery = `DELETE FROM quizzes WHERE id = $1`;
  const result = await query(deleteQuery, [quizId]);

  return result.rowCount > 0;
}

/**
 * Get vendor's courses for quiz creation
 * @param {string} vendorId - Vendor user UUID
 * @returns {Promise<Array>} Array of course objects
 */
export async function getVendorCoursesForQuiz(vendorId) {
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
