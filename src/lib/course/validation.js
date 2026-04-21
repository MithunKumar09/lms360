/**
 * Course Validation
 * 
 * Validation functions for course creation form.
 * Provides comprehensive validation with user-friendly error messages.
 */

import {
  VALIDATION_RULES,
  ERROR_MESSAGES,
  LESSON_TYPES,
  VIDEO_URL_PATTERNS,
  VIDEO_URL_TYPES,
} from './constants.js';

/**
 * Validate course title
 * @param {string} title - Course title
 * @returns {string|null} Error message or null if valid
 */
export const validateTitle = (title) => {
  if (!title || title.trim() === '') {
    return ERROR_MESSAGES.REQUIRED('Course title');
  }

  if (title.trim().length < VALIDATION_RULES.TITLE.MIN_LENGTH) {
    return ERROR_MESSAGES.MIN_LENGTH(
      'Course title',
      VALIDATION_RULES.TITLE.MIN_LENGTH
    );
  }

  if (title.trim().length > VALIDATION_RULES.TITLE.MAX_LENGTH) {
    return ERROR_MESSAGES.MAX_LENGTH(
      'Course title',
      VALIDATION_RULES.TITLE.MAX_LENGTH
    );
  }

  return null;
};

/**
 * Validate course slug
 * @param {string} slug - Course slug
 * @returns {string|null} Error message or null if valid
 */
export const validateSlug = (slug) => {
  if (!slug || slug.trim() === '') {
    return ERROR_MESSAGES.REQUIRED('Course slug');
  }

  if (slug.trim().length < VALIDATION_RULES.SLUG.MIN_LENGTH) {
    return ERROR_MESSAGES.MIN_LENGTH(
      'Course slug',
      VALIDATION_RULES.SLUG.MIN_LENGTH
    );
  }

  if (slug.trim().length > VALIDATION_RULES.SLUG.MAX_LENGTH) {
    return ERROR_MESSAGES.MAX_LENGTH(
      'Course slug',
      VALIDATION_RULES.SLUG.MAX_LENGTH
    );
  }

  if (!VALIDATION_RULES.SLUG.PATTERN.test(slug)) {
    return ERROR_MESSAGES.SLUG_INVALID;
  }

  return null;
};

/**
 * Validate price
 * @param {number} price - Price value
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
export const validatePrice = (price, fieldName = 'Price') => {
  if (price === null || price === undefined || price === '') {
    return ERROR_MESSAGES.REQUIRED(fieldName);
  }

  const numPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return ERROR_MESSAGES.INVALID_PRICE;
  }

  if (numPrice < VALIDATION_RULES.PRICE.MIN) {
    return ERROR_MESSAGES.MIN_VALUE(
      fieldName,
      VALIDATION_RULES.PRICE.MIN
    );
  }

  if (numPrice > VALIDATION_RULES.PRICE.MAX) {
    return ERROR_MESSAGES.MAX_VALUE(
      fieldName,
      VALIDATION_RULES.PRICE.MAX
    );
  }

  return null;
};

/**
 * Validate discounted price against regular price
 * @param {number} discountedPrice - Discounted price
 * @param {number} regularPrice - Regular price
 * @returns {string|null} Error message or null if valid
 */
export const validateDiscountedPrice = (discountedPrice, regularPrice) => {
  const priceError = validatePrice(discountedPrice, 'Discounted price');
  if (priceError) {
    return priceError;
  }

  const numDiscounted = typeof discountedPrice === 'string' 
    ? parseFloat(discountedPrice) 
    : discountedPrice;
  const numRegular = typeof regularPrice === 'string' 
    ? parseFloat(regularPrice) 
    : regularPrice;

  if (numDiscounted > numRegular) {
    return ERROR_MESSAGES.DISCOUNT_TOO_HIGH;
  }

  return null;
};

