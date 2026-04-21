/**
 * Course Reviews Database Functions
 * 
 * Functions for managing course reviews and ratings
 */

import { query } from '../index.js';

/**
 * Get reviews for a course with pagination
 * @param {string} courseId - Course ID
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Number of reviews per page
 * @returns {Promise<Object>} Reviews data with pagination info
 */
export async function getCourseReviews(courseId, page = 1, limit = 10) {
  const offset = (page - 1) * limit;

  // Get reviews with user information
  const reviewsQuery = `
    SELECT 
      cr.id,
      cr.course_id,
      cr.user_id,
      cr.rating,
      cr.review_text,
      cr.created_at,
      cr.updated_at,
      u.email,
      u.first_name,
      u.last_name,
      u.avatar_url as photo_url,
      COALESCE(
        NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
        u.email
      ) as user_name
    FROM course_reviews cr
    JOIN users u ON cr.user_id = u.id
    WHERE cr.course_id = $1
    ORDER BY cr.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM course_reviews
    WHERE course_id = $1
  `;

  // Get rating statistics
  const statsQuery = `
    SELECT 
      AVG(rating)::NUMERIC(10,2) as average_rating,
      COUNT(*) as total_reviews,
      COUNT(CASE WHEN rating = 5 THEN 1 END) as rating_5,
      COUNT(CASE WHEN rating = 4 THEN 1 END) as rating_4,
      COUNT(CASE WHEN rating = 3 THEN 1 END) as rating_3,
      COUNT(CASE WHEN rating = 2 THEN 1 END) as rating_2,
      COUNT(CASE WHEN rating = 1 THEN 1 END) as rating_1
    FROM course_reviews
    WHERE course_id = $1
  `;

  try {
    const [reviewsResult, countResult, statsResult] = await Promise.all([
      query(reviewsQuery, [courseId, limit, offset]),
      query(countQuery, [courseId]),
      query(statsQuery, [courseId])
    ]);

    const reviews = reviewsResult.rows || [];
    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    const stats = statsResult.rows[0] || {};

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + reviews.length < total
      },
      statistics: {
        averageRating: parseFloat(stats.average_rating || 0),
        totalReviews: parseInt(stats.total_reviews || 0, 10),
        ratingDistribution: {
          5: parseInt(stats.rating_5 || 0, 10),
          4: parseInt(stats.rating_4 || 0, 10),
          3: parseInt(stats.rating_3 || 0, 10),
          2: parseInt(stats.rating_2 || 0, 10),
          1: parseInt(stats.rating_1 || 0, 10)
        }
      }
    };
  } catch (error) {
    console.error('Error fetching course reviews:', error);
    throw error;
  }
}

/**
 * Create a new review for a course
 * @param {string} courseId - Course ID
 * @param {string} userId - User ID
 * @param {number} rating - Rating (1-5)
 * @param {string} reviewText - Review text
 * @param {string} orgId - Organization ID (optional)
 * @param {string} role - User role (optional)
 * @returns {Promise<Object>} Created review
 */
export async function createCourseReview(courseId, userId, rating, reviewText = null, orgId = null, role = null) {
  const insertQuery = `
    INSERT INTO course_reviews (course_id, user_id, rating, review_text, org_id, role)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (course_id, user_id) 
    DO UPDATE SET 
      rating = EXCLUDED.rating,
      review_text = EXCLUDED.review_text,
      org_id = EXCLUDED.org_id,
      role = EXCLUDED.role,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;

  try {
    const result = await query(insertQuery, [courseId, userId, rating, reviewText, orgId, role]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating course review:', error);
    throw error;
  }
}

/**
 * Check if user has already reviewed a course
 * @param {string} courseId - Course ID
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} True if user has reviewed
 */
export async function hasUserReviewed(courseId, userId) {
  const checkQuery = `
    SELECT COUNT(*) as count
    FROM course_reviews
    WHERE course_id = $1 AND user_id = $2
  `;

  try {
    const result = await query(checkQuery, [courseId, userId]);
    return parseInt(result.rows[0]?.count || 0, 10) > 0;
  } catch (error) {
    console.error('Error checking user review:', error);
    throw error;
  }
}

/**
 * Get user's review for a course
 * @param {string} courseId - Course ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User's review or null
 */
export async function getUserReview(courseId, userId) {
  const getQuery = `
    SELECT *
    FROM course_reviews
    WHERE course_id = $1 AND user_id = $2
  `;

  try {
    const result = await query(getQuery, [courseId, userId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user review:', error);
    throw error;
  }
}

