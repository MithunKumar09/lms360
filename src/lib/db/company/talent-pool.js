/**
 * Company Talent Pool Access Database Utilities
 * 
 * Provides operations for company talent pool access requests and student search.
 * 
 * @module db/company/talent-pool
 */

import { query } from '../index.js';

/**
 * Request talent pool access
 */
export async function requestTalentPoolAccess(companyUserId, organizationId) {
  const result = await query(
    `INSERT INTO company_talent_pool_access (company_user_id, organization_id, status)
    VALUES ($1, $2, 'pending')
    ON CONFLICT (company_user_id) 
    DO UPDATE SET 
      status = 'pending',
      requested_at = CURRENT_TIMESTAMP,
      approved_by = NULL,
      approved_at = NULL,
      rejection_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *`,
    [companyUserId, organizationId || null]
  );
  
  return mapAccessRequestRow(result.rows[0]);
}

/**
 * Get access request for company
 */
export async function getAccessRequest(companyUserId) {
  const result = await query(
    `SELECT 
      ctp.*,
      u.first_name || ' ' || u.last_name as company_name,
      approver.first_name || ' ' || approver.last_name as approver_name
    FROM company_talent_pool_access ctp
    LEFT JOIN users u ON ctp.company_user_id = u.id
    LEFT JOIN users approver ON ctp.approved_by = approver.id
    WHERE ctp.company_user_id = $1`,
    [companyUserId]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapAccessRequestRow(result.rows[0]);
}

/**
 * Get all access requests (admin view)
 */
export async function getAllAccessRequests(filters = {}) {
  const {
    status,
    organizationId,
    page = 1,
    pageSize = 10
  } = filters;
  
  const offset = (page - 1) * pageSize;
  const conditions = [];
  const params = [];
  let paramIndex = 1;
  
  if (status) {
    conditions.push(`ctp.status = $${paramIndex}`);
    params.push(status);
    paramIndex++;
  }
  
  if (organizationId) {
    conditions.push(`ctp.organization_id = $${paramIndex}`);
    params.push(organizationId);
    paramIndex++;
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total FROM company_talent_pool_access ctp ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);
  
  // Get requests
  params.push(pageSize, offset);
  const result = await query(
    `SELECT 
      ctp.*,
      u.first_name || ' ' || u.last_name as company_name,
      u.email as company_email,
      approver.first_name || ' ' || approver.last_name as approver_name
    FROM company_talent_pool_access ctp
    LEFT JOIN users u ON ctp.company_user_id = u.id
    LEFT JOIN users approver ON ctp.approved_by = approver.id
    ${whereClause}
    ORDER BY ctp.requested_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );
  
  return {
    requests: result.rows.map(mapAccessRequestRow),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * Approve/reject access request
 */
export async function updateAccessRequestStatus(companyUserId, status, approvedBy, rejectionReason = null) {
  const updates = {
    status,
    approved_by: approvedBy,
    approved_at: status === 'approved' ? new Date() : null,
    rejection_reason: rejectionReason
  };
  
  const result = await query(
    `UPDATE company_talent_pool_access
    SET status = $1,
        approved_by = $2,
        approved_at = CASE WHEN $1 = 'approved' THEN CURRENT_TIMESTAMP ELSE approved_at END,
        rejection_reason = $3,
        updated_at = CURRENT_TIMESTAMP
    WHERE company_user_id = $4
    RETURNING *`,
    [status, approvedBy, rejectionReason, companyUserId]
  );
  
  if (result.rows.length === 0) {
    throw new Error('Access request not found');
  }
  
  return mapAccessRequestRow(result.rows[0]);
}

/**
 * Check if company has approved access
 */
export async function hasApprovedAccess(companyUserId) {
  const result = await query(
    `SELECT id FROM company_talent_pool_access
    WHERE company_user_id = $1 AND status = 'approved'
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
    [companyUserId]
  );
  
  return result.rows.length > 0;
}

/**
 * Add student to shortlist
 */
export async function addToShortlist(companyUserId, studentId, notes = null, tags = null) {
  const result = await query(
    `INSERT INTO company_student_shortlist (company_user_id, student_id, notes, tags)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (company_user_id, student_id)
    DO UPDATE SET notes = $3, tags = $4
    RETURNING *`,
    [companyUserId, studentId, notes, tags]
  );
  
  return mapShortlistRow(result.rows[0]);
}

/**
 * Remove student from shortlist
 */
export async function removeFromShortlist(companyUserId, studentId) {
  const result = await query(
    `DELETE FROM company_student_shortlist
    WHERE company_user_id = $1 AND student_id = $2
    RETURNING id`,
    [companyUserId, studentId]
  );
  
  return result.rows.length > 0;
}

/**
 * Get company shortlist
 */
export async function getShortlist(companyUserId, filters = {}) {
  const {
    search,
    tags,
    page = 1,
    pageSize = 10
  } = filters;
  
  const offset = (page - 1) * pageSize;
  const conditions = [`css.company_user_id = $1`];
  const params = [companyUserId];
  let paramIndex = 2;
  
  if (search) {
    conditions.push(`(
      u.first_name ILIKE $${paramIndex} OR
      u.last_name ILIKE $${paramIndex} OR
      u.email ILIKE $${paramIndex}
    )`);
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  if (tags && tags.length > 0) {
    conditions.push(`css.tags && $${paramIndex}`);
    params.push(tags);
    paramIndex++;
  }
  
  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  
  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total
    FROM company_student_shortlist css
    INNER JOIN users u ON css.student_id = u.id
    ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].total);
  
  // Get shortlist
  params.push(pageSize, offset);
  const result = await query(
    `SELECT 
      css.*,
      u.first_name || ' ' || u.last_name as student_name,
      u.email as student_email
    FROM company_student_shortlist css
    INNER JOIN users u ON css.student_id = u.id
    ${whereClause}
    ORDER BY css.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    params
  );
  
  return {
    students: result.rows.map(mapShortlistRow),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
}

/**
 * Map access request row
 */
function mapAccessRequestRow(row) {
  return {
    id: row.id,
    companyUserId: row.company_user_id,
    organizationId: row.organization_id,
    requestedAt: row.requested_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    status: row.status,
    rejectionReason: row.rejection_reason,
    expiresAt: row.expires_at,
    companyName: row.company_name,
    approverName: row.approver_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Map shortlist row
 */
function mapShortlistRow(row) {
  return {
    id: row.id,
    companyUserId: row.company_user_id,
    studentId: row.student_id,
    studentName: row.student_name,
    studentEmail: row.student_email,
    notes: row.notes,
    tags: row.tags || [],
    createdAt: row.created_at
  };
}
