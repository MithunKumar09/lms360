/**
 * Course Constants
 * 
 * Constants and enums used throughout the course creation system.
 */

/**
 * Lesson Types
 */
export const LESSON_TYPES = {
  VIDEO: 'video',
  TEXT: 'text',
  QUIZ: 'quiz',
  ASSIGNMENT: 'assignment',
  MATERIAL: 'material',
};

/**
 * Lesson Type Labels
 */
export const LESSON_TYPE_LABELS = {
  [LESSON_TYPES.VIDEO]: 'Video',
  [LESSON_TYPES.TEXT]: 'Text',
  [LESSON_TYPES.QUIZ]: 'Quiz',
  [LESSON_TYPES.ASSIGNMENT]: 'Assignment',
  [LESSON_TYPES.MATERIAL]: 'Material',
};

/**
 * Course Status
 */
export const COURSE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
};

/**
 * Course Status Labels
 */
export const COURSE_STATUS_LABELS = {
  [COURSE_STATUS.DRAFT]: 'Draft',
  [COURSE_STATUS.PUBLISHED]: 'Published',
  [COURSE_STATUS.ARCHIVED]: 'Archived',
};

/**
 * Form Sections
 */
export const FORM_SECTIONS = {
  INFO: 'info',
  VIDEO: 'video',
  BUILDER: 'builder',
  ADDITIONAL: 'additional',
  CERTIFICATE: 'certificate',
};

/**
 * Form Section Labels
 */
export const FORM_SECTION_LABELS = {
  [FORM_SECTIONS.INFO]: 'Course Info',
  [FORM_SECTIONS.VIDEO]: 'Course Intro Video',
  [FORM_SECTIONS.BUILDER]: 'Course Builder',
  [FORM_SECTIONS.ADDITIONAL]: 'Additional Information',
  [FORM_SECTIONS.CERTIFICATE]: 'Certificate Template',
};

/**
 * Supported Languages
 */
export const SUPPORTED_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Chinese',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
  'Russian',
];

/**
 * Default Pagination
 */
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  total: 0,
};

/**
 * Auto-save Interval (milliseconds)
 */
export const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

/**
 * Validation Rules
 */
export const VALIDATION_RULES = {
  TITLE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 200,
  },
  SLUG: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 200,
    PATTERN: /^[a-z0-9-]+$/,
  },
  DESCRIPTION: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 5000,
  },
  PRICE: {
    MIN: 0,
    MAX: 999999.99,
  },
  DURATION: {
    MIN: 0,
    MAX: 9999,
  },
};

/**
 * Error Messages
 */
export const ERROR_MESSAGES = {
  REQUIRED: (field) => `${field} is required`,
  MIN_LENGTH: (field, min) => `${field} must be at least ${min} characters`,
  MAX_LENGTH: (field, max) => `${field} must be at most ${max} characters`,
  INVALID_FORMAT: (field) => `${field} has invalid format`,
  MIN_VALUE: (field, min) => `${field} must be at least ${min}`,
  MAX_VALUE: (field, max) => `${field} must be at most ${max}`,
  INVALID_URL: 'Please enter a valid URL',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_DATE: 'Please enter a valid date',
  INVALID_PRICE: 'Price must be a valid number',
  INVALID_DURATION: 'Duration must be a valid number',
  SLUG_INVALID: 'Slug must contain only lowercase letters, numbers, and hyphens',
  DISCOUNT_TOO_HIGH: 'Discounted price cannot be greater than regular price',
  DISCOUNTED_PRICE_GREATER: 'Discounted price cannot be greater than regular price',
  SUBCATEGORY_REQUIRES_CATEGORY: 'Please select a category before selecting a subcategory',
  SUBJECTS_REQUIRE_CLASSES: 'Please select at least one class before selecting subjects',
  AT_LEAST_ONE: (field) => `At least one ${field} is required`,
};

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  DRAFT_SAVED: 'Draft saved successfully',
  COURSE_PUBLISHED: 'Course published successfully',
  MODULE_ADDED: 'Module added successfully',
  CHAPTER_ADDED: 'Chapter added successfully',
  LESSON_ADDED: 'Lesson added successfully',
  MODULE_DELETED: 'Module deleted successfully',
  CHAPTER_DELETED: 'Chapter deleted successfully',
  LESSON_DELETED: 'Lesson deleted successfully',
  FORM_RESET: 'Form reset successfully',
};

