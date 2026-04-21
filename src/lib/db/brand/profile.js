/**
 * Brand Profile Database Utilities
 * 
 * Provides database functions for brand profile management.
 */

import { query } from '@/lib/db/index.js';

/**
 * Get brand profile by user ID
 * 
 * @param {string} userId - Brand user ID
 * @returns {Promise<Object|null>} Brand profile or null
 */
export async function getBrandProfile(userId) {
  try {
    // First, check if status column exists
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
    
    // Build SELECT based on what columns exist
    let statusSelect = '';
    if (hasStatusColumn) {
      statusSelect = 'status, status as approval_status,';
    } else if (hasApprovalStatusColumn) {
      statusSelect = 'approval_status, approval_status as status,';
    } else {
      // No status column exists - brand accounts are approved by default
      statusSelect = "'approved' as status, 'approved' as approval_status,";
    }
    
    const profileQuery = `
      SELECT 
        id,
        user_id,
        brand_name,
        industry,
        logo_url,
        website_url,
        contact_email,
        contact_phone,
        csr_initiatives,
        focus_areas,
        mission,
        values,
        description,
        ${statusSelect}
        created_at,
        updated_at
      FROM brand_profiles
      WHERE user_id = $1
      LIMIT 1
    `;
    const result = await query(profileQuery, [userId]);
    return result.rows[0] || null;
  } catch (error) {
    // Table doesn't exist - that's okay, brand can still function
    // Brands created by superadmin don't necessarily need brand_profiles table
    if (error.code === '42P01') {
      // Table doesn't exist - expected behavior, no logging needed
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Create or update brand profile
 * 
 * @param {string} userId - Brand user ID
 * @param {Object} profileData - Profile data
 * @returns {Promise<Object>} Created/updated profile
 */
export async function upsertBrandProfile(userId, profileData) {
  try {
    const {
      brand_name,
      industry,
      logo_url,
      website_url,
      contact_email,
      contact_phone,
      csr_initiatives,
      focus_areas,
      mission,
      values,
      description,
    } = profileData;

    // Check if profile exists
    const existing = await getBrandProfile(userId);

    if (existing) {
      // Update existing profile (no approval status handling needed)
      const updateQuery = `
        UPDATE brand_profiles
        SET 
          brand_name = $2,
          industry = $3,
          logo_url = $4,
          website_url = $5,
          contact_email = $6,
          contact_phone = $7,
          csr_initiatives = $8,
          focus_areas = $9,
          mission = $10,
          values = $11,
          description = $12,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING id, user_id, brand_name, industry, logo_url, website_url, contact_email, contact_phone, csr_initiatives, focus_areas, mission, values, description, created_at, updated_at
      `;
      const result = await query(updateQuery, [
        userId,
        brand_name,
        industry,
        logo_url || null,
        website_url || null,
        contact_email || null,
        contact_phone || null,
        csr_initiatives || null,
        focus_areas || null,
        mission || null,
        values || null,
        description || null,
      ]);
      return result.rows[0];
    } else {
      // Create new profile - brand accounts created by superadmin are approved by default
      // Check if status column exists before including it
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
      
      let statusColumn = '';
      let statusValue = '';
      let statusReturn = '';
      
      if (hasStatusColumn) {
        statusColumn = ', status';
        statusValue = ", 'approved'";
        statusReturn = ', status';
      } else if (hasApprovalStatusColumn) {
        statusColumn = ', approval_status';
        statusValue = ", 'approved'";
        statusReturn = ', approval_status';
      }
      // If neither exists, just don't include status (brands are approved by default in logic)
      
      const insertQuery = `
        INSERT INTO brand_profiles (
          user_id,
          brand_name,
          industry,
          logo_url,
          website_url,
          contact_email,
          contact_phone,
          csr_initiatives,
          focus_areas,
          mission,
          values,
          description${statusColumn}
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12${statusValue})
        RETURNING id, user_id, brand_name, industry, logo_url, website_url, contact_email, contact_phone, csr_initiatives, focus_areas, mission, values, description${statusReturn}, created_at, updated_at
      `;
      const result = await query(insertQuery, [
        userId,
        brand_name,
        industry,
        logo_url || null,
        website_url || null,
        contact_email || null,
        contact_phone || null,
        csr_initiatives || null,
        focus_areas || null,
        mission || null,
        values || null,
        description || null,
      ]);
      return result.rows[0];
    }
  } catch (error) {
    // Handle missing table gracefully
    if (error.code === '42P01') {
      // Table doesn't exist - expected behavior, throw migration error without logging
      const migrationError = new Error('Brand profile feature is not available. Please ensure the database tables are created.');
      migrationError.isMigrationError = true;
      migrationError.code = 'MIGRATION_REQUIRED';
      throw migrationError;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Approve brand profile (superadmin only)
 * 
 * @param {string} profileId - Brand profile ID
 * @param {string} approvedBy - Superadmin user ID
 * @returns {Promise<Object>} Updated profile
 */
export async function approveBrandProfile(profileId, approvedBy) {
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
  const statusColumn = hasStatusColumn ? 'status' : 'approval_status';
  
  const updateQuery = `
    UPDATE brand_profiles
    SET 
      ${statusColumn} = 'approved',
      approved_by = $2,
      approved_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await query(updateQuery, [profileId, approvedBy]);
  return result.rows[0];
}

/**
 * Reject brand profile (superadmin only)
 * 
 * @param {string} profileId - Brand profile ID
 * @param {string} approvedBy - Superadmin user ID
 * @param {string} rejectionReason - Reason for rejection
 * @returns {Promise<Object>} Updated profile
 */
export async function rejectBrandProfile(profileId, approvedBy, rejectionReason) {
  // Check which status column exists and if rejection_reason column exists
  const columnCheckQuery = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'brand_profiles' 
    AND column_name IN ('status', 'approval_status', 'rejection_reason')
  `;
  const columnCheck = await query(columnCheckQuery);
  const hasStatusColumn = columnCheck.rows.some(row => row.column_name === 'status');
  const hasApprovalStatusColumn = columnCheck.rows.some(row => row.column_name === 'approval_status');
  const hasRejectionReasonColumn = columnCheck.rows.some(row => row.column_name === 'rejection_reason');
  const statusColumn = hasStatusColumn ? 'status' : 'approval_status';
  
  // Build the SET clause dynamically based on available columns
  let setClause = `
    ${statusColumn} = 'rejected',
    approved_by = $2,
    approved_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
  `;
  const params = [profileId, approvedBy];
  
  // Add rejection_reason if column exists
  if (hasRejectionReasonColumn && rejectionReason) {
    setClause += `, rejection_reason = $${params.length + 1}`;
    params.push(rejectionReason.trim());
  }
  
  const updateQuery = `
    UPDATE brand_profiles
    SET ${setClause}
    WHERE id = $1
    RETURNING *
  `;
  const result = await query(updateQuery, params);
  return result.rows[0];
}
