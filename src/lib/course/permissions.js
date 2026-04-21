/**
 * Course Permissions
 * 
 * Permission checking utilities for course management actions.
 * Implements role-based access control for course operations.
 */

/**
 * Check if user can edit a course
 * 
 * @param {Object} course - Course object with createdBy information
 * @param {Object} user - Current user object
 * @returns {boolean} True if user can edit the course
 */
export const canEditCourse = (course, user) => {
  if (!course || !user) return false;

  // Superadmin can edit all courses
  if (user.role === 'superadmin') {
    return true;
  }

  // Admin cannot edit superadmin-created courses
  if (user.role === 'admin') {
    return course.createdBy?.role !== 'superadmin';
  }

  // Instructor can only edit own courses
  if (user.role === 'instructor') {
    return course.createdBy?.id === user.id;
  }

  return false;
};

/**
 * Check if user can delete a course
 * 
 * @param {Object} course - Course object with createdBy information
 * @param {Object} user - Current user object
 * @returns {boolean} True if user can delete the course
 */
export const canDeleteCourse = (course, user) => {
  if (!course || !user) return false;

  // Superadmin can delete all courses
  if (user.role === 'superadmin') {
    return true;
  }

  // Admin cannot delete superadmin-created courses
  if (user.role === 'admin') {
    return course.createdBy?.role !== 'superadmin';
  }

  // Instructor can only delete own courses
  if (user.role === 'instructor') {
    return course.createdBy?.id === user.id;
  }

  return false;
};

/**
 * Check if user can change status of a course
 * 
 * @param {Object} course - Course object with createdBy information
 * @param {Object} user - Current user object
 * @returns {boolean} True if user can change course status
 */
export const canChangeCourseStatus = (course, user) => {
  if (!course || !user) return false;

  // Superadmin can change status of all courses
  if (user.role === 'superadmin') {
    return true;
  }

  // Admin can change status of all courses (except superadmin restrictions)
  if (user.role === 'admin') {
    // Admin can change status, but restrictions apply for superadmin-created courses
    // This is handled at the API level, but we allow the UI action
    return true;
  }

  // Instructor can only change status of own courses
  if (user.role === 'instructor') {
    return course.createdBy?.id === user.id;
  }

  return false;
};

/**
 * Check if user can pin/unpin a course
 * 
 * @param {Object} course - Course object with createdBy information
 * @param {Object} user - Current user object
 * @returns {boolean} True if user can pin/unpin the course
 */
export const canPinCourse = (course, user) => {
  if (!course || !user) return false;

  // Superadmin can pin all courses
  if (user.role === 'superadmin') {
    return true;
  }

  // Admin can pin all courses
  if (user.role === 'admin') {
    return true;
  }

  // Instructor can only pin own courses
  if (user.role === 'instructor') {
    return course.createdBy?.id === user.id;
  }

  return false;
};

/**
 * Check if user can view a course
 * 
 * @param {Object} course - Course object
 * @param {Object} user - Current user object
 * @returns {boolean} True if user can view the course
 */
export const canViewCourse = (course, user) => {
  if (!course || !user) return false;

  // All authenticated users can view courses (filtering is done at API level)
  return true;
};

/**
 * Get all permissions for a course
 * 
 * @param {Object} course - Course object with createdBy information
 * @param {Object} user - Current user object
 * @returns {Object} Object with all permission flags
 */
export const getCoursePermissions = (course, user) => {
  return {
    canEdit: canEditCourse(course, user),
    canDelete: canDeleteCourse(course, user),
    canChangeStatus: canChangeCourseStatus(course, user),
    canPin: canPinCourse(course, user),
    canView: canViewCourse(course, user),
  };
};

