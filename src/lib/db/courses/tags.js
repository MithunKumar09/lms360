/**
 * Course Tags Database Functions
 * 
 * Functions for managing course tags
 */

import { query } from '../index.js';

/**
 * Get popular tags (most frequently used tags)
 * @param {number} limit - Maximum number of tags to return (default: 10)
 * @returns {Promise<Array>} Array of popular tags with count
 */
export async function getPopularTags(limit = 10) {
  const tagsQuery = `
    SELECT 
      tag,
      COUNT(*) as count
    FROM course_tags
    GROUP BY tag
    ORDER BY count DESC, tag ASC
    LIMIT $1
  `;

  try {
    const result = await query(tagsQuery, [limit]);
    return result.rows.map(row => ({
      tag: row.tag,
      count: parseInt(row.count, 10)
    }));
  } catch (error) {
    console.error('Error fetching popular tags:', error);
    throw error;
  }
}

/**
 * Get all unique tags
 * @returns {Promise<Array>} Array of all unique tags
 */
export async function getAllTags() {
  const tagsQuery = `
    SELECT DISTINCT tag
    FROM course_tags
    ORDER BY tag ASC
  `;

  try {
    const result = await query(tagsQuery);
    return result.rows.map(row => row.tag);
  } catch (error) {
    console.error('Error fetching all tags:', error);
    throw error;
  }
}

/**
 * Get tags for a specific course
 * @param {string} courseId - Course ID
 * @returns {Promise<Array>} Array of tags for the course
 */
export async function getCourseTags(courseId) {
  const tagsQuery = `
    SELECT tag
    FROM course_tags
    WHERE course_id = $1
    ORDER BY tag ASC
  `;

  try {
    const result = await query(tagsQuery, [courseId]);
    return result.rows.map(row => row.tag);
  } catch (error) {
    console.error('Error fetching course tags:', error);
    throw error;
  }
}

