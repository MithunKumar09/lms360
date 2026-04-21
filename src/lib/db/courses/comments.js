/**
 * Course Comments Database Functions
 * 
 * Functions for managing course comments with reply support
 */

import { query } from '../index.js';

/**
 * Create a new course comment
 * @param {string} courseId - Course ID
 * @param {string} userId - User ID
 * @param {string} commentText - Comment text
 * @param {string} parentId - Parent comment ID (for replies, optional)
 * @returns {Promise<Object>} Created comment
 */
export async function createCourseComment(courseId, userId, commentText, parentId = null) {
  const insertQuery = `
    INSERT INTO course_comments (course_id, user_id, parent_id, comment_text, status)
    VALUES ($1, $2, $3, $4, 'pending')
    RETURNING *
  `;

  try {
    const result = await query(insertQuery, [courseId, userId, parentId, commentText]);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating course comment:', error);
    throw error;
  }
}

/**
 * Get comments for a course with nested replies
 * @param {string} courseId - Course ID
 * @param {string} status - Filter by status (optional, defaults to 'approved')
 * @param {number} page - Page number (1-based)
 * @param {number} limit - Number of comments per page
 * @returns {Promise<Object>} Comments with pagination
 */
export async function getCourseComments(courseId, status = 'approved', page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  
  // Get top-level comments (no parent)
  const commentsQuery = `
    SELECT 
      cc.*,
      u.id as user_id,
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email) as user_name,
      u.email as user_email,
      u.avatar_url as user_avatar
    FROM course_comments cc
    JOIN users u ON cc.user_id = u.id
    WHERE cc.course_id = $1 
      AND cc.parent_id IS NULL
      ${status ? `AND cc.status = $2` : ''}
    ORDER BY cc.created_at DESC
    LIMIT ${status ? '$3' : '$2'} OFFSET ${status ? '$4' : '$3'}
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM course_comments cc
    WHERE cc.course_id = $1 
      AND cc.parent_id IS NULL
      ${status ? `AND cc.status = $2` : ''}
  `;

  try {
    const params = status ? [courseId, status, limit, offset] : [courseId, limit, offset];
    const countParams = status ? [courseId, status] : [courseId];
    
    const [commentsResult, countResult] = await Promise.all([
      query(commentsQuery, params),
      query(countQuery, countParams)
    ]);

    const topLevelComments = commentsResult.rows || [];
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    // Get replies for each top-level comment
    const commentIds = topLevelComments.map(c => c.id);
    let replies = [];
    
    if (commentIds.length > 0) {
      const repliesQuery = `
        SELECT 
          cc.*,
          u.id as user_id,
          COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email) as user_name,
          u.email as user_email,
          u.avatar_url as user_avatar
        FROM course_comments cc
        JOIN users u ON cc.user_id = u.id
        WHERE cc.parent_id = ANY($1::uuid[])
          ${status ? `AND cc.status = $2` : ''}
        ORDER BY cc.created_at ASC
      `;
      
      const repliesParams = status ? [commentIds, status] : [commentIds];
      const repliesResult = await query(repliesQuery, repliesParams);
      replies = repliesResult.rows || [];
    }

    // Organize comments with replies
    const commentsWithReplies = topLevelComments.map(comment => ({
      ...comment,
      replies: replies.filter(reply => reply.parent_id === comment.id)
    }));

    return {
      comments: commentsWithReplies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + topLevelComments.length < total
      }
    };
  } catch (error) {
    console.error('Error fetching course comments:', error);
    throw error;
  }
}

/**
 * Get a single comment by ID
 * @param {string} commentId - Comment ID
 * @returns {Promise<Object>} Comment data
 */
