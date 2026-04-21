/**
 * Brand Superadmin Database Utilities
 * 
 * Provides database functions for superadmin brand management.
 */

import { query } from '@/lib/db/index.js';

/**
 * Get all brand profiles with filters
 * 
 * @param {Object} filters - Filter options (status, page, limit)
 * @returns {Promise<Object>} Brand profiles list with pagination
 */
export async function getAllBrandProfiles(filters = {}) {
  const { status = null, page = 1, limit = 50 } = filters;
  const offset = (page - 1) * limit;

  // Check which status column exists
  const columnCheckQuery = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'brand_profiles' 
    AND column_name IN ('status', 'approval_status')
    LIMIT 1
  `;
  const columnCheck = await query(columnCheckQuery);
  const hasStatusColumn = columnCheck.rows.some(row => row.column_name === 'status');
  const hasApprovalStatusColumn = columnCheck.rows.some(row => row.column_name === 'approval_status');
  const statusColumn = hasStatusColumn ? 'status' : (hasApprovalStatusColumn ? 'approval_status' : null);

  let whereClause = '';
  const params = [];
  let paramIndex = 1;

  if (status && statusColumn) {
    whereClause = `WHERE bp.${statusColumn} = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }

  // Build status select based on what exists
  let statusSelect = '';
  if (hasStatusColumn) {
    statusSelect = 'bp.status as approval_status,';
  } else if (hasApprovalStatusColumn) {
    statusSelect = 'bp.approval_status, bp.approval_status as status,';
  } else {
    // No status column - all brands are approved by default
    statusSelect = "'approved' as status, 'approved' as approval_status,";
  }

  const brandsQuery = `
    SELECT 
      bp.*,
      ${statusSelect}
      u.email as user_email,
      u.first_name || ' ' || u.last_name as user_name
    FROM brand_profiles bp
    INNER JOIN users u ON u.id = bp.user_id
    ${whereClause}
    ORDER BY bp.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const countQuery = `
    SELECT COUNT(*) as total
    FROM brand_profiles bp
    ${whereClause}
  `;

  const [brandsResult, countResult] = await Promise.all([
    query(brandsQuery, params),
    query(countQuery, params.slice(0, paramIndex - 1)),
  ]);

  return {
    brands: brandsResult.rows,
    pagination: {
      page,
      limit,
      total: parseInt(countResult.rows[0]?.total || 0),
      totalPages: Math.ceil((parseInt(countResult.rows[0]?.total || 0)) / limit),
    },
  };
}

/**
 * Get brand profile by ID
 * 
 * @param {string} profileId - Brand profile ID
 * @returns {Promise<Object|null>} Brand profile or null
 */
export async function getBrandProfileById(profileId) {
  const profileQuery = `
    SELECT 
      bp.*,
      u.email as user_email,
      u.first_name || ' ' || u.last_name as user_name
    FROM brand_profiles bp
    INNER JOIN users u ON u.id = bp.user_id
    WHERE bp.id = $1
    LIMIT 1
  `;
  const result = await query(profileQuery, [profileId]);
  return result.rows[0] || null;
}

/**
 * Allocate event to colleges (superadmin only)
 * 
 * @param {string} eventId - Event ID
 * @param {Array<string>} orgIds - Array of organization IDs
 * @param {string} allocatedBy - Superadmin user ID
 * @returns {Promise<Array>} Array of allocation records
 */
export async function allocateEventToColleges(eventId, orgIds, allocatedBy) {
  if (!orgIds || orgIds.length === 0) {
    return [];
  }

  const allocations = [];
  for (const orgId of orgIds) {
    // Use ON CONFLICT to handle duplicates
    const insertQuery = `
      INSERT INTO brand_event_college_allocations (
        event_id,
        org_id,
        allocated_by
      ) VALUES ($1, $2, $3)
      ON CONFLICT (event_id, org_id) DO UPDATE SET
        allocated_by = EXCLUDED.allocated_by,
        allocated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await query(insertQuery, [eventId, orgId, allocatedBy]);
    allocations.push(result.rows[0]);
  }

  return allocations;
}

/**
 * Get event college allocations
 * 
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} Array of allocation records with org details
 */
export async function getEventCollegeAllocations(eventId) {
  const allocationsQuery = `
    SELECT 
      beca.*,
      o.name as org_name,
      o.display_name as org_display_name
    FROM brand_event_college_allocations beca
    INNER JOIN organizations o ON o.id = beca.org_id
    WHERE beca.event_id = $1
    ORDER BY beca.allocated_at DESC
  `;
  const result = await query(allocationsQuery, [eventId]);
  return result.rows;
}
