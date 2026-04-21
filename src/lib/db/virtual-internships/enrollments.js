/**
 * Virtual Internship Enrollments Database Functions
 * 
 * Operations for student enrollments in virtual internship programs
 */

import { query } from '../index.js';

/**
 * Create enrollment (student applies/enrolls in program)
 * @param {string} programId - Program ID
 * @param {string} studentId - Student ID
 * @param {string} enrollmentStatus - Enrollment status (default: 'applied')
 * @returns {Promise<Object>} Created enrollment
 */
export async function createVirtualInternshipEnrollment(programId, studentId, enrollmentStatus = 'applied') {
  const result = await query(
    `INSERT INTO virtual_internship_enrollments (
      program_id,
      student_id,
      enrollment_status
    ) VALUES ($1, $2, $3)
    ON CONFLICT (program_id, student_id) DO UPDATE SET
      enrollment_status = EXCLUDED.enrollment_status,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [programId, studentId, enrollmentStatus]
  );

  return result.rows[0];
}

/**
 * Get enrollment by program and student
 * @param {string} programId - Program ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Object|null>} Enrollment or null
 */
export async function getVirtualInternshipEnrollment(programId, studentId) {
  const result = await query(
    `SELECT * FROM virtual_internship_enrollments
    WHERE program_id = $1 AND student_id = $2`,
    [programId, studentId]
  );

  if (result.rows.length === 0) return null;

  const enrollment = result.rows[0];
  return {
    id: enrollment.id,
    programId: enrollment.program_id,
    studentId: enrollment.student_id,
    enrollmentStatus: enrollment.enrollment_status,
    enrolledAt: enrollment.enrolled_at,
    completedAt: enrollment.completed_at,
    createdAt: enrollment.created_at,
    updatedAt: enrollment.updated_at,
  };
}

/**
 * List enrollments for a program
 * @param {string} programId - Program ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Enrollments
 */
export async function listProgramEnrollments(programId, filters = {}) {
  const { status = null } = filters;
  
  const conditions = ['e.program_id = $1'];
  const params = [programId];
  let paramIndex = 2;

  if (status) {
    conditions.push(`e.enrollment_status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT 
      e.*,
      u.first_name || ' ' || u.last_name as student_name,
      u.email as student_email
    FROM virtual_internship_enrollments e
    LEFT JOIN users u ON e.student_id = u.id
    ${whereClause}
    ORDER BY e.enrolled_at DESC`,
    params
  );

  return result.rows.map(row => ({
    id: row.id,
    programId: row.program_id,
    studentId: row.student_id,
    enrollmentStatus: row.enrollment_status,
    enrolledAt: row.enrolled_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    studentName: row.student_name,
    studentEmail: row.student_email,
  }));
}

/**
 * List enrollments for a student
 * @param {string} studentId - Student ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Enrollments
 */
export async function listStudentEnrollments(studentId, filters = {}) {
  const { status = null } = filters;
  
  const conditions = ['e.student_id = $1'];
  const params = [studentId];
  let paramIndex = 2;

  if (status) {
    conditions.push(`e.enrollment_status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT 
      e.*,
      p.title as program_title,
      p.description as program_description,
      p.industry,
      u.first_name || ' ' || u.last_name as company_name
    FROM virtual_internship_enrollments e
    LEFT JOIN virtual_internship_programs p ON e.program_id = p.id
    LEFT JOIN users u ON p.company_user_id = u.id
    ${whereClause}
    ORDER BY e.enrolled_at DESC`,
    params
  );

  return result.rows.map(row => ({
    id: row.id,
    programId: row.program_id,
    studentId: row.student_id,
    enrollmentStatus: row.enrollment_status,
    enrolledAt: row.enrolled_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    programTitle: row.program_title,
    programDescription: row.program_description,
    industry: row.industry,
    companyName: row.company_name,
  }));
}

/**
 * Update enrollment status
 * @param {string} programId - Program ID
 * @param {string} studentId - Student ID
 * @param {string} enrollmentStatus - New status
 * @returns {Promise<Object>} Updated enrollment
 */
export async function updateEnrollmentStatus(programId, studentId, enrollmentStatus) {
  const result = await query(
    `UPDATE virtual_internship_enrollments
    SET enrollment_status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE program_id = $2 AND student_id = $3
    RETURNING *`,
    [enrollmentStatus, programId, studentId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Check if student is enrolled in program
 * @param {string} programId - Program ID
 * @param {string} studentId - Student ID
 * @returns {Promise<boolean>} Is enrolled
 */
export async function isStudentEnrolled(programId, studentId) {
  const result = await query(
    `SELECT 1 FROM virtual_internship_enrollments
    WHERE program_id = $1 AND student_id = $2
    AND enrollment_status IN ('accepted', 'in_progress', 'completed')`,
    [programId, studentId]
  );

  return result.rows.length > 0;
}
