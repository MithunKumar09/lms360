/**
 * Course Subcategories Database Utilities
 * 
 * @module db/course-settings/subcategories
 */

import { query } from '../index.js';

export async function createSubcategory(data) {
  try {
    const {
      category_id,
      org_id,
      name,
      description,
      status = 1,
      created_by,
    } = data;

    const result = await query(
      `INSERT INTO course_subcategories (
        category_id, org_id, name, description, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING *`,
      [
        category_id,
        org_id || null,
        name,
        description || null,
        status,
        created_by,
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23514') {
      throw new Error(`Invalid subcategory data: ${error.message}`);
    }
    throw error;
  }
}

export async function getSubcategoryById(id, org_id = null) {
  try {
    let queryText = 'SELECT * FROM course_subcategories WHERE id = $1';
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

export async function updateSubcategory(id, data, org_id = null) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && key !== 'id') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return await getSubcategoryById(id, org_id);
    }

    let whereClause = `WHERE id = $${paramIndex}`;
    values.push(id);
    paramIndex++;

    // Admins can only update their own org's data, not superadmin data (org_id IS NULL)
    if (org_id !== null) {
      whereClause += ` AND org_id = $${paramIndex}`;
      values.push(org_id);
    }

    const result = await query(
      `UPDATE course_subcategories 
       SET ${fields.join(', ')} 
       ${whereClause}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23514') {
      throw new Error(`Invalid subcategory data: ${error.message}`);
    }
    throw error;
  }
}

export async function deleteSubcategory(id, org_id = null) {
  try {
    let queryText = 'DELETE FROM course_subcategories WHERE id = $1';
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

export async function toggleSubcategoryStatus(id, org_id = null) {
  try {
    let queryText = `
      UPDATE course_subcategories 
      SET status = CASE WHEN status = 1 THEN 0 ELSE 1 END
      WHERE id = $1
    `;
    const params = [id];

    // Admins can only delete their own org's data, not superadmin data (org_id IS NULL)
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

export async function listSubcategories(filters = {}) {
  try {
    const {
      category_id,
      org_id,
      status,
      search,
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'DESC',
    } = filters;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

    if (category_id) {
      whereConditions.push(`category_id = $${paramIndex}`);
      params.push(category_id);
      paramIndex++;
    }

    if (org_id !== undefined && org_id !== null) {
      whereConditions.push(`(org_id = $${paramIndex} OR org_id IS NULL)`);
      params.push(org_id);
      paramIndex++;
    } else if (org_id === null) {
      whereConditions.push(`org_id IS NULL`);
    }

    if (status !== undefined) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

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

    const allowedSortFields = ['created_at', 'updated_at', 'name', 'status'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await query(
      `SELECT COUNT(*) as total FROM course_subcategories ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const result = await query(
      `SELECT * FROM course_subcategories 
       ${whereClause} 
       ORDER BY ${sortField} ${sortOrder} 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      subcategories: result.rows,
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

export async function getSubcategoriesByCategory(category_id, org_id = null) {
  try {
    let queryText = 'SELECT * FROM course_subcategories WHERE category_id = $1 AND status = 1';
    const params = [category_id];

    // Admins can only delete their own org's data, not superadmin data (org_id IS NULL)
if (org_id !== null) {
  queryText += ' AND (org_id = $2 OR org_id IS NULL)';
  params.push(org_id);
}

    queryText += ' ORDER BY name ASC';

    const result = await query(queryText, params);
    return result.rows;
  } catch (error) {
    throw error;
  }
}

