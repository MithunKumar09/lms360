/**
 * Course Types Database Utilities
 * 
 * @module db/course-settings/types
 */

import { query } from '../index.js';

export async function createCourseType(data) {
  try {
    const {
      org_id,
      name,
      fixed = 0,
      status = 1,
      created_by,
    } = data;

    const result = await query(
      `INSERT INTO course_types (
        org_id, name, fixed, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5
      ) RETURNING *`,
      [
        org_id || null,
        name,
        fixed,
        status,
        created_by,
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Course type with this name already exists for this organization');
    }
    if (error.code === '23514') {
      throw new Error(`Invalid course type data: ${error.message}`);
    }
    throw error;
  }
}

export async function getCourseTypeById(id, org_id = null) {
  try {
    let queryText = 'SELECT * FROM course_types WHERE id = $1';
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

export async function updateCourseType(id, data, org_id = null) {
  try {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    Object.keys(data).forEach((key) => {
      if (data[key] !== undefined && key !== 'id' && key !== 'fixed') {
        // Prevent updating fixed field
        fields.push(`${key} = $${paramIndex}`);
        values.push(data[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return await getCourseTypeById(id, org_id);
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
      `UPDATE course_types 
       SET ${fields.join(', ')} 
       ${whereClause}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23505') {
      throw new Error('Course type with this name already exists for this organization');
    }
    if (error.code === '23514') {
      throw new Error(`Invalid course type data: ${error.message}`);
    }
    throw error;
  }
}

export async function deleteCourseType(id, org_id = null) {
  try {
    // Check if it's a fixed type (cannot be deleted)
    const type = await getCourseTypeById(id, org_id);
    if (type && type.fixed === 1) {
      throw new Error('Cannot delete system default course type');
    }

    let queryText = 'DELETE FROM course_types WHERE id = $1';
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

export async function toggleCourseTypeStatus(id, org_id = null) {
  try {
    let queryText = `
      UPDATE course_types 
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

export async function listCourseTypes(filters = {}) {
  try {
    const {
      org_id,
      status,
      fixed,
      search,
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'DESC',
    } = filters;

    const whereConditions = [];
    const params = [];
    let paramIndex = 1;

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

    if (fixed !== undefined) {
      whereConditions.push(`fixed = $${paramIndex}`);
      params.push(fixed);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`name ILIKE $${paramIndex}`);
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
      `SELECT COUNT(*) as total FROM course_types ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const result = await query(
      `SELECT * FROM course_types 
       ${whereClause} 
       ORDER BY ${sortField} ${sortOrder} 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      courseTypes: result.rows,
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

export async function getActiveCourseTypes(org_id = null) {
  try {
    let queryText = 'SELECT * FROM course_types WHERE status = 1';
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