/**
 * Validate description
 * @param {string} description - Description text
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
export const validateDescription = (description, fieldName = 'Description') => {
  if (!description || description.trim() === '') {
    return ERROR_MESSAGES.REQUIRED(fieldName);
  }

  if (description.trim().length < VALIDATION_RULES.DESCRIPTION.MIN_LENGTH) {
    return ERROR_MESSAGES.MIN_LENGTH(
      fieldName,
      VALIDATION_RULES.DESCRIPTION.MIN_LENGTH
    );
  }

  if (description.trim().length > VALIDATION_RULES.DESCRIPTION.MAX_LENGTH) {
    return ERROR_MESSAGES.MAX_LENGTH(
      fieldName,
      VALIDATION_RULES.DESCRIPTION.MAX_LENGTH
    );
  }

  return null;
};

/**
 * Validate URL
 * @param {string} url - URL string
 * @returns {string|null} Error message or null if valid
 */
export const validateUrl = (url) => {
  if (!url || url.trim() === '') {
    return null; // URL is optional
  }

  try {
    new URL(url);
    return null;
  } catch (error) {
    return ERROR_MESSAGES.INVALID_URL;
  }
};

/**
 * Validate video URL
 * @param {string} url - Video URL
 * @returns {string|null} Error message or null if valid
 */
export const validateVideoUrl = (url) => {
  if (!url || url.trim() === '') {
    return null; // Video URL is optional
  }

  const trimmedUrl = url.trim();

  // Accept relative paths (starting with /) - these are valid for uploaded files
  if (trimmedUrl.startsWith('/')) {
    // Check if it's a video file extension
    const videoExtensions = /\.(mp4|m4v|webm|ogg|ogv|mov|avi|wmv|flv)$/i;
    if (videoExtensions.test(trimmedUrl)) {
      return null; // Valid relative video path
    }
    // If it's a relative path but not a video file, still accept it (could be a valid path)
    return null;
  }

  // For absolute URLs, validate them
  try {
    // Try to create a URL object to validate
    new URL(trimmedUrl);
  } catch (e) {
    // If URL constructor fails, check if it matches known video URL patterns
    const isYouTube = VIDEO_URL_PATTERNS.YOUTUBE.test(trimmedUrl);
    const isVimeo = VIDEO_URL_PATTERNS.VIMEO.test(trimmedUrl);
    
    if (!isYouTube && !isVimeo) {
      return 'Please enter a valid YouTube, Vimeo, or direct video URL';
    }
  }

  // Check if it matches known video URL patterns
  const isYouTube = VIDEO_URL_PATTERNS.YOUTUBE.test(trimmedUrl);
  const isVimeo = VIDEO_URL_PATTERNS.VIMEO.test(trimmedUrl);
  const isDirect = VIDEO_URL_PATTERNS.MP4.test(trimmedUrl) || VIDEO_URL_PATTERNS.M4V.test(trimmedUrl);

  if (!isYouTube && !isVimeo && !isDirect) {
    return 'Please enter a valid YouTube, Vimeo, or direct video URL';
  }

  return null;
};

/**
 * Validate required selection
 * @param {string|string[]|null} value - Selected value(s)
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
export const validateRequiredSelection = (value, fieldName) => {
  if (!value) {
    return ERROR_MESSAGES.REQUIRED(fieldName);
  }

  if (Array.isArray(value) && value.length === 0) {
    return ERROR_MESSAGES.AT_LEAST_ONE(fieldName);
  }

  return null;
};

/**
 * Validate array selection (at least one required)
 * @param {string[]} array - Selected array
 * @param {string} fieldName - Field name for error message
 * @returns {string|null} Error message or null if valid
 */
export const validateArraySelection = (array, fieldName) => {
  if (!Array.isArray(array)) {
    return ERROR_MESSAGES.REQUIRED(fieldName);
  }

  if (array.length === 0) {
    return ERROR_MESSAGES.AT_LEAST_ONE(fieldName);
  }

  return null;
};

/**
 * Validate date
 * @param {Date|string|null} date - Date value
 * @returns {string|null} Error message or null if valid
 */
export const validateDate = (date) => {
  if (!date) {
    return null; // Date is optional
  }

  const dateObj = date instanceof Date ? date : new Date(date);
  
  if (isNaN(dateObj.getTime())) {
    return ERROR_MESSAGES.INVALID_DATE;
  }

  return null;
};

/**
 * Validate duration
 * @param {number} duration - Duration in minutes
 * @returns {string|null} Error message or null if valid
 */
