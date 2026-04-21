/**
 * Course Query Builders
 * 
 * Utilities for building query parameters for role-based course fetching.
 * Handles different query parameter structures for superadmin, admin, and instructor roles.
 */

import { getCoursePermissions } from './permissions.js';

/**
 * Build query parameters for superadmin role
 * 
 * Superadmin should see:
 * - Only courses created by superadmin
 * - Global courses (no organization assigned)
 * - Courses created by superadmin with specific organizations
 * 
 * @param {Object} filters - Filter parameters
 * @param {Object} user - Current user object
 * @returns {Object} Query parameters for API
 */
/**
 * Build query parameters for superadmin role - Courses List (Public/All Courses)
 * 
 * Superadmin should see ALL courses created for ALL organizations.
 * 
 * @param {Object} filters - Filter parameters
 * @param {Object} user - Current user object
 * @returns {Object} Query parameters for API
 */
export const buildSuperadminListQueryParams = (filters, user) => {
  const baseParams = {
    role: 'superadmin',
    // Fetch all courses across all organizations
    includeAllOrganizations: true,
    includeGlobal: true,
  };

  // Add pagination
  if (filters.page) baseParams.page = filters.page;
  if (filters.limit) baseParams.limit = filters.limit;

  // Add search
  if (filters.search) baseParams.search = filters.search;

  // Add organization filter (only for superadmin)
  if (filters.organizationId) {
    baseParams.organizationId = filters.organizationId;
    baseParams.includeAllOrganizations = false;
  }

  // Add category filters
  if (filters.categoryIds && Array.isArray(filters.categoryIds) && filters.categoryIds.length > 0) {
    baseParams.categoryIds = filters.categoryIds.join(',');
  }

  // Add course type filter
  if (filters.courseTypeId) baseParams.courseTypeId = filters.courseTypeId;

  // Add other filters
  if (filters.tag) baseParams.tag = filters.tag;
  if (filters.level) baseParams.level = filters.level;
  if (filters.sortBy) baseParams.sortBy = filters.sortBy;

  return baseParams;
};

export const buildSuperadminQueryParams = (filters, user) => {
  // Superadmin can see all courses for management purposes
  // Only filter by createdBy if explicitly requested
  const baseParams = {
    role: 'superadmin',
    // Don't set createdBy by default - let superadmin see all courses
    // createdBy: 'superadmin', // Only set if filtering by superadmin-created courses
    includeGlobal: true, // Include global courses
    includeOrgSpecific: true, // Include org-specific courses
  };

  // Add pagination
  if (filters.page) baseParams.page = filters.page;
  if (filters.limit) baseParams.limit = filters.limit;

  // Add search
  if (filters.search) baseParams.search = filters.search;

  // Add filters
  if (filters.instructorId) baseParams.instructorId = filters.instructorId;
  if (filters.level) baseParams.level = filters.level;
  if (filters.organizationId) baseParams.organizationId = filters.organizationId;
  if (filters.classId) baseParams.classId = filters.classId;
  if (filters.subjectId) baseParams.subjectId = filters.subjectId;
  if (filters.status) baseParams.status = filters.status;
  if (filters.sortBy) baseParams.sortBy = filters.sortBy;
  if (filters.dateFrom) baseParams.dateFrom = filters.dateFrom;
  if (filters.dateTo) baseParams.dateTo = filters.dateTo;

  return baseParams;
};

/**
 * Build query parameters for admin role - Courses List
 * 
 * Admin should see:
 * - All courses of admin's own organization
 * - Courses created by superadmin (for admin's org)
 * - Courses created by admin (for admin's org)
 * - NO organization filter (only sees their org)
 * - NO other organizations' courses
 * 
 * @param {Object} filters - Filter parameters
 * @param {Object} user - Current user object
 * @returns {Object} Query parameters for API
 */
