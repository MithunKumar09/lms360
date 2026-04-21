/**
 * Course Drafts Database Utilities
 * 
 * Provides CRUD operations for course drafts.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/courses/drafts
 */

import { query, getClient } from '../index.js';

/**
 * Create a new course draft
 * @param {Object} data - Draft data
 * @param {string} data.userId - User ID who created the draft
 * @param {string} [data.courseId] - Course ID if updating existing course
 * @param {Object} data.courseData - Course form data (JSON)
 * @param {string} [data.orgId] - Organization ID
 * @returns {Promise<Object>} Created draft object
 */
export async function createDraft(data) {
  try {
    const { userId, courseId = null, courseData, orgId = null } = data;

    const result = await query(
      `INSERT INTO course_drafts (
        user_id, course_id, org_id, course_data, status
      ) VALUES (
        $1, $2, $3, $4, 'draft'
      ) RETURNING *`,
      [
        userId,
        courseId,
        orgId,
        JSON.stringify(courseData),
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error creating draft:', error);
    throw error;
  }
}

/**
 * Get draft by ID
 * @param {string} draftId - Draft UUID
 * @param {string} [userId] - Optional user ID filter (for security)
 * @returns {Promise<Object|null>} Draft object or null if not found
 */
export async function getDraftById(draftId, userId = null) {
  try {
    let queryText = 'SELECT * FROM course_drafts WHERE id = $1';
    const params = [draftId];

    if (userId) {
      queryText += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await query(queryText, params);
    
    if (result.rows.length === 0) {
      return null;
    }

    const draft = result.rows[0];
    // Parse JSON course_data
    if (draft.course_data && typeof draft.course_data === 'string') {
      draft.courseData = JSON.parse(draft.course_data);
    } else {
      draft.courseData = draft.course_data || {};
    }

    return draft;
  } catch (error) {
    console.error('Error getting draft:', error);
    throw error;
  }
}

/**
 * Get user's latest draft
 * @param {string} userId - User ID
 * @param {string} [orgId] - Optional organization ID filter
 * @returns {Promise<Object|null>} Latest draft or null if not found
 */
export async function getLatestDraft(userId, orgId = null) {
  try {
    let queryText = `
      SELECT * FROM course_drafts 
      WHERE user_id = $1 AND status = 'draft'
    `;
    const params = [userId];

    if (orgId !== null) {
      queryText += ' AND (org_id = $2 OR org_id IS NULL)';
      params.push(orgId);
    }

    queryText += ' ORDER BY updated_at DESC LIMIT 1';

    const result = await query(queryText, params);
    
    if (result.rows.length === 0) {
      return null;
    }

    const draft = result.rows[0];
    // Parse JSON course_data
    if (draft.course_data && typeof draft.course_data === 'string') {
      draft.courseData = JSON.parse(draft.course_data);
    } else {
      draft.courseData = draft.course_data || {};
    }

    return draft;
  } catch (error) {
    console.error('Error getting latest draft:', error);
    throw error;
  }
}

/**
 * Get all drafts for a user
 * @param {string} userId - User ID
 * @param {string} [orgId] - Optional organization ID filter
 * @param {Object} [options] - Query options
 * @param {number} [options.limit=20] - Limit results
 * @param {number} [options.offset=0] - Offset for pagination
 * @returns {Promise<Object>} Drafts array and pagination info
 */
export async function getUserDrafts(userId, orgId = null, options = {}) {
  try {
    const { limit = 20, offset = 0 } = options;

    let queryText = `
      SELECT * FROM course_drafts 
      WHERE user_id = $1 AND status = 'draft'
    `;
    const params = [userId];

    if (orgId !== null) {
      queryText += ' AND (org_id = $2 OR org_id IS NULL)';
      params.push(orgId);
    }

    queryText += ' ORDER BY updated_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await query(queryText, params);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total FROM course_drafts 
      WHERE user_id = $1 AND status = 'draft'
    `;
    const countParams = [userId];
    
    if (orgId !== null) {
      countQuery += ' AND (org_id = $2 OR org_id IS NULL)';
      countParams.push(orgId);
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Parse JSON course_data for each draft
    const drafts = result.rows.map((draft) => {
      if (draft.course_data && typeof draft.course_data === 'string') {
        draft.courseData = JSON.parse(draft.course_data);
      } else {
        draft.courseData = draft.course_data || {};
      }
      return draft;
    });

    return {
      drafts,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Error getting user drafts:', error);
    throw error;
  }
}

/**
 * Update draft
 * @param {string} draftId - Draft UUID
 * @param {Object} data - Fields to update
 * @param {string} [userId] - Optional user ID filter (for security)
 * @returns {Promise<Object|null>} Updated draft object or null if not found
 */
export async function updateDraft(draftId, data, userId = null) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && key !== 'id') {
        if (key === 'courseData') {
          fields.push(`course_data = $${paramIndex}`);
          values.push(JSON.stringify(data[key]));
        } else {
          fields.push(`${key} = $${paramIndex}`);
          values.push(data[key]);
        }
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      // No fields to update
      return await getDraftById(draftId, userId);
    }

    // Add updated_at
    fields.push(`updated_at = NOW()`);
    
    // Add WHERE clause
    let queryText = `UPDATE course_drafts SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
    values.push(draftId);
    paramIndex++;

    if (userId) {
      queryText += ` AND user_id = $${paramIndex}`;
      values.push(userId);
    }

    queryText += ' RETURNING *';

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return null;
    }

    const draft = result.rows[0];
    // Parse JSON course_data
    if (draft.course_data && typeof draft.course_data === 'string') {
      draft.courseData = JSON.parse(draft.course_data);
    } else {
      draft.courseData = draft.course_data || {};
    }

    return draft;
  } catch (error) {
    console.error('Error updating draft:', error);
    throw error;
  }
}

/**
 * Delete draft
 * @param {string} draftId - Draft UUID
 * @param {string} [userId] - Optional user ID filter (for security)
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteDraft(draftId, userId = null) {
  try {
    let queryText = 'DELETE FROM course_drafts WHERE id = $1';
    const params = [draftId];

    if (userId) {
      queryText += ' AND user_id = $2';
      params.push(userId);
    }

    const result = await query(queryText, params);
    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting draft:', error);
    throw error;
  }
}

/**
 * Delete all drafts for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of drafts deleted
 */
export async function deleteAllUserDrafts(userId) {
  try {
    const result = await query(
      'DELETE FROM course_drafts WHERE user_id = $1',
      [userId]
    );
    return result.rowCount;
  } catch (error) {
    console.error('Error deleting all drafts:', error);
    throw error;
  }
}