export const validateDuration = (duration) => {
  if (duration === null || duration === undefined || duration === '') {
    return null; // Duration is optional
  }

  const numDuration = typeof duration === 'string' ? parseFloat(duration) : duration;

  if (isNaN(numDuration)) {
    return ERROR_MESSAGES.INVALID_DURATION;
  }

  if (numDuration < VALIDATION_RULES.DURATION.MIN) {
    return ERROR_MESSAGES.MIN_VALUE(
      'Duration',
      VALIDATION_RULES.DURATION.MIN
    );
  }

  if (numDuration > VALIDATION_RULES.DURATION.MAX) {
    return ERROR_MESSAGES.MAX_VALUE(
      'Duration',
      VALIDATION_RULES.DURATION.MAX
    );
  }

  return null;
};

/**
 * Validate module
 * @param {Object} module - Module object
 * @param {number} index - Module index
 * @returns {Object} Validation errors for module
 */
export const validateModule = (module, index) => {
  const errors = {};

  if (!module.title || module.title.trim() === '') {
    errors.title = ERROR_MESSAGES.REQUIRED('Module title');
  }

  if (!module.chapters || module.chapters.length === 0) {
    errors.chapters = ERROR_MESSAGES.AT_LEAST_ONE('chapter');
  }

  return errors;
};

/**
 * Validate chapter
 * @param {Object} chapter - Chapter object
 * @param {number} moduleIndex - Module index
 * @param {number} chapterIndex - Chapter index
 * @returns {Object} Validation errors for chapter
 */
export const validateChapter = (chapter, moduleIndex, chapterIndex) => {
  const errors = {};

  if (!chapter.title || chapter.title.trim() === '') {
    errors.title = ERROR_MESSAGES.REQUIRED('Chapter title');
  }

  if (!chapter.lessons || chapter.lessons.length === 0) {
    errors.lessons = ERROR_MESSAGES.AT_LEAST_ONE('lesson');
  }

  return errors;
};

/**
 * Validate lesson
 * @param {Object} lesson - Lesson object
 * @param {number} moduleIndex - Module index
 * @param {number} chapterIndex - Chapter index
 * @param {number} lessonIndex - Lesson index
 * @returns {Object} Validation errors for lesson
 */
export const validateLesson = (lesson, moduleIndex, chapterIndex, lessonIndex) => {
  const errors = {};

  if (!lesson.title || lesson.title.trim() === '') {
    errors.title = ERROR_MESSAGES.REQUIRED('Lesson title');
  }

  if (lesson.type === LESSON_TYPES.VIDEO) {
    if (!lesson.videoUrl || lesson.videoUrl.trim() === '') {
      errors.videoUrl = ERROR_MESSAGES.REQUIRED('Video URL');
    } else {
      const videoUrlError = validateVideoUrl(lesson.videoUrl);
      if (videoUrlError) {
        errors.videoUrl = videoUrlError;
      }
    }
  }

  if (lesson.type === LESSON_TYPES.TEXT) {
    if (!lesson.content || lesson.content.trim() === '') {
      errors.content = ERROR_MESSAGES.REQUIRED('Lesson content');
    }
  }

  if (lesson.duration !== null && lesson.duration !== undefined) {
    const durationError = validateDuration(lesson.duration);
    if (durationError) {
      errors.duration = durationError;
    }
  }

  return errors;
};

/**
 * Validate course structure (modules, chapters, lessons)
 * @param {Object[]} modules - Array of modules
 * @returns {Object} Validation errors for course structure
 */
