/**
 * Virtual Internship Programs Database Functions
 * 
 * CRUD operations for virtual internship programs
 * Mirrors assignment functionality but for company-owned programs
 */

import { query, getClient } from '../index.js';

/**
 * Create a virtual internship program
 * @param {Object} programData - Program data
 * @param {string} programData.companyUserId - Company user ID
 * @param {string|null} programData.organizationId - Organization ID
 * @param {string} programData.title - Program title
 * @param {string|null} programData.description - Program description
 * @param {string|null} programData.industry - Industry
 * @param {number|null} programData.durationWeeks - Duration in weeks
 * @param {Object|null} programData.skillRequirements - Skill requirements JSONB
 * @param {string} programData.status - Status (draft, published, closed)
 * @returns {Promise<Object>} Created program
 */
export async function createVirtualInternshipProgram(programData) {
  const {
    companyUserId,
    organizationId,
    title,
    description,
    industry,
    durationWeeks,
    skillRequirements,
    status = 'draft',
  } = programData;

  const result = await query(
    `INSERT INTO virtual_internship_programs (
      company_user_id,
      organization_id,
      title,
      description,
      industry,
      duration_weeks,
      skill_requirements,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      companyUserId,
      organizationId || null,
      title,
      description || null,
      industry || null,
      durationWeeks || null,
      skillRequirements ? JSON.stringify(skillRequirements) : null,
      status,
    ]
  );

  return result.rows[0];
}

/**
 * Get virtual internship program by ID
 * @param {string} programId - Program ID
 * @returns {Promise<Object|null>} Program or null
 */
export async function getVirtualInternshipProgram(programId) {
  const result = await query(
    `SELECT 
      p.*,
      u.first_name || ' ' || u.last_name as company_name,
      u.email as company_email
    FROM virtual_internship_programs p
    LEFT JOIN users u ON p.company_user_id = u.id
    WHERE p.id = $1`,
    [programId]
  );

  if (result.rows.length === 0) return null;

  const program = result.rows[0];
  return {
    id: program.id,
    companyUserId: program.company_user_id,
    organizationId: program.organization_id,
    title: program.title,
    description: program.description,
    industry: program.industry,
    durationWeeks: program.duration_weeks,
    skillRequirements: program.skill_requirements,
    status: program.status,
    createdAt: program.created_at,
    updatedAt: program.updated_at,
    companyName: program.company_name,
    companyEmail: program.company_email,
  };
}

/**
 * List virtual internship programs
 * @param {Object} filters - Filter options
 * @param {string|null} filters.companyUserId - Filter by company user ID
 * @param {string|null} filters.organizationId - Filter by organization ID
 * @param {string|null} filters.status - Filter by status
 * @param {number} filters.page - Page number
 * @param {number} filters.limit - Items per page
 * @returns {Promise<Object>} Programs and pagination
 */
export async function listVirtualInternshipPrograms(filters = {}) {
  const {
    companyUserId = null,
    organizationId = null,
    status = null,
    page = 1,
    limit = 20,
  } = filters;

  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (companyUserId) {
    conditions.push(`p.company_user_id = $${paramIndex}`);
    params.push(companyUserId);
    paramIndex++;
  }

  if (organizationId) {
    conditions.push(`p.organization_id = $${paramIndex}`);
    params.push(organizationId);
    paramIndex++;
  }

  if (status) {
    conditions.push(`p.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM virtual_internship_programs p ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total, 10);

  // Get programs
  const programsResult = await query(
    `SELECT 
      p.*,
      u.first_name || ' ' || u.last_name as company_name
    FROM virtual_internship_programs p
    LEFT JOIN users u ON p.company_user_id = u.id
    ${whereClause}
    ORDER BY p.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  const programs = programsResult.rows.map(row => ({
    id: row.id,
    companyUserId: row.company_user_id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    industry: row.industry,
    durationWeeks: row.duration_weeks,
    skillRequirements: row.skill_requirements,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    companyName: row.company_name,
  }));

  return {
    programs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update virtual internship program
 * @param {string} programId - Program ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated program
 */
export async function updateVirtualInternshipProgram(programId, updates) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (updates.title !== undefined) {
    fields.push(`title = $${paramIndex}`);
    values.push(updates.title);
    paramIndex++;
  }
  if (updates.description !== undefined) {
    fields.push(`description = $${paramIndex}`);
    values.push(updates.description);
    paramIndex++;
  }
  if (updates.industry !== undefined) {
    fields.push(`industry = $${paramIndex}`);
    values.push(updates.industry);
    paramIndex++;
  }
  if (updates.durationWeeks !== undefined) {
    fields.push(`duration_weeks = $${paramIndex}`);
    values.push(updates.durationWeeks);
    paramIndex++;
  }
  if (updates.skillRequirements !== undefined) {
    fields.push(`skill_requirements = $${paramIndex}`);
    values.push(updates.skillRequirements ? JSON.stringify(updates.skillRequirements) : null);
    paramIndex++;
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex}`);
    values.push(updates.status);
    paramIndex++;
  }

  if (fields.length === 0) {
    return getVirtualInternshipProgram(programId);
  }

  values.push(programId);

  const result = await query(
    `UPDATE virtual_internship_programs
    SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex}
    RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Delete virtual internship program
 * @param {string} programId - Program ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteVirtualInternshipProgram(programId) {
  const result = await query(
    `DELETE FROM virtual_internship_programs WHERE id = $1 RETURNING id`,
    [programId]
  );

  return result.rows.length > 0;
}

/**
 * Check if user has access to program (company owner or enrolled student)
 * @param {string} programId - Program ID
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<boolean>} Has access
 */
export async function hasAccessToProgram(programId, userId, userRole) {
  if (userRole === 'company') {
    // Company users can access their own programs
    const result = await query(
      `SELECT 1 FROM virtual_internship_programs WHERE id = $1 AND company_user_id = $2`,
      [programId, userId]
    );
    return result.rows.length > 0;
  }

  if (userRole === 'student') {
    // Students can access programs they're enrolled in or published programs
    const result = await query(
      `SELECT 1 FROM virtual_internship_programs p
      LEFT JOIN virtual_internship_enrollments e ON p.id = e.program_id AND e.student_id = $2
      WHERE p.id = $1 AND (p.status = 'published' OR e.id IS NOT NULL)`,
      [programId, userId]
    );
    return result.rows.length > 0;
  }

  return false;
}
