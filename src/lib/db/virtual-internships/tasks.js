/**
 * Virtual Internship Tasks Database Functions
 * 
 * CRUD operations for virtual internship tasks
 * Mirrors assignment functionality but for tasks within programs
 */

import { query } from '../index.js';

/**
 * Create a virtual internship task
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} Created task
 */
export async function createVirtualInternshipTask(taskData) {
  const {
    programId,
    createdBy,
    title,
    description,
    instructions,
    maxMarks = 100,
    passingMarks = 50,
    dueDate,
    allowLateSubmission = false,
    lateSubmissionPenalty = 0,
    maxFileSizeMb = 10,
    allowedFileTypes = [],
    status = 'draft',
    orderIndex = 0,
  } = taskData;

  const result = await query(
    `INSERT INTO virtual_internship_tasks (
      program_id,
      created_by,
      title,
      description,
      instructions,
      max_marks,
      passing_marks,
      due_date,
      allow_late_submission,
      late_submission_penalty,
      max_file_size_mb,
      allowed_file_types,
      status,
      order_index
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      programId,
      createdBy,
      title,
      description || null,
      instructions || null,
      maxMarks,
      passingMarks,
      dueDate,
      allowLateSubmission,
      lateSubmissionPenalty,
      maxFileSizeMb,
      allowedFileTypes,
      status,
      orderIndex,
    ]
  );

  return result.rows[0];
}

/**
 * Get virtual internship task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Object|null>} Task or null
 */
export async function getVirtualInternshipTask(taskId) {
  const result = await query(
    `SELECT 
      t.*,
      p.title as program_title,
      p.company_user_id
    FROM virtual_internship_tasks t
    LEFT JOIN virtual_internship_programs p ON t.program_id = p.id
    WHERE t.id = $1`,
    [taskId]
  );

  if (result.rows.length === 0) return null;

  const task = result.rows[0];
  return {
    id: task.id,
    programId: task.program_id,
    createdBy: task.created_by,
    title: task.title,
    description: task.description,
    instructions: task.instructions,
    maxMarks: parseFloat(task.max_marks),
    passingMarks: parseFloat(task.passing_marks),
    dueDate: task.due_date,
    allowLateSubmission: task.allow_late_submission,
    lateSubmissionPenalty: parseFloat(task.late_submission_penalty),
    maxFileSizeMb: task.max_file_size_mb,
    allowedFileTypes: task.allowed_file_types || [],
    status: task.status,
    orderIndex: task.order_index,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    programTitle: task.program_title,
    companyUserId: task.company_user_id,
  };
}

/**
 * List virtual internship tasks for a program
 * @param {string} programId - Program ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Tasks
 */
export async function listVirtualInternshipTasks(programId, filters = {}) {
  const { status = null } = filters;
  
  const conditions = ['t.program_id = $1'];
  const params = [programId];
  let paramIndex = 2;

  if (status) {
    conditions.push(`t.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT t.*
    FROM virtual_internship_tasks t
    ${whereClause}
    ORDER BY t.order_index ASC, t.created_at ASC`,
    params
  );

  return result.rows.map(row => ({
    id: row.id,
    programId: row.program_id,
    createdBy: row.created_by,
    title: row.title,
    description: row.description,
    instructions: row.instructions,
    maxMarks: parseFloat(row.max_marks),
    passingMarks: parseFloat(row.passing_marks),
    dueDate: row.due_date,
    allowLateSubmission: row.allow_late_submission,
    lateSubmissionPenalty: parseFloat(row.late_submission_penalty),
    maxFileSizeMb: row.max_file_size_mb,
    allowedFileTypes: row.allowed_file_types || [],
    status: row.status,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Update virtual internship task
 * @param {string} taskId - Task ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated task
 */
export async function updateVirtualInternshipTask(taskId, updates) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  const fieldMap = {
    title: 'title',
    description: 'description',
    instructions: 'instructions',
    maxMarks: 'max_marks',
    passingMarks: 'passing_marks',
    dueDate: 'due_date',
    allowLateSubmission: 'allow_late_submission',
    lateSubmissionPenalty: 'late_submission_penalty',
    maxFileSizeMb: 'max_file_size_mb',
    allowedFileTypes: 'allowed_file_types',
    status: 'status',
    orderIndex: 'order_index',
  };

  for (const [key, dbField] of Object.entries(fieldMap)) {
    if (updates[key] !== undefined) {
      fields.push(`${dbField} = $${paramIndex}`);
      if (key === 'allowedFileTypes') {
        values.push(Array.isArray(updates[key]) ? updates[key] : []);
      } else {
        values.push(updates[key]);
      }
      paramIndex++;
    }
  }

  if (fields.length === 0) {
    return getVirtualInternshipTask(taskId);
  }

  values.push(taskId);

  const result = await query(
    `UPDATE virtual_internship_tasks
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
 * Delete virtual internship task
 * @param {string} taskId - Task ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteVirtualInternshipTask(taskId) {
  const result = await query(
    `DELETE FROM virtual_internship_tasks WHERE id = $1 RETURNING id`,
    [taskId]
  );

  return result.rows.length > 0;
}

/**
 * Check if user has access to task (company owner or enrolled student)
 * @param {string} taskId - Task ID
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Promise<boolean>} Has access
 */
export async function hasAccessToTask(taskId, userId, userRole) {
  if (userRole === 'company') {
    // Company users can access tasks in their programs
    const result = await query(
      `SELECT 1 FROM virtual_internship_tasks t
      JOIN virtual_internship_programs p ON t.program_id = p.id
      WHERE t.id = $1 AND p.company_user_id = $2`,
      [taskId, userId]
    );
    return result.rows.length > 0;
  }

  if (userRole === 'student') {
    // Students can access tasks in programs they're enrolled in
    const result = await query(
      `SELECT 1 FROM virtual_internship_tasks t
      JOIN virtual_internship_programs p ON t.program_id = p.id
      JOIN virtual_internship_enrollments e ON p.id = e.program_id AND e.student_id = $2
      WHERE t.id = $1 AND e.enrollment_status IN ('accepted', 'in_progress', 'completed')`,
      [taskId, userId]
    );
    return result.rows.length > 0;
  }

  return false;
}
