/**
 * Testimonials Database Utilities
 * 
 * @module db/course-settings/testimonials
 */

import { query } from '../index.js';

export async function createTestimonial(data) {
  try {
    const {
      org_id,
      student_name,
      photo_url,
      course_id,
      rating,
      message,
      status = 1,
      created_by,
    } = data;

    const result = await query(
      `INSERT INTO testimonials (
        org_id, student_name, photo_url, course_id, rating, message, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING *`,
      [
        org_id || null,
        student_name,
        photo_url || null,
        course_id || null,
        rating,
        message,
        status,
        created_by,
      ]
    );

    return result.rows[0];
  } catch (error) {
    if (error.code === '23514') {
      throw new Error(`Invalid testimonial data: ${error.message}`);
    }
    throw error;
  }
}

export async function getTestimonialById(id, org_id = null) {
  try {
    let queryText = 'SELECT * FROM testimonials WHERE id = $1';
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

export async function updateTestimonial(id, data, org_id = null) {
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
      return await getTestimonialById(id, org_id);
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
      `UPDATE testimonials 
       SET ${fields.join(', ')} 
       ${whereClause}
       RETURNING *`,
      values
    );

    return result.rows[0] || null;
  } catch (error) {
    if (error.code === '23514') {
      throw new Error(`Invalid testimonial data: ${error.message}`);
    }
    throw error;
  }
}

export async function deleteTestimonial(id, org_id = null) {
  try {
    let queryText = 'DELETE FROM testimonials WHERE id = $1';
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

export async function toggleTestimonialStatus(id, org_id = null) {
  try {
    let queryText = `
      UPDATE testimonials 
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

export async function listTestimonials(filters = {}) {
  try {
    const {
      org_id,
      course_id,
      status,
      rating,
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

    if (course_id) {
      whereConditions.push(`course_id = $${paramIndex}`);
      params.push(course_id);
      paramIndex++;
    }

    if (status !== undefined) {
      whereConditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (rating) {
      whereConditions.push(`rating = $${paramIndex}`);
      params.push(rating);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(
        `(student_name ILIKE $${paramIndex} OR message ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const allowedSortFields = ['created_at', 'updated_at', 'student_name', 'rating', 'status'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await query(
      `SELECT COUNT(*) as total FROM testimonials ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(total / limit);

    const result = await query(
      `SELECT * FROM testimonials 
       ${whereClause} 
       ORDER BY ${sortField} ${sortOrder} 
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      testimonials: result.rows,
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

export async function getActiveTestimonials(org_id = null) {
  try {
    let queryText = 'SELECT * FROM testimonials WHERE status = 1';
    const params = [];

    if (org_id !== null && org_id !== undefined) {
      queryText += ' AND (org_id = $1 OR org_id IS NULL)';
      params.push(org_id);
    } else if (org_id === null) {
      queryText += ' AND org_id IS NULL';
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    return result.rows;
  } catch (error) {
    throw error;
  }
}