export const validateCourseStructure = (modules) => {
  const errors = {};

  if (!modules || modules.length === 0) {
    errors.modules = ERROR_MESSAGES.AT_LEAST_ONE('module');
    return errors;
  }

  modules.forEach((module, moduleIndex) => {
    const moduleErrors = validateModule(module, moduleIndex);
    if (Object.keys(moduleErrors).length > 0) {
      errors[`modules.${moduleIndex}`] = moduleErrors;
    }

    if (module.chapters && module.chapters.length > 0) {
      module.chapters.forEach((chapter, chapterIndex) => {
        const chapterErrors = validateChapter(chapter, moduleIndex, chapterIndex);
        if (Object.keys(chapterErrors).length > 0) {
          errors[`modules.${moduleIndex}.chapters.${chapterIndex}`] = chapterErrors;
        }

        if (chapter.lessons && chapter.lessons.length > 0) {
          chapter.lessons.forEach((lesson, lessonIndex) => {
            const lessonErrors = validateLesson(
              lesson,
              moduleIndex,
              chapterIndex,
              lessonIndex
            );
            if (Object.keys(lessonErrors).length > 0) {
              errors[
                `modules.${moduleIndex}.chapters.${chapterIndex}.lessons.${lessonIndex}`
              ] = lessonErrors;
            }
          });
        }
      });
    }
  });

  return errors;
};

/**
 * Validate entire course data
 * @param {Object} courseData - Course data object
 * @returns {Object} Validation result with errors
 */
export const validateCourseData = (courseData) => {
  const errors = {};

  // Basic fields
  const titleError = validateTitle(courseData.title);
  if (titleError) errors.title = titleError;

  const slugError = validateSlug(courseData.slug);
  if (slugError) errors.slug = slugError;

  const regularPriceError = validatePrice(courseData.regularPrice, 'Regular price');
  if (regularPriceError) errors.regularPrice = regularPriceError;

  const discountedPriceError = validateDiscountedPrice(
    courseData.discountedPrice,
    courseData.regularPrice
  );
  if (discountedPriceError) errors.discountedPrice = discountedPriceError;

  // Required selections
  const categoryError = validateRequiredSelection(courseData.categoryId, 'Category');
  if (categoryError) errors.categoryId = categoryError;

  const courseTypeError = validateRequiredSelection(
    courseData.courseTypeId,
    'Course type'
  );
  if (courseTypeError) errors.courseTypeId = courseTypeError;

  const programTypeError = validateRequiredSelection(
    courseData.programTypeId,
    'Program type'
  );
  if (programTypeError) errors.programTypeId = programTypeError;

  const courseLevelError = validateRequiredSelection(
    courseData.courseLevelId,
    'Course level'
  );
  if (courseLevelError) errors.courseLevelId = courseLevelError;

  // Instructor validation: required for admin, optional for superadmin when org not selected
  // Note: The actual requirement based on role is handled in cross-field validation
  // Here we just validate the format if instructors are provided
  if (courseData.instructorIds && courseData.instructorIds.length > 0) {
    // Validate that instructorIds is an array of strings
    if (!Array.isArray(courseData.instructorIds)) {
      errors.instructorIds = 'Instructors must be an array';
    } else if (courseData.instructorIds.some(id => !id || typeof id !== 'string')) {
      errors.instructorIds = 'All instructor IDs must be valid strings';
    }
  }

  // Video URL (optional but validate if provided)
  if (courseData.introVideoUrl) {
    const videoUrlError = validateVideoUrl(courseData.introVideoUrl);
    if (videoUrlError) errors.introVideoUrl = videoUrlError;
  }

  // Course structure
  const structureErrors = validateCourseStructure(courseData.modules);
  Object.assign(errors, structureErrors);

  // Date validation (optional)
  if (courseData.startDate) {
    const dateError = validateDate(courseData.startDate);
    if (dateError) errors.startDate = dateError;
  }

  // Certificate validation
  if (courseData.certificateMode === 'prebuilt') {
    // If prebuilt mode, template ID is required
    if (!courseData.certificateTemplateId) {
      errors.certificateTemplateId = 'Please select a certificate template';
    }
  } else if (courseData.certificateMode === 'upload') {
    // If upload mode, certificate URL is required
    if (!courseData.certificateUploadUrl || courseData.certificateUploadUrl.trim() === '') {
      errors.certificateUploadUrl = 'Please upload a certificate file or provide a URL';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default {
  validateTitle,
  validateSlug,
  validatePrice,
  validateDiscountedPrice,
  validateDescription,
  validateUrl,
  validateVideoUrl,
  validateRequiredSelection,
  validateArraySelection,
  validateDate,
  validateDuration,
  validateModule,
  validateChapter,
  validateLesson,
  validateCourseStructure,
  validateCourseData,
};

