/**
 * Cross-Field Validation
 * 
 * Validates relationships between multiple fields.
 * Provides cross-field validation rules for course creation.
 */

import { ERROR_MESSAGES } from './constants.js';

/**
 * Validate price relationship
 * @param {number} regularPrice - Regular price
 * @param {number} discountedPrice - Discounted price
 * @returns {Object} Validation result with errors
 */
export const validatePriceRelationship = (regularPrice, discountedPrice) => {
  const errors = {};

  if (regularPrice > 0 && discountedPrice > 0) {
    if (discountedPrice > regularPrice) {
      errors.discountedPrice =
        ERROR_MESSAGES.DISCOUNTED_PRICE_GREATER ||
        'Discounted price cannot be greater than regular price';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate category and subcategory relationship
 * @param {string} categoryId - Category ID
 * @param {string} subcategoryId - Subcategory ID
 * @returns {Object} Validation result with errors
 */
export const validateCategoryRelationship = (categoryId, subcategoryId) => {
  const errors = {};

  if (subcategoryId && !categoryId) {
    errors.subcategoryId =
      ERROR_MESSAGES.SUBCATEGORY_REQUIRES_CATEGORY ||
      'Please select a category before selecting a subcategory';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate class and subject relationship
 * @param {string[]} classIds - Class IDs
 * @param {string[]} subjectIds - Subject IDs
 * @returns {Object} Validation result with errors
 */
export const validateClassSubjectRelationship = (classIds, subjectIds) => {
  const errors = {};

  if (subjectIds.length > 0 && classIds.length === 0) {
    errors.subjectIds =
      ERROR_MESSAGES.SUBJECTS_REQUIRE_CLASSES ||
      'Please select at least one class before selecting subjects';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate course structure
 * @param {Array} modules - Course modules
 * @returns {Object} Validation result with errors
 */
export const validateCourseStructure = (modules) => {
  const errors = {};

  if (!modules || modules.length === 0) {
    errors.modules = ERROR_MESSAGES.REQUIRED('At least one module');
    return { isValid: false, errors };
  }

  modules.forEach((module, moduleIndex) => {
    if (!module.title || module.title.trim() === '') {
      errors[`modules.${moduleIndex}.title`] = ERROR_MESSAGES.REQUIRED('Module title');
    }

    if (!module.chapters || module.chapters.length === 0) {
      errors[`modules.${moduleIndex}.chapters`] =
        ERROR_MESSAGES.REQUIRED('At least one chapter in module');
    } else {
      module.chapters.forEach((chapter, chapterIndex) => {
        if (!chapter.title || chapter.title.trim() === '') {
          errors[
            `modules.${moduleIndex}.chapters.${chapterIndex}.title`
          ] = ERROR_MESSAGES.REQUIRED('Chapter title');
        }

        if (!chapter.lessons || chapter.lessons.length === 0) {
          errors[
            `modules.${moduleIndex}.chapters.${chapterIndex}.lessons`
          ] = ERROR_MESSAGES.REQUIRED('At least one lesson in chapter');
        } else {
          chapter.lessons.forEach((lesson, lessonIndex) => {
            if (!lesson.title || lesson.title.trim() === '') {
              errors[
                `modules.${moduleIndex}.chapters.${chapterIndex}.lessons.${lessonIndex}.title`
              ] = ERROR_MESSAGES.REQUIRED('Lesson title');
            }

            if (lesson.type === 'video' && (!lesson.videoUrl || lesson.videoUrl.trim() === '')) {
              errors[
                `modules.${moduleIndex}.chapters.${chapterIndex}.lessons.${lessonIndex}.videoUrl`
              ] = ERROR_MESSAGES.REQUIRED('Video URL for video lessons');
            }
          });
        }
      });
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate instructor requirement based on user role
 * @param {string[]} instructorIds - Instructor IDs
 * @param {string} userRole - User role (admin, superadmin, etc.)
 * @param {string|null} organizationId - Organization ID
 * @returns {Object} Validation result with errors
 */
export const validateInstructorRequirement = (instructorIds, userRole, organizationId) => {
  const errors = {};

  // For admin: instructor is always required
  if (userRole === 'admin') {
    if (!instructorIds || instructorIds.length === 0) {
      errors.instructorIds = 'Instructors are required for admin users';
    }
  }
  // For superadmin: instructor is optional when org is not selected
  // If org is selected, instructor should be selected (but not strictly required)
  // If org is not selected, instructor is optional
  // Note: The requirement is that if org is selected, instructor should ideally be selected
  // but we'll keep it optional for superadmin flexibility

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate all cross-field relationships
 * @param {Object} courseData - Course data object
 * @param {Object} userContext - User context (role, orgId, etc.) - optional
 * @returns {Object} Validation result with all errors
 */
export const validateAllCrossFields = (courseData, userContext = null) => {
  const allErrors = {};

  // Price relationship
  const priceValidation = validatePriceRelationship(
    courseData.regularPrice,
    courseData.discountedPrice
  );
  Object.assign(allErrors, priceValidation.errors);

  // Category relationship
  const categoryValidation = validateCategoryRelationship(
    courseData.categoryId,
    courseData.subcategoryId
  );
  Object.assign(allErrors, categoryValidation.errors);

  // Class-Subject relationship
  const classSubjectValidation = validateClassSubjectRelationship(
    courseData.classIds || [],
    courseData.subjectIds || []
  );
  Object.assign(allErrors, classSubjectValidation.errors);

  // Instructor requirement based on user role
  if (userContext && userContext.role) {
    const instructorValidation = validateInstructorRequirement(
      courseData.instructorIds || [],
      userContext.role,
      courseData.organizationId
    );
    Object.assign(allErrors, instructorValidation.errors);
  }

  // Course structure
  const structureValidation = validateCourseStructure(courseData.modules || []);
  Object.assign(allErrors, structureValidation.errors);

  return {
    isValid: Object.keys(allErrors).length === 0,
    errors: allErrors,
  };
};

