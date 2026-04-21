/**
 * Applications Database Utilities
 * 
 * Provides CRUD operations for internship and job applications.
 * 
 * @module db/placement/applications
 */

import { query, getClient } from '../index.js';

/**
 * Create a new application
 * @param {Object} applicationData - Application data
 * @param {string} applicationData.userId - User UUID
 * @param {string} applicationData.postingId - Posting UUID
 * @param {string} applicationData.coverLetter - Cover letter text
 * @param {string} applicationData.resumeVersionId - Resume version UUID
 * @param {number} applicationData.expectedSalary - Expected salary
 * @param {string} applicationData.notes - Student notes
 * @returns {Promise<Object>} Created application object
 */
export async function createApplication(applicationData) {
  const {
    userId,
    postingId,
    coverLetter,
    resumeVersionId,
    expectedSalary,
    notes
  } = applicationData;
  
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Check if user already applied
    const existing = await client.query(
      `SELECT id FROM applications WHERE user_id = $1 AND posting_id = $2`,
      [userId, postingId]
    );
    
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      throw new Error('You have already applied for this position');
    }
    
    // Create application
    const result = await client.query(
      `INSERT INTO applications (
        user_id, posting_id, application_status,
        cover_letter, resume_version_id,
        expected_salary, notes, applied_at
      ) VALUES ($1, $2, 'pending', $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        userId,
        postingId,
        coverLetter || null,
        resumeVersionId || null,
        expectedSalary || null,
        notes || null
      ]
    );
    
    await client.query('COMMIT');
    
    return mapApplicationRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get an application by ID
 * @param {string} applicationId - Application UUID
 * @param {string} userId - Optional user ID for authorization check
 * @returns {Promise<Object|null>} Application object or null
 */
export async function getApplication(applicationId, userId = null) {
  let queryStr = `
    SELECT 
      a.*,
      jp.title as posting_title,
      jp.company_name,
      jp.posting_type,
      u.first_name || ' ' || u.last_name as applicant_name,
      u.email as applicant_email
    FROM applications a
    INNER JOIN job_postings jp ON a.posting_id = jp.id
    INNER JOIN users u ON a.user_id = u.id
    WHERE a.id = $1
  `;
  
  const params = [applicationId];
  
  if (userId) {
    queryStr += ` AND a.user_id = $2`;
    params.push(userId);
  }
  
  const result = await query(queryStr, params);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapApplicationRow(result.rows[0]);
}

/**
 * Get applications for a user
 * @param {string} userId - User UUID
 * @param {Object} filters - Filter options
 * @param {string} filters.status - Filter by status
 * @param {string} filters.postingType - Filter by posting type
 * @param {number} filters.page - Page number
 * @param {number} filters.pageSize - Items per page
 * @returns {Promise<Object>} Object with applications array and pagination
 */
export async function getUserApplications(userId, filters = {}) {
  const {
    status,
    postingType,
    page = 1,
    pageSize = 10
  } = filters;
  
  const offset = (page - 1) * pageSize;
  const conditions = ['a.user_id = $1'];
  const params = [userId];
  let paramIndex = 2;
  
  if (status) {
    conditions.push(`a.application_status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  
  if (postingType) {
    conditions.push(`jp.posting_type = $${paramIndex}`);
    params.push(postingType);
    paramIndex++;
  }
  
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total 
    FROM applications a
    INNER JOIN job_postings jp ON a.posting_id = jp.id
    ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);
  
  // Get applications
  params.push(pageSize, offset);
  const result = await query(
    `SELECT 
      a.*,
      jp.title as posting_title,
      jp.company_name,
      jp.posting_type,
      jp.location
    FROM applications a
    INNER JOIN job_postings jp ON a.posting_id = jp.id
    ${whereClause}
    ORDER BY a.applied_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );
  
  return {
    applications: result.rows.map(mapApplicationRow),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * Get all applications (admin view)
 * @param {Object} filters - Filter options
 * @param {string} filters.status - Filter by status
 * @param {string} filters.postingId - Filter by posting
 * @param {string} filters.userId - Filter by user
 * @param {string} filters.postingType - Filter by posting type
 * @param {string} filters.organizationId - Filter by organization
 * @param {number} filters.page - Page number
 * @param {number} filters.pageSize - Items per page
 * @returns {Promise<Object>} Object with applications array and pagination
 */
export async function getAllApplications(filters = {}) {
  const {
    status,
    postingId,
    userId,
    postingType,
    organizationId,
    search,
    page = 1,
    pageSize = 10
  } = filters;
  
  const offset = (page - 1) * pageSize;
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  if (status) {
    conditions.push(`a.application_status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  
  if (postingId) {
    conditions.push(`a.posting_id = $${paramIndex}`);
    params.push(postingId);
    paramIndex++;
  }
  
  if (userId) {
    conditions.push(`a.user_id = $${paramIndex}`);
    params.push(userId);
    paramIndex++;
  }
  
  if (postingType) {
    conditions.push(`jp.posting_type = $${paramIndex}`);
    params.push(postingType);
    paramIndex++;
  }
  
  if (organizationId) {
    conditions.push(`jp.organization_id = $${paramIndex}`);
    params.push(organizationId);
    paramIndex++;
  }

  if (search) {
    conditions.push(`(
      u.first_name ILIKE $${paramIndex} OR
      u.last_name ILIKE $${paramIndex} OR
      u.email ILIKE $${paramIndex} OR
      jp.title ILIKE $${paramIndex} OR
      jp.company_name ILIKE $${paramIndex}
    )`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total 
    FROM applications a
    INNER JOIN job_postings jp ON a.posting_id = jp.id
    ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);
  
  // Get applications
  params.push(pageSize, offset);
  const result = await query(
    `SELECT 
      a.*,
      jp.title as posting_title,
      jp.company_name,
      jp.posting_type,
      jp.location,
      u.first_name || ' ' || u.last_name as applicant_name,
      u.email as applicant_email
    FROM applications a
    INNER JOIN job_postings jp ON a.posting_id = jp.id
    INNER JOIN users u ON a.user_id = u.id
    ${whereClause}
    ORDER BY a.applied_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );
  
  return {
    applications: result.rows.map(mapApplicationRow),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * Get applications for company's job postings
 * @param {string} companyUserId - Company user UUID
 * @param {Object} filters - Filter options
 * @param {string} filters.status - Filter by status
 * @param {string} filters.postingId - Filter by posting
 * @param {string} filters.postingType - Filter by posting type
 * @param {string} filters.search - Search term
 * @param {number} filters.page - Page number
 * @param {number} filters.pageSize - Items per page
 * @returns {Promise<Object>} Object with applications array and pagination
 */
export async function getCompanyApplications(companyUserId, filters = {}) {
  const {
    status,
    postingId,
    postingType,
    search,
    page = 1,
    pageSize = 10
  } = filters;
  
  const offset = (page - 1) * pageSize;
  const conditions = [`jp.company_user_id = $1`];
  const params = [companyUserId];
  let paramIndex = 2;
  
  if (status) {
    conditions.push(`a.application_status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  
  if (postingId) {
    conditions.push(`a.posting_id = $${paramIndex}`);
    params.push(postingId);
    paramIndex++;
  }
  
  if (postingType) {
    conditions.push(`jp.posting_type = $${paramIndex}`);
    params.push(postingType);
    paramIndex++;
  }
  
  if (search) {
    conditions.push(`(
      u.first_name ILIKE $${paramIndex} OR
      u.last_name ILIKE $${paramIndex} OR
      u.email ILIKE $${paramIndex} OR
      jp.title ILIKE $${paramIndex}
    )`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total 
    FROM applications a
    INNER JOIN job_postings jp ON a.posting_id = jp.id
    INNER JOIN users u ON a.user_id = u.id
    ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);
  
  // Get applications
  params.push(pageSize, offset);
  const result = await query(
    `SELECT 
      a.*,
      jp.title as posting_title,
      jp.company_name,
      jp.posting_type,
      jp.location,
      u.first_name || ' ' || u.last_name as applicant_name,
      u.email as applicant_email
    FROM applications a
    INNER JOIN job_postings jp ON a.posting_id = jp.id
    INNER JOIN users u ON a.user_id = u.id
    ${whereClause}
    ORDER BY a.applied_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );
  
  return {
    applications: result.rows.map(mapApplicationRow),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * Update application status
 * @param {string} applicationId - Application UUID
 * @param {Object} updates - Fields to update
 * @param {string} updates.status - New status
 * @param {string} updates.adminNotes - Admin notes
 * @param {string} updates.reviewedBy - Reviewer user ID
 * @returns {Promise<Object>} Updated application object
 */
export async function updateApplication(applicationId, updates) {
  const { status, adminNotes, reviewedBy } = updates;
  
  const updateFields = [];
  const params = [];
  let paramIndex = 1;
  
  if (status) {
    updateFields.push(`application_status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
    
    if (status !== 'pending') {
      updateFields.push(`reviewed_at = CURRENT_TIMESTAMP`);
    }
  }
  
  if (adminNotes !== undefined) {
    updateFields.push(`admin_notes = $${paramIndex}`);
    params.push(adminNotes);
    paramIndex++;
  }
  
  if (reviewedBy) {
    updateFields.push(`reviewed_by = $${paramIndex}`);
    params.push(reviewedBy);
    paramIndex++;
  }
  
  if (updateFields.length === 0) {
    throw new Error('No fields to update');
  }
  
  params.push(applicationId);
  const result = await query(
    `UPDATE applications 
    SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${paramIndex}
    RETURNING *`,
    params
  );
  
  if (result.rows.length === 0) {
    throw new Error('Application not found');
  }
  
  return mapApplicationRow(result.rows[0]);
}

/**
 * Withdraw an application
 * @param {string} applicationId - Application UUID
 * @param {string} userId - User UUID (for authorization)
 * @returns {Promise<Object>} Updated application object
 */
export async function withdrawApplication(applicationId, userId) {
  const result = await query(
    `UPDATE applications 
    SET application_status = 'withdrawn', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND user_id = $2
    RETURNING *`,
    [applicationId, userId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Application not found or unauthorized');
  }
  
  return mapApplicationRow(result.rows[0]);
}

/**
 * Delete an application (admin only)
 * @param {string} applicationId - Application UUID
 * @returns {Promise<boolean>} True if deleted
 */
export async function deleteApplication(applicationId) {
  const result = await query(
    `DELETE FROM applications WHERE id = $1 RETURNING id`,
    [applicationId]
  );
  
  return result.rows.length > 0;
}

/**
 * Get application statistics for a user
 * @param {string} userId - User UUID
 * @returns {Promise<Object>} Statistics object
 */
export async function getApplicationStats(userId) {
  const result = await query(
    `SELECT 
      COUNT(*) as total_applications,
      COUNT(CASE WHEN application_status = 'pending' THEN 1 END) as pending,
      COUNT(CASE WHEN application_status = 'reviewing' THEN 1 END) as reviewing,
      COUNT(CASE WHEN application_status = 'shortlisted' THEN 1 END) as shortlisted,
      COUNT(CASE WHEN application_status = 'interview_scheduled' THEN 1 END) as interview_scheduled,
      COUNT(CASE WHEN application_status = 'accepted' THEN 1 END) as accepted,
      COUNT(CASE WHEN application_status = 'rejected' THEN 1 END) as rejected,
      COUNT(CASE WHEN application_status = 'withdrawn' THEN 1 END) as withdrawn
    FROM applications
    WHERE user_id = $1`,
    [userId]
  );
  
  const row = result.rows[0];
  return {
    total: parseInt(row.total_applications),
    pending: parseInt(row.pending),
    reviewing: parseInt(row.reviewing),
    shortlisted: parseInt(row.shortlisted),
    interviewScheduled: parseInt(row.interview_scheduled),
    accepted: parseInt(row.accepted),
    rejected: parseInt(row.rejected),
    withdrawn: parseInt(row.withdrawn)
  };
}

/**
 * Map database row to application object
 * @param {Object} row - Database row
 * @returns {Object} Mapped application object
 */
function mapApplicationRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    postingId: row.posting_id,
    postingTitle: row.posting_title,
    companyName: row.company_name,
    postingType: row.posting_type,
    location: row.location,
    applicationStatus: row.application_status,
    coverLetter: row.cover_letter,
    resumeVersionId: row.resume_version_id,
    expectedSalary: row.expected_salary ? parseFloat(row.expected_salary) : null,
    notes: row.notes,
    appliedAt: row.applied_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    adminNotes: row.admin_notes,
    applicantName: row.applicant_name,
    applicantEmail: row.applicant_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