export const buildAdminListQueryParams = (filters, user) => {
  const baseParams = {
    role: 'admin',
    includeAllRoles: true, // Include superadmin, admin, instructor courses
  };

  // Only add organizationId if user has one
  if (user?.orgId) {
    baseParams.organizationId = user.orgId;
    baseParams.excludeGlobal = true; // Exclude global courses not assigned to org
  }

  // Add pagination
  if (filters.page) baseParams.page = filters.page;
  if (filters.limit) baseParams.limit = filters.limit;

  // Add search
  if (filters.search) baseParams.search = filters.search;

  // Add category filters
  if (filters.categoryIds && Array.isArray(filters.categoryIds) && filters.categoryIds.length > 0) {
    baseParams.categoryIds = filters.categoryIds.join(',');
  }

  // Add course type filter
  if (filters.courseTypeId) baseParams.courseTypeId = filters.courseTypeId;

  // Add other filters (NO organization filter for admin)
  if (filters.tag) baseParams.tag = filters.tag;
  if (filters.level) baseParams.level = filters.level;
  if (filters.sortBy) baseParams.sortBy = filters.sortBy;

  return baseParams;
};

/**
 * Build query parameters for admin role
 * 
 * Admin should see:
 * - All courses of admin's own organization
 * - Courses created by superadmin (of admin's org)
 * - Courses created by admin (of admin's org)
 * - Courses created by instructor (of admin's org)
 * 
 * @param {Object} filters - Filter parameters
 * @param {Object} user - Current user object
 * @returns {Object} Query parameters for API
 */
export const buildAdminQueryParams = (filters, user) => {
  // Admin can have null orgId (for global admins) or a specific orgId
  // If orgId is null, they should see global courses they created
  // If orgId exists, they should see courses of their organization
  
  const baseParams = {
    role: 'admin',
    includeAllRoles: true, // Include superadmin, admin, instructor courses
  };

  // Only add organizationId if user has one
  if (user?.orgId) {
    baseParams.organizationId = user.orgId;
    baseParams.excludeGlobal = true; // Exclude global courses not assigned to org
  } else {
    // Admin with no orgId can see global courses they created
    baseParams.includeGlobal = true;
    baseParams.createdBy = user?.id; // Only courses created by this admin
  }

  // Add pagination
  if (filters.page) baseParams.page = filters.page;
  if (filters.limit) baseParams.limit = filters.limit;

  // Add search
  if (filters.search) baseParams.search = filters.search;

  // Add filters
  if (filters.instructorId) baseParams.instructorId = filters.instructorId;
  if (filters.level) baseParams.level = filters.level;
  if (filters.classId) baseParams.classId = filters.classId;
  if (filters.subjectId) baseParams.subjectId = filters.subjectId;
  if (filters.status) baseParams.status = filters.status;
  if (filters.sortBy) baseParams.sortBy = filters.sortBy;
  if (filters.dateFrom) baseParams.dateFrom = filters.dateFrom;
  if (filters.dateTo) baseParams.dateTo = filters.dateTo;

  return baseParams;
};

/**
 * Build query parameters for instructor role - Courses List
 * 
 * Instructor should see:
 * - Courses matching instructor's assigned classes
 * - Courses matching instructor's assigned subjects
 * - Courses matching instructor's streams/academic paths
 * - Courses from all roles (superadmin, admin, instructor) that match
 * - NO other organizations' courses
 * - NO global courses not matching classes/subjects
 * 
 * @param {Object} filters - Filter parameters
 * @param {Object} user - Current user object
 * @returns {Object} Query parameters for API
 */
export const buildInstructorListQueryParams = (filters, user) => {
  if (!user?.orgId) {
    // Hydration race: user.role is set but orgId not yet populated — return safe defaults
    // instead of throwing so the query layer never crashes during initial render.
    return {
      page: filters?.page || 1,
      limit: filters?.limit || 12,
      ...(filters?.search && { search: filters.search }),
    };
  }

  const baseParams = {
    role: 'instructor',
    organizationId: user.orgId,
    includeAllRoles: true, // Include superadmin, admin, instructor courses
  };

  // Add class IDs if available (from user or filters)
  if (user.classIds && Array.isArray(user.classIds) && user.classIds.length > 0) {
    baseParams.classIds = user.classIds.join(',');
  } else if (filters.classIds && Array.isArray(filters.classIds) && filters.classIds.length > 0) {
    baseParams.classIds = filters.classIds.join(',');
  }

  // Add subject IDs if available (from user or filters)
  if (user.subjectIds && Array.isArray(user.subjectIds) && user.subjectIds.length > 0) {
    baseParams.subjectIds = user.subjectIds.join(',');
  } else if (filters.subjectIds && Array.isArray(filters.subjectIds) && filters.subjectIds.length > 0) {
    baseParams.subjectIds = filters.subjectIds.join(',');
  }

  // Add pagination
  if (filters.page) baseParams.page = filters.page;
  if (filters.limit) baseParams.limit = filters.limit;

  // Add search
  if (filters.search) baseParams.search = filters.search;

  // Add category filters
  if (filters.categoryIds && Array.isArray(filters.categoryIds) && filters.categoryIds.length > 0) {
    baseParams.categoryIds = filters.categoryIds.join(',');
  }

  // Add course type filter
  if (filters.courseTypeId) baseParams.courseTypeId = filters.courseTypeId;

  // Add other filters
  if (filters.tag) baseParams.tag = filters.tag;
  if (filters.level) baseParams.level = filters.level;
  if (filters.sortBy) baseParams.sortBy = filters.sortBy;

  return baseParams;
};

