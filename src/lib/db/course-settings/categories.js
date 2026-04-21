/**
 * Course Categories Database Utilities
 * 
 * Provides CRUD operations and query helpers for course_categories table.
 * All queries use parameterized statements to prevent SQL injection.
 * 
 * @module db/course-settings/categories
 */

import { query, getClient } from '../index.js';

/**
 * Create a new course category
 * @param {Object} data - Category data
 * @param {string} data.name - Category name (1-255 chars)
 * @param {string} [data.description] - Category description
 * @param {string} [data.thumbnail_url] - Thumbnail image URL
 * @param {string} [data.org_id] - Organization ID (NULL for global/superadmin)
 * @param {number} [data.status=1] - Status (1=active, 0=inactive)
 * @param {string} data.created_by - User ID who created this
 * @returns {Promise<Object>} Created category object
 */
export async function createCategory(data) {
  try {
    const {
      name,
      description,
      thumbnail_url,
      org_id,
      status = 1,
      created_by,
    } = data;

    const result = await query(
      `INSERT INTO course_categories (
        org_id, name, description, thumbnail_url, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING *`,
      [
        org_id || null,
        name,
        description || null,
        thumbnail_url || null,
        status,
        created_by,
      ]
    );

    return result.rows[0];
  } catch (error) {
    // Handle check constraint violations
    if (error.code === '23514') {
      throw new Error(`Invalid category data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get category by ID
 * @param {string} id - Category UUID
 * @param {string} [org_id] - Optional org_id filter (for admin)
 * @returns {Promise<Object|null>} Category object or null if not found
 */
export async function getCategoryById(id, org_id = null) {
  try {
    let queryText = 'SELECT * FROM course_categories WHERE id = $1';
    const params = [id];

    // Admins can only delete their own org's data, not superadmin data (org_id IS NULL)
    if (org_id !== null) {
      queryText += ' AND org_id = $2';
      params.push(org_id);
    }

    const result = await query(queryText, params);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * Update category
 * @param {string} id - Category UUID
 * @param {Object} data - Fields to update (partial object)
 * @param {string} [org_id] - Optional org_id filter (for admin)
 * @returns {Promise<Object|null>} Updated category object or null if not found
 */
export async function updateCategory(id, data, org_id = null) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    Object.keys(data).forEach((key) => {
      // Skip undefined values and id
      if (data[key] !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      // No fields to update, return current category
      return await getCategoryById(id, org_id);
    }

    // Add WHERE clause
    let whereClause = `WHERE id = $${paramIndex}`;
    values.push(id);
    paramIndex++;

    // Admins can only update their own org's data, not superadmin data (org_id IS NULL)
    if (org_id !== null) {
      whereClause += ` AND org_id = $${paramIndex}`;
      values.push(org_id);
    }

    const result = await query(
      `UPDATE course_categories 
       SET ${fields.join(', ')} 
       ${whereClause}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    // Handle check constraint violations
    if (error.code === '23514') {
      throw new Error(`Invalid category data: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Delete category
 * @param {string} id - Category UUID
 * @param {string} [org_id] - Optional org_id filter (for admin)
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteCategory(id, org_id = null) {
  try {
    let queryText = 'DELETE FROM course_categories WHERE id = $1';
    const params = [id];

    // Admins can only delete their own org's data, not superadmin data (org_id IS NULL)
    if (org_id !== null) {
      queryText += ' AND org_id = $2';
      params.push(org_id);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  } catch (error) {
    throw error;
  }
}

/**
 * Toggle category status
 * @param {string} id - Category UUID
 * @param {string} [org_id] - Optional org_id filter (for admin)
 * @returns {Promise<Object|null>} Updated category object or null if not found
 */
export async function toggleCategoryStatus(id, org_id = null) {
  try {
    let queryText = `
      UPDATE course_categories 
      SET status = CASE WHEN status = 1 THEN 0 ELSE 1 END
      WHERE id = $1
    `;
    const params = [id];

    // Admins can only toggle their own org's data, not superadmin data (org_id IS NULL)
    if (org_id !== null) {
      queryText += ' AND org_id = $2';
      params.push(org_id);
    }

    queryText += ' RETURNING *';

    const result = await query(queryText, params);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

/**
 * List categories with filters, pagination, and search
 * @param {Object} [filters] - Filter options
 * @param {string} [filters.org_id] - Filter by org_id (NULL for global)
 * @param {number} [filters.status] - Filter by status (1=active, 0=inactive)
 * @param {string} [filters.search] - Search by name or description
 * @param {number} [filters.page=1] - Page number (1-based)
 * @param {number} [filters.limit=20] - Items per page
 * @param {string} [filters.sort='created_at'] - Sort field
 * @param {string} [filters.order='DESC'] - Sort order (ASC or DESC)
 * @returns {Promise<Object>} Object with categories array and pagination info
 */
export async function listCategories(filters = {}) {
  try {
    const {
      org_id,
      status,
      search,
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'DESC',
    } = filters;

    // Build WHERE clause
    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    // Org filter: if org_id provided, show global (NULL) + org-specific
    if (org_id !== undefined && org_id !== null) {
      whereConditions.push(`(org_id = $${paramIndex} OR org_id IS NULL)`);
      params.push(org_id);
      paramIndex++;
    } else if (org_id === null) {
      // Explicitly show only global (NULL)
      whereConditions.push(`org_id IS NULL`);
    }

    // Status filter
    if (status !== undefined) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // Search filter
    if (search) {
      whereConditions.push(
        `(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Validate sort field (prevent SQL injection)
    const allowedSortFields = ['created_at', 'updated_at', 'name', 'status'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Count total matching records
    const countResult = await query(
      `SELECT COUNT(*) as total FROM course_categories ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    // Fetch paginated results
    const result = await query(
      `SELECT * FROM course_categories 
       ${whereClause} 
       ORDER BY ${sortField} ${sortOrder} 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      categories: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get all active categories (for dropdowns, etc.)
 * @param {string} [org_id] - Optional org_id filter
 * @returns {Promise<Object[]>} Array of active categories
 */
export async function getActiveCategories(org_id = null) {
  try {
    let queryText = 'SELECT * FROM course_categories WHERE status = 1';
    const params = [];

    if (org_id !== null && org_id !== undefined) {
      queryText += ' AND (org_id = $1 OR org_id IS NULL)';
      params.push(org_id);
    } else if (org_id === null) {
      queryText += ' AND org_id IS NULL';
    }

    queryText += ' ORDER BY name ASC';

    const result = await query(queryText, params);
    return result.rows;
  } catch (error) {
    throw error;
  }
}