export async function getCommentById(commentId) {
  const getQuery = `
    SELECT 
      cc.*,
      u.id as user_id,
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email) as user_name,
      u.email as user_email,
      u.avatar_url as user_avatar,
      c.title as course_title,
      c.slug as course_slug
    FROM course_comments cc
    JOIN users u ON cc.user_id = u.id
    LEFT JOIN courses c ON cc.course_id = c.id
    WHERE cc.id = $1
  `;

  try {
    const result = await query(getQuery, [commentId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching comment:', error);
    throw error;
  }
}

/**
 * Update comment text or status
 * @param {string} commentId - Comment ID
 * @param {Object} updates - Update fields { commentText?, status? }
 * @returns {Promise<Object>} Updated comment
 */
export async function updateComment(commentId, updates) {
  const { commentText, status } = updates;
  const updatesList = [];
  const params = [];
  let paramIndex = 1;

  if (commentText !== undefined) {
    updatesList.push(`comment_text = $${paramIndex}`);
    params.push(commentText);
    paramIndex++;
  }

  if (status !== undefined) {
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    updatesList.push(`status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  if (updatesList.length === 0) {
    throw new Error('No updates provided');
  }

  updatesList.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(commentId);

  const updateQuery = `
    UPDATE course_comments
    SET ${updatesList.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  try {
    const result = await query(updateQuery, params);
    return result.rows[0];
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
}

/**
 * Delete a comment (and its replies via CASCADE)
 * @param {string} commentId - Comment ID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteComment(commentId) {
  const deleteQuery = `
    DELETE FROM course_comments
    WHERE id = $1
    RETURNING id
  `;

  try {
    const result = await query(deleteQuery, [commentId]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

/**
 * Get comment statistics for a course
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Statistics
 */
export async function getCommentStatistics(courseId) {
  const statsQuery = `
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
      COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as top_level_count,
      COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as replies_count
    FROM course_comments
    WHERE course_id = $1
  `;

  try {
    const result = await query(statsQuery, [courseId]);
    const stats = result.rows[0] || {};
    return {
      total: parseInt(stats.total || 0, 10),
      pending: parseInt(stats.pending_count || 0, 10),
      approved: parseInt(stats.approved_count || 0, 10),
      rejected: parseInt(stats.rejected_count || 0, 10),
      topLevel: parseInt(stats.top_level_count || 0, 10),
      replies: parseInt(stats.replies_count || 0, 10)
    };
  } catch (error) {
    console.error('Error fetching comment statistics:', error);
    throw error;
  }
}

/**
 * Get vendor's course comments (vendor only) with filtering
 * @param {string} vendorId - Vendor user UUID
 * @param {string} courseId - Course ID (optional, null for all vendor's courses)
 * @param {string} status - Filter by status (optional)
 * @param {number} page - Page number
 * @param {number} limit - Comments per page
 * @returns {Promise<Object>} Comments with pagination
 */
export async function getVendorCourseComments(vendorId, courseId = null, status = null, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE c.created_by = $1';
  const params = [vendorId];
  let paramIndex = 2;

  if (courseId) {
    whereClause += ` AND cc.course_id = $${paramIndex}`;
    params.push(courseId);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND cc.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  // Build query params for comments query (includes limit and offset)
  const commentsParams = [...params];
  const limitParamIndex = paramIndex;
  const offsetParamIndex = paramIndex + 1;
  
  const commentsQuery = `
    SELECT 
      cc.*,
      u.id as user_id,
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email) as user_name,
      u.email as user_email,
      u.avatar_url as user_avatar,
      c.title as course_title,
      c.slug as course_slug
    FROM course_comments cc
    JOIN users u ON cc.user_id = u.id
    INNER JOIN courses c ON cc.course_id = c.id
    ${whereClause}
    ORDER BY cc.created_at DESC
    LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM course_comments cc
    INNER JOIN courses c ON cc.course_id = c.id
    ${whereClause}
  `;

  try {
    // Add limit and offset to comments params
    commentsParams.push(limit, offset);
    
    // Count query uses only the filter params (no limit/offset)
    const countParams = [...params];
    
    const [commentsResult, countResult] = await Promise.all([
      query(commentsQuery, commentsParams),
      query(countQuery, countParams)
    ]);

    const comments = commentsResult.rows || [];
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + comments.length < total
      }
    };
  } catch (error) {
    console.error('Error fetching vendor course comments:', error);
    throw error;
  }
}

/**
 * Get all comments (admin/superadmin) with filtering
 * @param {string} courseId - Course ID (optional, null for all courses)
 * @param {string} status - Filter by status (optional)
 * @param {number} page - Page number
 * @param {number} limit - Comments per page
 * @returns {Promise<Object>} Comments with pagination
 */
export async function getAllComments(courseId = null, status = null, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (courseId) {
    whereClause += ` AND cc.course_id = $${paramIndex}`;
    params.push(courseId);
    paramIndex++;
  }

  if (status) {
    whereClause += ` AND cc.status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  // Build query params for comments query (includes limit and offset)
  const commentsParams = [...params];
  const limitParamIndex = paramIndex;
  const offsetParamIndex = paramIndex + 1;
  
  const commentsQuery = `
    SELECT 
      cc.*,
      u.id as user_id,
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email) as user_name,
      u.email as user_email,
      u.avatar_url as user_avatar,
      c.title as course_title,
      c.slug as course_slug
    FROM course_comments cc
    JOIN users u ON cc.user_id = u.id
    LEFT JOIN courses c ON cc.course_id = c.id
    ${whereClause}
    ORDER BY cc.created_at DESC
    LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
  `;

  const countQuery = `
    SELECT COUNT(*) as total
    FROM course_comments cc
    ${whereClause}
  `;

  try {
    // Add limit and offset to comments params
    commentsParams.push(limit, offset);
    
    // Count query uses only the filter params (no limit/offset)
    const countParams = [...params];
    
    const [commentsResult, countResult] = await Promise.all([
      query(commentsQuery, commentsParams),
      query(countQuery, countParams)
    ]);

    const comments = commentsResult.rows || [];
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + comments.length < total
      }
    };
  } catch (error) {
    console.error('Error fetching all comments:', error);
    throw error;
  }
}

