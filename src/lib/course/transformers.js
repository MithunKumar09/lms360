/**
 * Course Data Transformers
 * 
 * Functions to transform course data between different formats.
 * Handles data normalization, API request/response transformation, etc.
 */

import { LESSON_TYPES, VIDEO_URL_PATTERNS, VIDEO_URL_TYPES } from './constants.js';

/**
 * Generate slug from title
 * @param {string} title - Course title
 * @returns {string} Generated slug
 */
export const generateSlug = (title) => {
  if (!title) return '';

  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Normalize video URL
 * @param {string} url - Video URL
 * @returns {Object} Normalized video data
 */
export const normalizeVideoUrl = (url) => {
  if (!url || url.trim() === '') {
    return {
      type: null,
      url: '',
      embedUrl: '',
      videoId: null,
    };
  }

  const trimmedUrl = url.trim();

  // Check YouTube
  if (VIDEO_URL_PATTERNS.YOUTUBE.test(trimmedUrl)) {
    const youtubeId = extractYouTubeId(trimmedUrl);
    return {
      type: VIDEO_URL_TYPES.YOUTUBE,
      url: trimmedUrl,
      embedUrl: youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : '',
      videoId: youtubeId,
    };
  }

  // Check Vimeo
  if (VIDEO_URL_PATTERNS.VIMEO.test(trimmedUrl)) {
    const vimeoId = extractVimeoId(trimmedUrl);
    return {
      type: VIDEO_URL_TYPES.VIMEO,
      url: trimmedUrl,
      embedUrl: vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : '',
      videoId: vimeoId,
    };
  }

  // Direct video URL
  if (VIDEO_URL_PATTERNS.MP4.test(trimmedUrl) || VIDEO_URL_PATTERNS.M4V.test(trimmedUrl)) {
    return {
      type: VIDEO_URL_TYPES.DIRECT,
      url: trimmedUrl,
      embedUrl: trimmedUrl,
      videoId: null,
    };
  }

  // Unknown format, return as-is
  return {
    type: null,
    url: trimmedUrl,
    embedUrl: trimmedUrl,
    videoId: null,
  };
};

/**
 * Extract YouTube video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null} YouTube video ID
 */
export const extractYouTubeId = (url) => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

/**
 * Extract Vimeo video ID from URL
 * @param {string} url - Vimeo URL
 * @returns {string|null} Vimeo video ID
 */
export const extractVimeoId = (url) => {
  const pattern = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/;
  const match = url.match(pattern);
  return match && match[1] ? match[1] : null;
};

/**
 * Transform course data for API request
 * @param {Object} courseData - Course data from store
 * @returns {Object} Transformed data for API
 */
export const transformCourseDataForAPI = (courseData) => {
  return {
    title: courseData.title?.trim() || '',
    slug: courseData.slug?.trim() || generateSlug(courseData.title),
    regularPrice: parseFloat(courseData.regularPrice) || 0,
    discountedPrice: parseFloat(courseData.discountedPrice) || 0,
    aboutCourse: courseData.aboutCourse?.trim() || '',
    categoryId: courseData.categoryId || null,
    subcategoryId: courseData.subcategoryId || null,
    courseTypeId: courseData.courseTypeId || null,
    programTypeId: courseData.programTypeId || null,
    courseLevelId: courseData.courseLevelId || null,
    courseSkills: Array.isArray(courseData.courseSkills)
      ? courseData.courseSkills.filter(Boolean)
      : [],
    instructorIds: Array.isArray(courseData.instructorIds)
      ? courseData.instructorIds.filter(Boolean)
      : [],
    classIds: Array.isArray(courseData.classIds)
      ? courseData.classIds.filter(Boolean)
      : [],
    subjectIds: Array.isArray(courseData.subjectIds)
      ? courseData.subjectIds.filter(Boolean)
      : [],
    organizationId: courseData.organizationId || null,
    introVideoUrl: courseData.introVideoUrl?.trim() || '',
    coverImageUrl: courseData.coverImageUrl?.trim() || '',
    modules: transformModulesForAPI(courseData.modules || []),
    startDate: courseData.startDate
      ? new Date(courseData.startDate).toISOString()
      : null,
    language: courseData.language || 'English',
    requirements: Array.isArray(courseData.requirements)
      ? courseData.requirements
          .map((req) => req?.trim())
          .filter(Boolean)
      : [],
    description: courseData.description?.trim() || '',
    tags: Array.isArray(courseData.tags)
      ? courseData.tags
          .map((tag) => tag?.trim())
          .filter(Boolean)
      : courseData.tags
      ? courseData.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : [],
    certificateTemplateId: courseData.certificateTemplateId || null,
    certificateMode: courseData.certificateMode || 'prebuilt',
    certificateUploadUrl: courseData.certificateUploadUrl?.trim() || '',
  };
};

/**
 * Transform modules for API
 * @param {Object[]} modules - Array of modules
 * @returns {Object[]} Transformed modules
 */
export const transformModulesForAPI = (modules) => {
  return modules.map((module, index) => ({
    id: module.id || null,
    title: module.title?.trim() || '',
    description: module.description?.trim() || '',
    order: module.order !== undefined ? module.order : index,
    chapters: transformChaptersForAPI(module.chapters || [], module.id),
  }));
};

/**
 * Transform chapters for API
 * @param {Object[]} chapters - Array of chapters
 * @param {string} moduleId - Parent module ID
 * @returns {Object[]} Transformed chapters
 */
export const transformChaptersForAPI = (chapters, moduleId) => {
  return chapters.map((chapter, index) => ({
    id: chapter.id || null,
    moduleId: moduleId || null,
    title: chapter.title?.trim() || '',
    description: chapter.description?.trim() || '',
    order: chapter.order !== undefined ? chapter.order : index,
    lessons: transformLessonsForAPI(chapter.lessons || [], chapter.id),
  }));
};

/**
 * Transform lessons for API
 * @param {Object[]} lessons - Array of lessons
 * @param {string} chapterId - Parent chapter ID
 * @returns {Object[]} Transformed lessons
 */
export const transformLessonsForAPI = (lessons, chapterId) => {
  return lessons.map((lesson, index) => {
    const transformedLesson = {
      id: lesson.id || null,
      chapterId: chapterId || null,
      type: lesson.type || LESSON_TYPES.VIDEO,
      title: lesson.title?.trim() || '',
      description: lesson.description?.trim() || '',
      duration: parseFloat(lesson.duration) || 0,
      order: lesson.order !== undefined ? lesson.order : index,
    };

    // Add type-specific fields
    if (transformedLesson.type === LESSON_TYPES.VIDEO) {
      transformedLesson.videoUrl = lesson.videoUrl?.trim() || '';
      transformedLesson.transcript = lesson.transcript?.trim() || '';
    } else if (transformedLesson.type === LESSON_TYPES.TEXT) {
      transformedLesson.content = lesson.content?.trim() || '';
    } else if (transformedLesson.type === LESSON_TYPES.QUIZ) {
      transformedLesson.quizId = lesson.quizId || null;
    } else if (transformedLesson.type === LESSON_TYPES.ASSIGNMENT) {
      transformedLesson.assignmentId = lesson.assignmentId || null;
    } else if (transformedLesson.type === LESSON_TYPES.MATERIAL) {
      transformedLesson.materialUrl = lesson.materialUrl?.trim() || '';
    }

    return transformedLesson;
  });
};

/**
 * Transform API response to course data
 * @param {Object} apiData - Data from API
 * @returns {Object} Transformed course data for store
 */
export const transformAPIResponseToCourseData = (apiData) => {
  return {
    title: apiData.title || '',
    slug: apiData.slug || '',
    regularPrice: parseFloat(apiData.regularPrice) || 0,
    discountedPrice: parseFloat(apiData.discountedPrice) || 0,
    aboutCourse: apiData.aboutCourse || '',
    categoryId: apiData.categoryId || null,
    subcategoryId: apiData.subcategoryId || null,
    courseTypeId: apiData.courseTypeId || null,
    programTypeId: apiData.programTypeId || null,
    courseLevelId: apiData.courseLevelId || null,
    courseSkills: Array.isArray(apiData.courseSkills)
      ? apiData.courseSkills
      : [],
    instructorIds: Array.isArray(apiData.instructorIds)
      ? apiData.instructorIds
      : [],
    classIds: Array.isArray(apiData.classIds) ? apiData.classIds : [],
    subjectIds: Array.isArray(apiData.subjectIds) ? apiData.subjectIds : [],
    organizationId: apiData.organizationId || null,
    introVideoUrl: apiData.introVideoUrl || '',
    coverImageUrl: apiData.coverImageUrl || '',
    modules: transformAPIResponseToModules(apiData.modules || []),
    startDate: apiData.startDate ? new Date(apiData.startDate) : null,
    language: apiData.language || 'English',
    requirements: Array.isArray(apiData.requirements)
      ? apiData.requirements
      : [],
    description: apiData.description || '',
    tags: Array.isArray(apiData.tags) ? apiData.tags : [],
    certificateTemplateId: apiData.certificateTemplateId || null,
    certificateMode: apiData.certificateMode || 'prebuilt',
    certificateUploadUrl: apiData.certificateUploadUrl || '',
  };
};

/**
 * Transform API modules response
 * @param {Object[]} modules - Modules from API
 * @returns {Object[]} Transformed modules
 */
export const transformAPIResponseToModules = (modules) => {
  return modules.map((module) => ({
    id: module.id,
    title: module.title || '',
    description: module.description || '',
    order: module.order || 0,
    chapters: transformAPIResponseToChapters(module.chapters || []),
  }));
};

/**
 * Transform API chapters response
 * @param {Object[]} chapters - Chapters from API
 * @returns {Object[]} Transformed chapters
 */
export const transformAPIResponseToChapters = (chapters) => {
  return chapters.map((chapter) => ({
    id: chapter.id,
    moduleId: chapter.moduleId,
    title: chapter.title || '',
    description: chapter.description || '',
    order: chapter.order || 0,
    lessons: transformAPIResponseToLessons(chapter.lessons || []),
  }));
};

/**
 * Transform API lessons response
 * @param {Object[]} lessons - Lessons from API
 * @returns {Object[]} Transformed lessons
 */
export const transformAPIResponseToLessons = (lessons) => {
  return lessons.map((lesson) => {
    const transformedLesson = {
      id: lesson.id,
      chapterId: lesson.chapterId,
      type: lesson.type || LESSON_TYPES.VIDEO,
      title: lesson.title || '',
      description: lesson.description || '',
      duration: parseFloat(lesson.duration) || 0,
      order: lesson.order || 0,
    };

    // Add type-specific fields
    if (transformedLesson.type === LESSON_TYPES.VIDEO) {
      transformedLesson.videoUrl = lesson.videoUrl || '';
      transformedLesson.transcript = lesson.transcript || '';
    } else if (transformedLesson.type === LESSON_TYPES.TEXT) {
      transformedLesson.content = lesson.content || '';
    } else if (transformedLesson.type === LESSON_TYPES.QUIZ) {
      transformedLesson.quizId = lesson.quizId || null;
    } else if (transformedLesson.type === LESSON_TYPES.ASSIGNMENT) {
      transformedLesson.assignmentId = lesson.assignmentId || null;
    } else if (transformedLesson.type === LESSON_TYPES.MATERIAL) {
      transformedLesson.materialUrl = lesson.materialUrl || '';
    }

    return transformedLesson;
  });
};

/**
 * Format tags string to array
 * @param {string|string[]} tags - Tags as string or array
 * @returns {string[]} Tags array
 */
export const formatTagsToArray = (tags) => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.trim()).filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
};

/**
 * Format requirements string to array
 * @param {string|string[]} requirements - Requirements as string or array
 * @returns {string[]} Requirements array
 */
export const formatRequirementsToArray = (requirements) => {
  if (Array.isArray(requirements)) {
    return requirements.map((req) => req.trim()).filter(Boolean);
  }

  if (typeof requirements === 'string') {
    return requirements
      .split('\n')
      .map((req) => req.trim())
      .filter(Boolean);
  }

  return [];
};

export default {
  generateSlug,
  normalizeVideoUrl,
  extractYouTubeId,
  extractVimeoId,
  transformCourseDataForAPI,
  transformModulesForAPI,
  transformChaptersForAPI,
  transformLessonsForAPI,
  transformAPIResponseToCourseData,
  transformAPIResponseToModules,
  transformAPIResponseToChapters,
  transformAPIResponseToLessons,
  formatTagsToArray,
  formatRequirementsToArray,
};

