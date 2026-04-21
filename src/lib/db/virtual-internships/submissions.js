/**
 * Virtual Internship Submissions Database Functions
 * 
 * Operations for student submissions of virtual internship tasks
 * Mirrors assignment submission functionality
 */

import { query, getClient } from '../index.js';

/**
 * Create submission
 * @param {Object} submissionData - Submission data
 * @returns {Promise<Object>} Created submission
 */
export async function createVirtualInternshipSubmission(submissionData) {
  const {
    taskId,
    studentId,
    programId,
    isLate = false,
  } = submissionData;

  // Get program_id from task if not provided
  let finalProgramId = programId;
  if (!finalProgramId) {
    const taskQuery = await query('SELECT program_id FROM virtual_internship_tasks WHERE id = $1', [taskId]);
    if (taskQuery.rows.length > 0) {
      finalProgramId = taskQuery.rows[0].program_id;
    }
  }

  const result = await query(
    `INSERT INTO virtual_internship_submissions (
      task_id,
      student_id,
      program_id,
      is_late,
      status
    ) VALUES ($1, $2, $3, $4, 'submitted')
    ON CONFLICT (task_id, student_id) DO UPDATE SET
      submitted_at = CURRENT_TIMESTAMP,
      is_late = EXCLUDED.is_late,
      status = 'submitted',
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [taskId, studentId, finalProgramId, isLate]
  );

  return result.rows[0];
}

/**
 * Get submission by ID
 * @param {string} submissionId - Submission ID
 * @returns {Promise<Object|null>} Submission or null
 */
export async function getVirtualInternshipSubmission(submissionId) {
  const result = await query(
    `SELECT 
      s.*,
      t.title as task_title,
      t.max_marks,
      t.passing_marks,
      p.title as program_title,
      u.first_name || ' ' || u.last_name as student_name,
      u.email as student_email,
      grader.first_name || ' ' || grader.last_name as grader_name
    FROM virtual_internship_submissions s
    LEFT JOIN virtual_internship_tasks t ON s.task_id = t.id
    LEFT JOIN virtual_internship_programs p ON s.program_id = p.id
    LEFT JOIN users u ON s.student_id = u.id
    LEFT JOIN users grader ON s.graded_by = grader.id
    WHERE s.id = $1`,
    [submissionId]
  );

  if (result.rows.length === 0) return null;

  const submission = result.rows[0];
  return {
    id: submission.id,
    taskId: submission.task_id,
    studentId: submission.student_id,
    programId: submission.program_id,
    submittedAt: submission.submitted_at,
    isLate: submission.is_late,
    marksObtained: submission.marks_obtained ? parseFloat(submission.marks_obtained) : null,
    feedback: submission.feedback,
    gradedBy: submission.graded_by,
    gradedAt: submission.graded_at,
    status: submission.status,
    createdAt: submission.created_at,
    updatedAt: submission.updated_at,
    taskTitle: submission.task_title,
    maxMarks: parseFloat(submission.max_marks),
    passingMarks: parseFloat(submission.passing_marks),
    programTitle: submission.program_title,
    studentName: submission.student_name,
    studentEmail: submission.student_email,
    graderName: submission.grader_name,
  };
}

/**
 * Get submission by task and student
 * @param {string} taskId - Task ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Object|null>} Submission or null
 */
export async function getSubmissionByTaskAndStudent(taskId, studentId) {
  const result = await query(
    `SELECT * FROM virtual_internship_submissions
    WHERE task_id = $1 AND student_id = $2`,
    [taskId, studentId]
  );

  if (result.rows.length === 0) return null;

  return result.rows[0];
}

/**
 * List submissions for a task
 * @param {string} taskId - Task ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Submissions
 */
export async function listTaskSubmissions(taskId, filters = {}) {
  const { status = null } = filters;
  
  const conditions = ['s.task_id = $1'];
  const params = [taskId];
  let paramIndex = 2;

  if (status) {
    conditions.push(`s.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT 
      s.*,
      u.first_name || ' ' || u.last_name as student_name,
      u.email as student_email
    FROM virtual_internship_submissions s
    LEFT JOIN users u ON s.student_id = u.id
    ${whereClause}
    ORDER BY s.submitted_at DESC`,
    params
  );

  return result.rows.map(row => ({
    id: row.id,
    taskId: row.task_id,
    studentId: row.student_id,
    programId: row.program_id,
    submittedAt: row.submitted_at,
    isLate: row.is_late,
    marksObtained: row.marks_obtained ? parseFloat(row.marks_obtained) : null,
    feedback: row.feedback,
    gradedBy: row.graded_by,
    gradedAt: row.graded_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    studentName: row.student_name,
    studentEmail: row.student_email,
  }));
}

/**
 * List submissions for a student
 * @param {string} studentId - Student ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Submissions
 */
export async function listStudentSubmissions(studentId, filters = {}) {
  const { programId = null, status = null } = filters;
  
  const conditions = ['s.student_id = $1'];
  const params = [studentId];
  let paramIndex = 2;

  if (programId) {
    conditions.push(`s.program_id = $${paramIndex}`);
    params.push(programId);
    paramIndex++;
  }

  if (status) {
    conditions.push(`s.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT 
      s.*,
      t.title as task_title,
      p.title as program_title
    FROM virtual_internship_submissions s
    LEFT JOIN virtual_internship_tasks t ON s.task_id = t.id
    LEFT JOIN virtual_internship_programs p ON s.program_id = p.id
    ${whereClause}
    ORDER BY s.submitted_at DESC`,
    params
  );

  return result.rows.map(row => ({
    id: row.id,
    taskId: row.task_id,
    studentId: row.student_id,
    programId: row.program_id,
    submittedAt: row.submitted_at,
    isLate: row.is_late,
    marksObtained: row.marks_obtained ? parseFloat(row.marks_obtained) : null,
    feedback: row.feedback,
    gradedBy: row.graded_by,
    gradedAt: row.graded_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    taskTitle: row.task_title,
    programTitle: row.program_title,
  }));
}

/**
 * Grade submission
 * @param {string} submissionId - Submission ID
 * @param {Object} gradingData - Grading data
 * @param {number|null} gradingData.marksObtained - Marks obtained
 * @param {string|null} gradingData.feedback - Feedback
 * @param {string} gradingData.status - Status (graded, returned)
 * @param {string} gradingData.gradedBy - User ID of grader
 * @returns {Promise<Object>} Updated submission
 */
export async function gradeVirtualInternshipSubmission(submissionId, gradingData) {
  const {
    marksObtained,
    feedback,
    status,
    gradedBy,
  } = gradingData;

  const result = await query(
    `UPDATE virtual_internship_submissions
    SET marks_obtained = $1,
        feedback = $2,
        status = $3,
        graded_by = $4,
        graded_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *`,
    [marksObtained, feedback || null, status, gradedBy, submissionId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Get submission files
 * @param {string} submissionId - Submission ID
 * @returns {Promise<Array>} Files
 */
export async function getSubmissionFiles(submissionId) {
  const result = await query(
    `SELECT * FROM virtual_internship_submission_files
    WHERE submission_id = $1
    ORDER BY created_at ASC`,
    [submissionId]
  );

  return result.rows.map(row => ({
    id: row.id,
    submissionId: row.submission_id,
    fileKey: row.file_key,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSizeBytes: row.file_size_bytes,
    description: row.description,
    createdAt: row.created_at,
  }));
}

/**
 * Add file to submission
 * @param {Object} fileData - File data
 * @returns {Promise<Object>} Created file record
 */
export async function addSubmissionFile(fileData) {
  const {
    submissionId,
    fileKey,
    fileUrl,
    fileName,
    fileType,
    fileSizeBytes,
    description = null,
  } = fileData;

  const result = await query(
    `INSERT INTO virtual_internship_submission_files (
      submission_id,
      file_key,
      file_url,
      file_name,
      file_type,
      file_size_bytes,
      description
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [submissionId, fileKey, fileUrl, fileName, fileType, fileSizeBytes, description]
  );

  return result.rows[0];
}

/**
 * Delete submission file
 * @param {string} fileId - File ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteSubmissionFile(fileId) {
  const result = await query(
    `DELETE FROM virtual_internship_submission_files WHERE id = $1 RETURNING id`,
    [fileId]
  );

  return result.rows.length > 0;
}

/**
 * Get task attachments
 * @param {string} taskId - Task ID
 * @returns {Promise<Array>} Attachments
 */
export async function getTaskAttachments(taskId) {
  const result = await query(
    `SELECT * FROM virtual_internship_task_attachments
    WHERE task_id = $1
    ORDER BY created_at ASC`,
    [taskId]
  );

  return result.rows.map(row => ({
    id: row.id,
    taskId: row.task_id,
    fileKey: row.file_key,
    fileUrl: row.file_url,
    fileName: row.file_name,
    fileType: row.file_type,
    fileSizeBytes: row.file_size_bytes,
    createdAt: row.created_at,
  }));
}

/**
 * Add task attachment
 * @param {Object} attachmentData - Attachment data
 * @returns {Promise<Object>} Created attachment
 */
export async function addTaskAttachment(attachmentData) {
  const {
    taskId,
    fileKey,
    fileUrl,
    fileName,
    fileType,
    fileSizeBytes,
  } = attachmentData;

  const result = await query(
    `INSERT INTO virtual_internship_task_attachments (
      task_id,
      file_key,
      file_url,
      file_name,
      file_type,
      file_size_bytes
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [taskId, fileKey, fileUrl, fileName, fileType, fileSizeBytes]
  );

  return result.rows[0];
}

/**
 * Delete task attachment
 * @param {string} attachmentId - Attachment ID
 * @returns {Promise<boolean>} Success
 */
export async function deleteTaskAttachment(attachmentId) {
  const result = await query(
    `DELETE FROM virtual_internship_task_attachments WHERE id = $1 RETURNING id`,
    [attachmentId]
  );

  return result.rows.length > 0;
}