/**
 * Build query parameters for instructor role
 * 
 * Instructor should see:
 * - Courses of instructor's organization
 * - Filtered by instructor's assigned classes
 * - Filtered by instructor's assigned subjects
 * - Courses from all roles (matching org, class, subject)
 * 
 * @param {Object} filters - Filter parameters
 * @param {Object} user - Current user object
 * @returns {Object} Query parameters for API
 */
export const buildInstructorQueryParams = (filters, user) => {
  if (!user?.orgId) {
    // Hydration race: user.role is set but orgId not yet populated — return safe defaults
    // instead of throwing so the query layer never crashes during initial render.
    return {
      page: filters?.page || 1,
      limit: filters?.limit || 10,
      ...(filters?.search && { search: filters.search }),
    };
  }

  const baseParams = {
    role: 'instructor',
    organizationId: user.orgId,
    includeAllRoles: true, // Include superadmin, admin, instructor courses
  };

  // Add class IDs if available
  if (user.classIds && Array.isArray(user.classIds) && user.classIds.length > 0) {
    baseParams.classIds = user.classIds;
  } else if (filters.classIds && Array.isArray(filters.classIds) && filters.classIds.length > 0) {
    baseParams.classIds = filters.classIds;
  }

  // Add subject IDs if available
  if (user.subjectIds && Array.isArray(user.subjectIds) && user.subjectIds.length > 0) {
    baseParams.subjectIds = user.subjectIds;
  } else if (filters.subjectIds && Array.isArray(filters.subjectIds) && filters.subjectIds.length > 0) {
    baseParams.subjectIds = filters.subjectIds;
  }

  // Add pagination
  if (filters.page) baseParams.page = filters.page;
  if (filters.limit) baseParams.limit = filters.limit;

  // Add search
  if (filters.search) baseParams.search = filters.search;

  // Add filters
  if (filters.instructorId) baseParams.instructorId = filters.instructorId;
  if (filters.level) baseParams.level = filters.level;
  if (filters.classId) baseParams.classId = filters.classId;
  if (filters.subjectId) baseParams.subjectId = filters.subjectId;
  if (filters.status) baseParams.status = filters.status;
  if (filters.sortBy) baseParams.sortBy = filters.sortBy;
  if (filters.dateFrom) baseParams.dateFrom = filters.dateFrom;
  if (filters.dateTo) baseParams.dateTo = filters.dateTo;

  return baseParams;
};

/**
 * Build query parameters for vendor role - Courses List
 * 
 * Vendor should see:
 * - Only public courses (org_id = null)
 * - Both superadmin and vendor created courses
 * - NO organization-specific courses
 * 
 * @param {Object} filters - Filter parameters
 * @param {Object} user - Current user object
 * @returns {Object} Query parameters for API
 */
export const buildVendorListQueryParams = (filters, user) => {
  const baseParams = {
    role: 'vendor',
    // No organizationId - vendors only see public courses
  };

  // Add pagination
  if (filters.page) baseParams.page = filters.page;
  if (filters.limit) baseParams.limit = filters.limit;

  // Add search
  if (filters.search) baseParams.search = filters.search;

  // Add category filters
  if (filters.categoryIds && Array.isArray(filters.categoryIds) && filters.categoryIds.length > 0) {
    baseParams.categoryIds = filters.categoryIds.join(',');
  }

  // Add course type filter
  if (filters.courseTypeId) baseParams.courseTypeId = filters.courseTypeId;

  // Add other filters
  if (filters.tag) baseParams.tag = filters.tag;
  if (filters.level) baseParams.level = filters.level;
  if (filters.sortBy) baseParams.sortBy = filters.sortBy;

  return baseParams;
};

