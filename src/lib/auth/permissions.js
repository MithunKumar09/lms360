/**
 * Permissions System
 * 
 * Permission definitions and role-based permission checking.
 * Provides a permission matrix for future use.
 */

/**
 * Permission Types
 */
export const Permission = {
  // User management
  USER_VIEW: 'user:view',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_MANAGE: 'user:manage',

  // Organization management
  ORG_VIEW: 'org:view',
  ORG_CREATE: 'org:create',
  ORG_UPDATE: 'org:update',
  ORG_DELETE: 'org:delete',
  ORG_MANAGE: 'org:manage',

  // Course management
  COURSE_VIEW: 'course:view',
  COURSE_CREATE: 'course:create',
  COURSE_UPDATE: 'course:update',
  COURSE_DELETE: 'course:delete',
  COURSE_MANAGE: 'course:manage',

  // Content management
  CONTENT_VIEW: 'content:view',
  CONTENT_CREATE: 'content:create',
  CONTENT_UPDATE: 'content:update',
  CONTENT_DELETE: 'content:delete',
  CONTENT_MANAGE: 'content:manage',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_MANAGE: 'settings:manage',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
  REPORTS_MANAGE: 'reports:manage',

  // Analytics
  ANALYTICS_VIEW: 'analytics:view',
  ANALYTICS_MANAGE: 'analytics:manage',

  // Parent-specific permissions
  PARENT_STUDENT_PROGRESS_VIEW: 'parent:student:progress:view',
  PARENT_ATTENDANCE_VIEW: 'parent:attendance:view',
  PARENT_ACHIEVEMENTS_VIEW: 'parent:achievements:view',
  PARENT_ACTIVITY_LOG_VIEW: 'parent:activity:log:view',

  // Brand-specific permissions
  BRAND_PROFILE_MANAGE: 'brand:profile:manage',
  BRAND_EVENT_CREATE: 'brand:event:create',
  BRAND_EVENT_MANAGE: 'brand:event:manage',
  BRAND_CERTIFICATE_CREATE: 'brand:certificate:create',
  BRAND_CERTIFICATE_ISSUE: 'brand:certificate:issue',
};

/**
 * Permission Matrix
 * Defines which roles have which permissions
 */
export const permissionMatrix = {
  superadmin: [
    // Superadmin has all permissions
    ...Object.values(Permission),
  ],
  admin: [
    Permission.USER_VIEW,
    Permission.USER_CREATE,
    Permission.USER_UPDATE,
    Permission.ORG_VIEW,
    Permission.ORG_UPDATE,
    Permission.COURSE_VIEW,
    Permission.COURSE_CREATE,
    Permission.COURSE_UPDATE,
    Permission.COURSE_DELETE,
    Permission.COURSE_MANAGE,
    Permission.CONTENT_VIEW,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_UPDATE,
    Permission.CONTENT_DELETE,
    Permission.CONTENT_MANAGE,
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_UPDATE,
    Permission.REPORTS_VIEW,
    Permission.REPORTS_EXPORT,
    Permission.ANALYTICS_VIEW,
  ],
  vendor: [
    // Vendor follows admin dashboard with likely reduced scope; start with view/manage basics
    Permission.USER_VIEW,
    Permission.ORG_VIEW,
    Permission.COURSE_VIEW,
    Permission.COURSE_CREATE,
    Permission.COURSE_UPDATE,
    Permission.CONTENT_VIEW,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_UPDATE,
    Permission.REPORTS_VIEW,
    Permission.ANALYTICS_VIEW,
  ],
  instructor: [
    Permission.COURSE_VIEW,
    Permission.COURSE_UPDATE,
    Permission.CONTENT_VIEW,
    Permission.CONTENT_CREATE,
    Permission.CONTENT_UPDATE,
    Permission.REPORTS_VIEW,
    Permission.ANALYTICS_VIEW,
  ],
  student: [
    Permission.COURSE_VIEW,
    Permission.CONTENT_VIEW,
  ],
  alumni: [
    // Alumni follows student dashboard
    Permission.COURSE_VIEW,
    Permission.CONTENT_VIEW,
  ],
  parent: [
    // Parent follows student dashboard
    Permission.COURSE_VIEW,
    Permission.CONTENT_VIEW,
    // Parent-specific permissions (subject to parent_access_settings and parent_student_links checks)
    Permission.PARENT_STUDENT_PROGRESS_VIEW,
    Permission.PARENT_ATTENDANCE_VIEW,
    Permission.PARENT_ACHIEVEMENTS_VIEW,
    Permission.PARENT_ACTIVITY_LOG_VIEW,
  ],
  brand: [
    // Brand-specific permissions
    Permission.BRAND_PROFILE_MANAGE,
    Permission.BRAND_EVENT_CREATE,
    Permission.BRAND_EVENT_MANAGE,
    Permission.BRAND_CERTIFICATE_CREATE,
    Permission.BRAND_CERTIFICATE_ISSUE,
  ],
};

/**
 * Check if role has permission
 * 
 * @param {string} role - User role
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether role has permission
 */
export function hasPermission(role, permission) {
  if (!role || !permission) {
    return false;
  }

  const rolePermissions = permissionMatrix[role] || [];
  
  // Superadmin has all permissions
  if (role === 'superadmin') {
    return true;
  }

  return rolePermissions.includes(permission);
}

/**
 * Check if user has permission
 * 
 * @param {Object} user - User object with role
 * @param {string} permission - Permission to check
 * @returns {boolean} Whether user has permission
 */
export function userHasPermission(user, permission) {
  if (!user || !user.role) {
    return false;
  }

  return hasPermission(user.role, permission);
}

/**
 * Get all permissions for a role
 * 
 * @param {string} role - User role
 * @returns {string[]} Array of permissions
 */
export function getRolePermissions(role) {
  if (!role) {
    return [];
  }

  return permissionMatrix[role] || [];
}

/**
 * Check if user has any of the specified permissions
 * 
 * @param {Object} user - User object with role
 * @param {string[]} permissions - Permissions to check
 * @returns {boolean} Whether user has any of the permissions
 */
export function userHasAnyPermission(user, permissions) {
  if (!user || !user.role || !Array.isArray(permissions)) {
    return false;
  }

  return permissions.some(permission => userHasPermission(user, permission));
}

/**
 * Check if user has all of the specified permissions
 * 
 * @param {Object} user - User object with role
 * @param {string[]} permissions - Permissions to check
 * @returns {boolean} Whether user has all of the permissions
 */
export function userHasAllPermissions(user, permissions) {
  if (!user || !user.role || !Array.isArray(permissions)) {
    return false;
  }

  return permissions.every(permission => userHasPermission(user, permission));
}

export default {
  Permission,
  permissionMatrix,
  hasPermission,
  userHasPermission,
  getRolePermissions,
  userHasAnyPermission,
  userHasAllPermissions,
};


