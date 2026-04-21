/**
 * Access Control Helper for Course Settings
 * 
 * Checks if admin user has read/write access to course settings features
 * 
 * @module api/course-settings/accessControl
 */

import { checkAccess } from '@/lib/db/course-settings/accessControl.js';
import { normalizeRole } from '@/lib/auth/roles.js';

/**
 * Feature name mapping
 */
export const FEATURE_NAMES = {
  categories: 'categories',
  subcategories: 'subcategories',
  types: 'types',
  program_types: 'program_types',
  levels: 'levels',
  skills: 'skills',
  testimonials: 'testimonials',
};

/**
 * Check if user has access to a feature
 * @param {string} userRole - User role (superadmin or admin)
 * @param {string} featureName - Feature name (from FEATURE_NAMES)
 * @param {string} action - Action type ('read' or 'write')
 * @returns {Promise<boolean>} True if access is allowed
 */
export async function hasFeatureAccess(userRole, featureName, action) {
  // Normalize role to handle orgadmin -> admin mapping
  const normalizedRole = normalizeRole(userRole);
  
  // Superadmin always has access
  if (normalizedRole === 'superadmin') {
    return true;
  }

  // Admin (including orgadmin) access control
  if (normalizedRole === 'admin') {
    // For READ operations: Always allow orgadmin to read superadmin-created data
    // This allows them to view categories, subcategories, etc. created by superadmin
    if (action === 'read') {
      return true; // Always allow read access for orgadmin
    }
    
    // For WRITE operations: Check access control settings
    if (action === 'write') {
      try {
        const hasAccess = await checkAccess('admin', featureName, action);
        // Log for debugging (can be removed in production)
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Access Control] Admin write access for ${featureName}: ${hasAccess}`);
        }
        return hasAccess;
      } catch (error) {
        console.error('Error checking access control:', error);
        // Default: no access if check fails
        return false;
      }
    }
  }

  // Other roles: no access
  return false;
}

/**
 * Require feature access (throws if no access)
 * @param {string} userRole - User role
 * @param {string} featureName - Feature name
 * @param {string} action - Action type ('read' or 'write')
 * @throws {Error} If access is denied
 */
export async function requireFeatureAccess(userRole, featureName, action) {
  const hasAccess = await hasFeatureAccess(userRole, featureName, action);
  
  if (!hasAccess) {
    const error = new Error(
      `Access denied. You don't have ${action} permission for ${featureName}.`
    );
    error.status = 403;
    error.code = 'ACCESS_DENIED';
    throw error;
  }
}

