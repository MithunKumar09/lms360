/**
 * Role Definitions and Utilities
 * 
 * Centralized role definitions and helper functions for authentication and authorization.
 * This module serves as the single source of truth for role-related logic.
 * 
 * Based on: doc/LMS_Authentication_Documentation.md
 */

/**
 * Supported User Roles
 * @constant {Object}
 */
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student',
  PARENT: 'parent',
  VENDOR: 'vendor',
  MENTOR: 'mentor',
  BRAND: 'brand',
  COMPANY: 'company',
};

/**
 * All role values as array
 * @constant {string[]}
 */
export const ALL_ROLES = Object.values(ROLES);

/**
 * MFA Requirements by Role
 * Based on documentation:
 * - Superadmin → MFA Required (TOTP mandatory)
 * - Admin → MFA Required (Email OTP or TOTP)
 * - Instructor → MFA Optional
 * - Vendor → MFA Optional
 * - Student → MFA Optional
 * - Parent → MFA Optional
 * - Alumni → MFA Optional
 */
export const MFA_REQUIRED_ROLES = [
  ROLES.SUPERADMIN,
  ROLES.ADMIN,
];

/**
 * MFA Optional Roles
 */
export const MFA_OPTIONAL_ROLES = [
  ROLES.INSTRUCTOR,
  ROLES.VENDOR,
  ROLES.STUDENT,
  ROLES.PARENT,
  ROLES.MENTOR,
  ROLES.BRAND,
  ROLES.COMPANY,
];

/**
 * Check if role requires MFA
 * @param {string} role - User role
 * @returns {boolean} Whether role requires MFA
 */
export function requiresMfa(role) {
  return MFA_REQUIRED_ROLES.includes(role);
}

/**
 * Check if role has optional MFA
 * @param {string} role - User role
 * @returns {boolean} Whether role has optional MFA
 */
export function hasOptionalMfa(role) {
  return MFA_OPTIONAL_ROLES.includes(role);
}

/**
 * Get dashboard path for role
 * @param {string} role - User role (canonical or legacy alias)
 * @returns {string} Dashboard path
 */
export function getDashboardPath(role) {
  const normalizedRole = normalizeRole(role);
  const dashboardMap = {
    [ROLES.SUPERADMIN]: '/dashboards/superadmin-dashboard',
    [ROLES.ADMIN]: '/dashboards/admin-dashboard',
    [ROLES.INSTRUCTOR]: '/dashboards/instructor-dashboard',
    [ROLES.STUDENT]: '/dashboards/student-dashboard',
    [ROLES.PARENT]: '/dashboards/parent-dashboard',
    [ROLES.VENDOR]: '/dashboards/vendor-dashboard',
    [ROLES.MENTOR]: '/dashboards/mentor-dashboard',
    [ROLES.BRAND]: '/dashboards/brand-dashboard',
    [ROLES.COMPANY]: '/dashboards/company-dashboard',
  };

  return dashboardMap[normalizedRole] || '/dashboards/student-dashboard';
}

/**
 * Get required role for a dashboard path
 * @param {string} pathname - Route pathname
 * @returns {string|null} Required role or null
 */
export function getRequiredRoleForPath(pathname) {
  if (pathname.startsWith('/dashboards/superadmin-')) {
    return ROLES.SUPERADMIN;
  }
  if (pathname.startsWith('/dashboards/admin-')) {
    return ROLES.ADMIN;
  }
  if (pathname.startsWith('/dashboards/vendor-')) {
    return ROLES.VENDOR;
  }
  if (pathname.startsWith('/dashboards/instructor-')) {
    return ROLES.INSTRUCTOR;
  }
  if (pathname.startsWith('/dashboards/student-')) {
    return ROLES.STUDENT;
  }
  if (pathname.startsWith('/dashboards/mentor-')) {
    return ROLES.MENTOR;
  }
  if (pathname.startsWith('/dashboards/parent-')) {
    return ROLES.PARENT;
  }
  if (pathname.startsWith('/dashboards/brand-')) {
    return ROLES.BRAND;
  }
  if (pathname.startsWith('/dashboards/company-')) {
    return ROLES.COMPANY;
  }
  // Organization finance page - accessible to admin and superadmin
  if (pathname.startsWith('/dashboards/organization-finance')) {
    return ROLES.ADMIN; // Can be accessed by admin or superadmin
  }
  // Announcements page - accessible to admin and superadmin
  if (pathname.startsWith('/dashboards/announcements')) {
    return ROLES.ADMIN; // Can be accessed by admin or superadmin
  }
  return null;
}

