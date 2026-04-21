/**
 * Instructor Reviews Database Functions
 * 
 * Functions for managing instructor reviews and ratings from students
 */

import { query } from '../index.js';

/**
 * Create or update an instructor review (upsert)
 * @param {string} instructorId - Instructor ID
 * @param {string} studentId - Student ID
 * @param {number} rating - Rating (1-5)
 * @param {string|null} feedbackText - Optional feedback text
 * @returns {Promise<Object>} Created or updated review
 */
export async function createInstructorReview(instructorId, studentId, rating, feedbackText = null) {
  const insertQuery = `
    INSERT INTO instructor_reviews (instructor_id, student_id, rating, feedback_text)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (instructor_id, student_id) 
    DO UPDATE SET 
      rating = EXCLUDED.rating,
      feedback_text = EXCLUDED.feedback_text,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  try {
    const result = await query(insertQuery, [instructorId, studentId, rating, feedbackText]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating/updating instructor review:', error);
    throw error;
  }
}

/**
 * Get reviews for an instructor with pagination
 * @param {string} instructorId - Instructor ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (1-based)
 * @param {number} options.limit - Number of reviews per page
 * @param {number|null} options.rating - Filter by rating (optional)
 * @returns {Promise<Object>} Reviews data with pagination info
 */
export async function getInstructorReviews(instructorId, options = {}) {
  const { page = 1, limit = 10, rating = null } = options;
  const offset = (page - 1) * limit;

  // Build WHERE clause and parameters
  let whereClause = 'WHERE ir.instructor_id = $1';
  const baseQueryParams = [instructorId];

  if (rating !== null) {
    whereClause += ` AND ir.rating = $2`;
    baseQueryParams.push(rating);
  }

  // Parameters for reviews query (includes LIMIT and OFFSET)
  const reviewsQueryParams = [...baseQueryParams];
  const limitParamIndex = baseQueryParams.length + 1;
  const offsetParamIndex = baseQueryParams.length + 2;
  reviewsQueryParams.push(limit, offset);

  // Get reviews with student information
  const reviewsQuery = `
    SELECT 
      ir.id,
      ir.instructor_id,
      ir.student_id,
      ir.rating,
      ir.feedback_text,
      ir.created_at,
      ir.updated_at,
      u.email as student_email,
      u.first_name as student_first_name,
      u.last_name as student_last_name,
      u.avatar_url as student_photo_url,
      COALESCE(
        NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
        u.email
      ) as student_name
    FROM instructor_reviews ir
    JOIN users u ON ir.student_id = u.id
    ${whereClause}
    ORDER BY ir.created_at DESC
    LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
  `;

  // Get total count (uses same WHERE clause but no LIMIT/OFFSET)
  const countQuery = `
    SELECT COUNT(*) as total
    FROM instructor_reviews ir
    ${whereClause}
  `;

  try {
    const [reviewsResult, countResult] = await Promise.all([
      query(reviewsQuery, reviewsQueryParams),
      query(countQuery, baseQueryParams)
    ]);

    const reviews = reviewsResult.rows || [];
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + reviews.length < total
      }
    };
  } catch (error) {
    console.error('Error fetching instructor reviews:', error);
    throw error;
  }
}

/**
 * Get instructor review statistics
 * @param {string} instructorId - Instructor ID
 * @returns {Promise<Object>} Statistics object
 */
export async function getInstructorReviewStats(instructorId) {
  const statsQuery = `
    SELECT 
      COALESCE(AVG(rating)::NUMERIC(10,2), 0) as average_rating,
      COUNT(*)::INTEGER as total_reviews,
      COUNT(CASE WHEN rating = 5 THEN 1 END)::INTEGER as rating_5,
      COUNT(CASE WHEN rating = 4 THEN 1 END)::INTEGER as rating_4,
      COUNT(CASE WHEN rating = 3 THEN 1 END)::INTEGER as rating_3,
      COUNT(CASE WHEN rating = 2 THEN 1 END)::INTEGER as rating_2,
      COUNT(CASE WHEN rating = 1 THEN 1 END)::INTEGER as rating_1
    FROM instructor_reviews
    WHERE instructor_id = $1
  `;

  try {
    const result = await query(statsQuery, [instructorId]);
    const stats = result.rows[0] || {};

    return {
      averageRating: parseFloat(stats.average_rating || 0),
      totalReviews: parseInt(stats.total_reviews || 0, 10),
      ratingDistribution: {
        5: parseInt(stats.rating_5 || 0, 10),
        4: parseInt(stats.rating_4 || 0, 10),
        3: parseInt(stats.rating_3 || 0, 10),
        2: parseInt(stats.rating_2 || 0, 10),
        1: parseInt(stats.rating_1 || 0, 10)
      }
    };
  } catch (error) {
    console.error('Error fetching instructor review statistics:', error);
    throw error;
  }
}

/**
 * Update an instructor review
 * @param {string} reviewId - Review ID
 * @param {number} rating - Rating (1-5)
 * @param {string|null} feedbackText - Optional feedback text
 * @returns {Promise<Object>} Updated review
 */
export async function updateInstructorReview(reviewId, rating, feedbackText = null) {
  const updateQuery = `
    UPDATE instructor_reviews
    SET 
      rating = $1,
      feedback_text = $2,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
    RETURNING *
  `;

  try {
    const result = await query(updateQuery, [rating, feedbackText, reviewId]);
    if (result.rows.length === 0) {
      throw new Error('Review not found');
    }
    return result.rows[0];
  } catch (error) {
    console.error('Error updating instructor review:', error);
    throw error;
  }
}

/**
 * Delete an instructor review
 * @param {string} reviewId - Review ID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteInstructorReview(reviewId) {
  const deleteQuery = `
    DELETE FROM instructor_reviews
    WHERE id = $1
    RETURNING id
  `;

  try {
    const result = await query(deleteQuery, [reviewId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting instructor review:', error);
    throw error;
  }
}

/**
 * Get a student's review for a specific instructor
 * @param {string} instructorId - Instructor ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Object|null>} Review or null if not found
 */
export async function getStudentReviewForInstructor(instructorId, studentId) {
  const getQuery = `
    SELECT *
    FROM instructor_reviews
    WHERE instructor_id = $1 AND student_id = $2
  `;

  try {
    const result = await query(getQuery, [instructorId, studentId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting student review for instructor:', error);
    throw error;
  }
}

/**
 * Check if a student has already reviewed an instructor
 * @param {string} instructorId - Instructor ID
 * @param {string} studentId - Student ID
 * @returns {Promise<boolean>} True if student has reviewed
 */
export async function hasStudentReviewed(instructorId, studentId) {
  const checkQuery = `
    SELECT COUNT(*) as count
    FROM instructor_reviews
    WHERE instructor_id = $1 AND student_id = $2
  `;

  try {
    const result = await query(checkQuery, [instructorId, studentId]);
    return parseInt(result.rows[0]?.count || 0, 10) > 0;
  } catch (error) {
    console.error('Error checking student review:', error);
    throw error;
  }
}
