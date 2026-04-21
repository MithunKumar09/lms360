/**
 * Brand Permissions Utilities
 * 
 * Provides permission checking for brand role that integrates with:
 * - Brand profile approval status
 * - Event status and ownership
 * - Certificate ownership
 * 
 * These functions check both the base permission AND the brand-specific
 * business rules to ensure brands can only access what they're allowed to.
 */

import { query } from '@/lib/db/index.js';
import { Permission, hasPermission } from './permissions.js';

/**
 * Get brand profile ID from user ID
 * 
 * @param {string} userId - Brand user ID
 * @returns {Promise<string|null>} Brand profile ID or null
 */
async function getBrandProfileId(userId) {
  try {
    const result = await query(
      `SELECT id FROM brand_profiles WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    // Table doesn't exist - that's okay, return null gracefully
    if (error.code === '42P01') {
      // Expected behavior, no logging needed
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Check if brand profile is approved
 * 
 * Note: Brand accounts created by superadmin don't require approval.
 * This function always returns true for brand role accounts.
 * 
 * @param {string} userId - Brand user ID
 * @returns {Promise<boolean>} Whether brand profile is approved
 */
export async function isBrandProfileApproved(userId) {
  try {
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
    
    if (!hasStatusColumn && !hasApprovalStatusColumn) {
      // No status column exists - brand accounts are approved by default
      return true;
    }
    
    const statusColumn = hasStatusColumn ? 'status' : 'approval_status';
    const result = await query(
      `SELECT ${statusColumn} FROM brand_profiles WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    
    // If profile doesn't exist, allow access (brand accounts don't need approval)
    if (result.rows.length === 0) {
      return true;
    }
    
    // Check if status is 'approved'
    return result.rows[0]?.[statusColumn] === 'approved';
  } catch (error) {
    // Table doesn't exist or column doesn't exist - allow brands to proceed
    // Brand accounts created by superadmin don't require approval
    if (error.code === '42P01' || error.code === '42703') {
      // Expected behavior, no logging needed
      return true; // Allow access - brand accounts are approved by default
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Check if brand has permission to manage profile
 * 
 * @param {string} userRole - User role
 * @param {string} userId - Brand user ID
 * @returns {Promise<boolean>} Whether brand can manage profile
 */
export async function canManageBrandProfile(userRole, userId) {
  // First check base permission
  if (!hasPermission(userRole, Permission.BRAND_PROFILE_MANAGE)) {
    return false;
  }

  // Brand can always manage their own profile (even if not approved)
  // Approval status only affects visibility/functionality, not management
  return true;
}

/**
 * Check if brand has permission to create events
 * 
 * @param {string} userRole - User role
 * @param {string} userId - Brand user ID
 * @returns {Promise<boolean>} Whether brand can create events
 */
export async function canCreateEvent(userRole, userId) {
  // First check base permission
  if (!hasPermission(userRole, Permission.BRAND_EVENT_CREATE)) {
    return false;
  }

  // Brand must have an approved profile to create events
  const isApproved = await isBrandProfileApproved(userId);
  return isApproved;
}

/**
 * Check if brand has permission to manage a specific event
 * 
 * @param {string} userRole - User role
 * @param {string} userId - Brand user ID
 * @param {string} eventId - Event ID
 * @returns {Promise<boolean>} Whether brand can manage this event
 */
export async function canManageEvent(userRole, userId, eventId) {
  // First check base permission
  if (!hasPermission(userRole, Permission.BRAND_EVENT_MANAGE)) {
    return false;
  }

  // Get brand profile ID
  const brandId = await getBrandProfileId(userId);
  if (!brandId) {
    return false;
  }

  // Check if event belongs to this brand
  const result = await query(
    `SELECT id FROM events WHERE id = $1 AND brand_id = $2 LIMIT 1`,
    [eventId, brandId]
  );

  return result.rows.length > 0;
}

/**
 * Check if brand has permission to create certificates
 * 
 * @param {string} userRole - User role
 * @param {string} userId - Brand user ID
 * @returns {Promise<boolean>} Whether brand can create certificates
 */
export async function canCreateCertificate(userRole, userId) {
  // First check base permission
  if (!hasPermission(userRole, Permission.BRAND_CERTIFICATE_CREATE)) {
    return false;
  }

  // Brand must have an approved profile to create certificates
  const isApproved = await isBrandProfileApproved(userId);
  return isApproved;
}

/**
 * Check if brand has permission to issue certificates
 * 
 * @param {string} userRole - User role
 * @param {string} userId - Brand user ID
 * @param {string} certificateId - Certificate template ID
 * @returns {Promise<boolean>} Whether brand can issue this certificate
 */
export async function canIssueCertificate(userRole, userId, certificateId) {
  // First check base permission
  if (!hasPermission(userRole, Permission.BRAND_CERTIFICATE_ISSUE)) {
    return false;
  }

  // Get brand profile ID
  const brandId = await getBrandProfileId(userId);
  if (!brandId) {
    return false;
  }

  // Check if certificate belongs to this brand
  const result = await query(
    `SELECT id FROM brand_certificates WHERE id = $1 AND brand_id = $2 LIMIT 1`,
    [certificateId, brandId]
  );

  return result.rows.length > 0;
}

/**
 * Verify brand owns a certificate template
 * 
 * @param {string} userId - Brand user ID
 * @param {string} certificateId - Certificate template ID
 * @returns {Promise<boolean>} Whether brand owns this certificate
 */
export async function verifyBrandOwnsCertificate(userId, certificateId) {
  const brandId = await getBrandProfileId(userId);
  if (!brandId) {
    return false;
  }

  const result = await query(
    `SELECT id FROM brand_certificates WHERE id = $1 AND brand_id = $2 LIMIT 1`,
    [certificateId, brandId]
  );

  return result.rows.length > 0;
}

/**
 * Verify brand owns an event
 * 
 * @param {string} userId - Brand user ID
 * @param {string} eventId - Event ID
 * @returns {Promise<boolean>} Whether brand owns this event
 */
export async function verifyBrandOwnsEvent(userId, eventId) {
  const brandId = await getBrandProfileId(userId);
  if (!brandId) {
    return false;
  }

  const result = await query(
    `SELECT id FROM events WHERE id = $1 AND brand_id = $2 LIMIT 1`,
    [eventId, brandId]
  );

  return result.rows.length > 0;
}

export default {
  isBrandProfileApproved,
  canManageBrandProfile,
  canCreateEvent,
  canManageEvent,
  canCreateCertificate,
  canIssueCertificate,
  verifyBrandOwnsCertificate,
  verifyBrandOwnsEvent,
};