/**
 * Check if user role can access a required role
 * Based on documentation:
 * - Superadmin → Global access (organization_id = null), can ONLY access superadmin routes
 * - Admin → Access to own organization only
 * - Instructor → Access to own organization, specific classes & subjects
 * - Student → Access to own organization + assigned instructors, classes, subjects
 * - Parent → Access to own organization + child-linked instructors, classes, subjects
 * - Vendor → Access to own organization only
 * - Mentor → Access to own organization + assigned instructors, classes, subjects
 * - Brand → Global access (organization_id = null), can ONLY access brand routes
 * 
 * @param {string} userRole - User's role
 * @param {string} requiredRole - Required role for route
 * @param {string} pathname - Optional pathname for route-specific logic
 * @returns {boolean} Whether user can access
 */
export function canAccessRole(userRole, requiredRole, pathname = null) {
  // Normalize roles to handle orgadmin -> admin mapping
  const normalizedUserRole = normalizeRole(userRole);
  const normalizedRequiredRole = normalizeRole(requiredRole);
  
  // Superadmin can access superadmin routes and shared routes like announcements and organization-finance
  if (normalizedUserRole === ROLES.SUPERADMIN) {
    // Allow access to superadmin routes
    if (normalizedRequiredRole === ROLES.SUPERADMIN) {
      return true;
    }
    // Allow access to shared routes (announcements and organization-finance) between superadmin and admin
    if (pathname && (
      pathname.startsWith('/dashboards/announcements') ||
      pathname.startsWith('/dashboards/organization-finance')
    )) {
      return normalizedRequiredRole === ROLES.ADMIN;
    }
    // Strict isolation for other routes
    return false;
  }

  // Brand can ONLY access brand routes (global access, no org context)
  if (normalizedUserRole === ROLES.BRAND) {
    return normalizedRequiredRole === ROLES.BRAND;
  }

  // Company can ONLY access company routes (organization-scoped, like vendor)
  if (normalizedUserRole === ROLES.COMPANY) {
    return normalizedRequiredRole === ROLES.COMPANY;
  }

  // Parent can access parent routes (requires org context - validated in middleware)
  if (normalizedUserRole === ROLES.PARENT) {
    return normalizedRequiredRole === ROLES.PARENT;
  }

  // Each role can only access their own dashboard
  return normalizedUserRole === normalizedRequiredRole;
}

/**
 * Check if role is valid
 * @param {string} role - Role to check
 * @returns {boolean} Whether role is valid
 */
export function isValidRole(role) {
  return ALL_ROLES.includes(role);
}

/**
 * Normalize role name (handles database inconsistencies)
 * Maps any role variations to standard role names
 * @param {string} role - Role from database
 * @returns {string} Normalized role
 */
export function normalizeRole(role) {
  if (!role) return ROLES.STUDENT; // Default to student

  const normalized = role.toLowerCase().trim();

  // Handle any variations
  const roleMap = {
    'superadmin': ROLES.SUPERADMIN,
    'admin': ROLES.ADMIN,
    'orgadmin': ROLES.ADMIN, // Legacy mapping
    'instructor': ROLES.INSTRUCTOR,
    'orginstructor': ROLES.INSTRUCTOR, // Legacy mapping
    'student': ROLES.STUDENT,
    'orgstudent': ROLES.STUDENT, // Legacy mapping
    'parent': ROLES.PARENT,
    'vendor': ROLES.VENDOR,
    'mentor': ROLES.MENTOR,
    'brand': ROLES.BRAND,
    'company': ROLES.COMPANY,
    'alumni': ROLES.MENTOR, // Legacy mapping - alumni maps to mentor
  };

  return roleMap[normalized] || normalized;
}

/**
 * Get role display name
 * @param {string} role - User role
 * @returns {string} Display name
 */
export function getRoleDisplayName(role) {
  const displayNames = {
    [ROLES.SUPERADMIN]: 'Super Admin',
    [ROLES.ADMIN]: 'Admin',
    [ROLES.INSTRUCTOR]: 'Instructor',
    [ROLES.STUDENT]: 'Student',
    [ROLES.PARENT]: 'Parent',
    [ROLES.VENDOR]: 'Vendor',
    [ROLES.MENTOR]: 'Mentor',
    [ROLES.BRAND]: 'Brand',
    [ROLES.COMPANY]: 'Company',
  };

  return displayNames[role] || role;
}

export default {
  ROLES,
  ALL_ROLES,
  MFA_REQUIRED_ROLES,
  MFA_OPTIONAL_ROLES,
  requiresMfa,
  hasOptionalMfa,
  getDashboardPath,
  getRequiredRoleForPath,
  canAccessRole,
  isValidRole,
  normalizeRole,
  getRoleDisplayName,
};