/**
 * Course Field Labels
 */
export const FIELD_LABELS = {
  TITLE: 'Course Title',
  SLUG: 'Course Slug',
  REGULAR_PRICE: 'Regular Price',
  DISCOUNTED_PRICE: 'Discounted Price',
  ABOUT_COURSE: 'About Course',
  CATEGORY: 'Category',
  SUBCATEGORY: 'Subcategory',
  COURSE_TYPE: 'Course Type',
  PROGRAM_TYPE: 'Program Type',
  COURSE_LEVEL: 'Course Level',
  COURSE_SKILLS: 'Course Skills',
  INSTRUCTORS: 'Instructors',
  CLASSES: 'Classes',
  SUBJECTS: 'Subjects',
  ORGANIZATION: 'Organization',
  INTRO_VIDEO: 'Intro Video URL',
  START_DATE: 'Start Date',
  LANGUAGE: 'Language',
  REQUIREMENTS: 'Requirements',
  DESCRIPTION: 'Description',
  TAGS: 'Course Tags',
  CERTIFICATE_TEMPLATE: 'Certificate Template',
};

/**
 * Course Field Placeholders
 */
export const FIELD_PLACEHOLDERS = {
  TITLE: 'Enter course title',
  SLUG: 'course-title-slug',
  REGULAR_PRICE: '0.00',
  DISCOUNTED_PRICE: '0.00',
  ABOUT_COURSE: 'Describe your course...',
  INTRO_VIDEO: 'https://www.youtube.com/watch?v=...',
  DESCRIPTION: 'Enter course description...',
  TAGS: 'Enter tags separated by commas',
  REQUIREMENTS: 'Enter requirements (one per line)',
};

/**
 * Video URL Patterns
 */
export const VIDEO_URL_PATTERNS = {
  YOUTUBE: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
  VIMEO: /^(https?:\/\/)?(www\.)?vimeo\.com\/.+$/,
  MP4: /\.mp4$/i,
  M4V: /\.m4v$/i,
};

/**
 * Video URL Types
 */
export const VIDEO_URL_TYPES = {
  YOUTUBE: 'youtube',
  VIMEO: 'vimeo',
  DIRECT: 'direct',
};

/**
 * Default Course Data
 */
export const DEFAULT_COURSE_DATA = {
  title: '',
  slug: '',
  regularPrice: 0,
  discountedPrice: 0,
  aboutCourse: '',
  categoryId: null,
  subcategoryId: null,
  courseTypeId: null,
  programTypeId: null,
  courseLevelId: null,
  courseSkills: [],
  instructorIds: [],
  classIds: [],
  subjectIds: [],
  organizationId: null,
  introVideoUrl: '',
  coverImageUrl: '',
  modules: [],
  startDate: null,
  language: 'English',
  requirements: [],
  description: '',
  tags: [],
  certificateTemplateId: null,
  certificateMode: 'prebuilt',
  certificateUploadUrl: '',
};

export default {
  LESSON_TYPES,
  LESSON_TYPE_LABELS,
  COURSE_STATUS,
  COURSE_STATUS_LABELS,
  FORM_SECTIONS,
  FORM_SECTION_LABELS,
  SUPPORTED_LANGUAGES,
  DEFAULT_PAGINATION,
  AUTO_SAVE_INTERVAL,
  VALIDATION_RULES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FIELD_LABELS,
  FIELD_PLACEHOLDERS,
  VIDEO_URL_PATTERNS,
  VIDEO_URL_TYPES,
  DEFAULT_COURSE_DATA,
};