/**
 * Build query parameters for vendor role
 * 
 * Vendor should see:
 * - Only public courses (org_id = null)
 * - Both superadmin and vendor created courses
 * - NO organization-specific courses
 * 
 * @param {Object} filters - Filter parameters
 * @param {Object} user - Current user object
 * @returns {Object} Query parameters for API
 */
export const buildVendorQueryParams = (filters, user) => {
  const baseParams = {
    role: 'vendor',
    // No organizationId - vendors only see public courses
  };

  // Add pagination
  if (filters.page) baseParams.page = filters.page;
  if (filters.limit) baseParams.limit = filters.limit;

  // Add search
  if (filters.search) baseParams.search = filters.search;

  // Add filters
  if (filters.instructorId) baseParams.instructorId = filters.instructorId;
  if (filters.level) baseParams.level = filters.level;
  if (filters.classId) baseParams.classId = filters.classId;
  if (filters.subjectId) baseParams.subjectId = filters.subjectId;
  if (filters.status) baseParams.status = filters.status;
  if (filters.sortBy) baseParams.sortBy = filters.sortBy;
  if (filters.dateFrom) baseParams.dateFrom = filters.dateFrom;
  if (filters.dateTo) baseParams.dateTo = filters.dateTo;

  return baseParams;
};

/**
 * Build query parameters for courses LIST page based on user role
 * 
 * This is different from buildRoleBasedQueryParams which is for management page.
 * List page has different requirements (public-facing, different filters).
 * 
 * @param {Object} filters - Filter parameters
 * @param {Object} user - Current user object
 * @returns {Object} Query parameters for API
 */
export const buildRoleBasedListQueryParams = (filters, user) => {
  if (!user || !user.role) {
    console.warn("User or user role is not defined for building list query parameters.");
    // Return basic params as fallback
    return {
      page: filters?.page || 1,
      limit: filters?.limit || 12,
      ...(filters?.search && { search: filters.search }),
    };
  }

  switch (user.role) {
    case 'superadmin':
      return buildSuperadminListQueryParams(filters, user);
    case 'admin':
      return buildAdminListQueryParams(filters, user);
    case 'instructor':
      return buildInstructorListQueryParams(filters, user);
    case 'vendor':
      return buildVendorListQueryParams(filters, user);
    default:
      console.warn(`Unknown role: ${user.role}. Building generic list query parameters.`);
      // Return basic params as fallback
      return {
        page: filters?.page || 1,
        limit: filters?.limit || 12,
        ...(filters?.search && { search: filters.search }),
      };
  }
};

/**
 * Build query parameters based on user role
 * 
 * @param {Object} filters - Filter parameters
 * @param {Object} user - Current user object
 * @returns {Object} Query parameters for API
 */
export const buildRoleBasedQueryParams = (filters, user) => {
  if (!user || !user.role) {
    console.warn("User or user role is not defined for building query parameters.");
    // Return basic params as fallback
    return {
      page: filters?.page || 1,
      limit: filters?.limit || 10,
      ...(filters?.search && { search: filters.search }),
    };
  }

  switch (user.role) {
    case 'superadmin':
      return buildSuperadminQueryParams(filters, user);
    case 'admin':
      return buildAdminQueryParams(filters, user);
    case 'instructor':
      return buildInstructorQueryParams(filters, user);
    case 'vendor':
      return buildVendorQueryParams(filters, user);
    default:
      console.warn(`Unknown role: ${user.role}. Building generic query parameters.`);
      // Return basic params as fallback
      return {
        page: filters?.page || 1,
        limit: filters?.limit || 10,
        ...(filters?.search && { search: filters.search }),
      };
  }
};

/**
 * Transform API response to include permission flags
 * 
 * @param {Object} response - API response
 * @param {Object} user - Current user object
 * @returns {Object} Transformed response with permissions
 */
export const transformCourseResponse = (response, user) => {
  if (!response || !response.courses) {
    return response;
  }

  // Add permission flags to each course
  const transformedCourses = response.courses.map((course) => {
    const permissions = getCoursePermissions(course, user);
    return {
      ...course,
      canEdit: permissions.canEdit,
      canDelete: permissions.canDelete,
      canChangeStatus: permissions.canChangeStatus,
      canPin: permissions.canPin,
    };
  });

  return {
    ...response,
    courses: transformedCourses,
  };
};

