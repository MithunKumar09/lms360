/**
 * Program Types Database Utilities
 * 
 * @module db/course-settings/programTypes
 */

import { query } from '../index.js';

export async function createProgramType(data) {
  try {
    const {
      org_id,
      name,
      icon,
      color,
      status = 1,
      created_by,
    } = data;

    const result = await query(
      `INSERT INTO program_types (
        org_id, name, icon, color, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING *`,
      [
        org_id || null,
        name,
        icon || null,
        color || null,
        status,
        created_by,
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23514') {
      throw new Error(`Invalid program type data: ${error.message}`);
    }
    throw error;
  }
}

export async function getProgramTypeById(id, org_id = null) {
  try {
    let queryText = 'SELECT * FROM program_types WHERE id = $1';
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

export async function updateProgramType(id, data, org_id = null) {
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
      return await getProgramTypeById(id, org_id);
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
      `UPDATE program_types 
       SET ${fields.join(', ')} 
       ${whereClause}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23514') {
      throw new Error(`Invalid program type data: ${error.message}`);
    }
    throw error;
  }
}

export async function deleteProgramType(id, org_id = null) {
  try {
    let queryText = 'DELETE FROM program_types WHERE id = $1';
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

export async function toggleProgramTypeStatus(id, org_id = null) {
  try {
    let queryText = `
      UPDATE program_types 
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

export async function listProgramTypes(filters = {}) {
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
      `SELECT COUNT(*) as total FROM program_types ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const result = await query(
      `SELECT * FROM program_types 
       ${whereClause} 
       ORDER BY ${sortField} ${sortOrder} 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      programTypes: result.rows,
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

export async function getActiveProgramTypes(org_id = null) {
  try {
    let queryText = 'SELECT * FROM program_types WHERE status = 1';
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

