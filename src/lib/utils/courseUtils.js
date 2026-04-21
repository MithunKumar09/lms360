/**
 * Course Utility Functions
 * 
 * Utilities for calculating course metrics like lesson count, duration, and instructor count.
 * These functions are used across course listing and details pages for consistent calculations.
 */

/**
 * Count total lessons in a course from modules structure
 * 
 * Course structure: modules → chapters → lessons
 * 
 * @param {Array} modules - Array of modules with chapters and lessons
 * @returns {number} Total number of lessons
 * 
 * @example
 * const modules = [
 *   {
 *     chapters: [
 *       { lessons: [{ id: 1 }, { id: 2 }] },
 *       { lessons: [{ id: 3 }] }
 *     ]
 *   }
 * ];
 * countLessons(modules); // Returns 3
 */
export const countLessons = (modules) => {
  if (!modules || !Array.isArray(modules)) return 0;
  
  return modules.reduce((total, module) => {
    const moduleLessons = module.chapters?.reduce((chapterTotal, chapter) => {
      return chapterTotal + (chapter.lessons?.length || 0);
    }, 0) || 0;
    return total + moduleLessons;
  }, 0);
};

/**
 * Calculate total duration of a course from all lessons
 * 
 * Sums up all lesson durations across all modules and chapters.
 * 
 * @param {Array} modules - Array of modules with chapters and lessons
 * @returns {number} Total duration in minutes
 * 
 * @example
 * const modules = [
 *   {
 *     chapters: [
 *       { lessons: [{ duration: 15 }, { duration: 20 }] },
 *       { lessons: [{ duration: 10 }] }
 *     ]
 *   }
 * ];
 * calculateTotalDuration(modules); // Returns 45 (minutes)
 */
export const calculateTotalDuration = (modules) => {
  if (!modules || !Array.isArray(modules)) return 0;
  
  return modules.reduce((total, module) => {
    const moduleDuration = module.chapters?.reduce((chapterTotal, chapter) => {
      const chapterDuration = chapter.lessons?.reduce((lessonTotal, lesson) => {
        return lessonTotal + (lesson.duration || 0);
      }, 0) || 0;
      return chapterTotal + chapterDuration;
    }, 0) || 0;
    return total + moduleDuration;
  }, 0);
};

/**
 * Format duration in minutes to human-readable string
 * 
 * Formats duration to "X hr Y min" or "Y min" format.
 * 
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string
 * 
 * @example
 * formatCourseDuration(90); // Returns "1 hr 30 min"
 * formatCourseDuration(45); // Returns "45 min"
 * formatCourseDuration(60); // Returns "1 hr"
 */
export const formatCourseDuration = (minutes) => {
  if (!minutes || minutes === 0) return '0 min';
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0 && mins > 0) {
    return `${hours} hr ${mins} min`;
  } else if (hours > 0) {
    return `${hours} hr`;
  }
  return `${mins} min`;
};

/**
 * Count total instructors assigned to a course
 * 
 * @param {Array} instructors - Array of instructor objects
 * @returns {number} Total number of instructors
 * 
 * @example
 * const instructors = [
 *   { id: 1, name: 'John Doe' },
 *   { id: 2, name: 'Jane Smith' }
 * ];
 * countInstructors(instructors); // Returns 2
 */
export const countInstructors = (instructors) => {
  if (!instructors || !Array.isArray(instructors)) return 0;
  return instructors.length;
};

/**
 * Format lesson count to human-readable string
 * 
 * @param {number} count - Number of lessons
 * @returns {string} Formatted lesson count string
 * 
 * @example
 * formatLessonCount(1); // Returns "1 Lesson"
 * formatLessonCount(5); // Returns "5 Lessons"
 * formatLessonCount(0); // Returns "0 Lessons"
 */
export const formatLessonCount = (count) => {
  if (count === 0 || count === null || count === undefined) return '0 Lessons';
  return count === 1 ? '1 Lesson' : `${count} Lessons`;
};

/**
 * Check if course is free based on course type
 * 
 * @param {string} courseTypeName - Course type name (e.g., "Free", "Paid")
 * @returns {boolean} True if course is free
 * 
 * @example
 * isFreeCourse('Free'); // Returns true
 * isFreeCourse('Paid'); // Returns false
 */
export const isFreeCourse = (courseTypeName) => {
  if (!courseTypeName) return false;
  return courseTypeName.toLowerCase() === 'free';
};

/**
 * Get course category badge background color class
 * 
 * Returns appropriate CSS class for category badge styling.
 * 
 * @param {string} categoryName - Category name
 * @returns {string} CSS class name for background color
 */
export const getCategoryBadgeClass = (categoryName) => {
  const categoryMap = {
    'Art & Design': 'bg-secondaryColor',
    'Development': 'bg-blue',
    'Lifestyle': 'bg-secondaryColor2',
    'Web Design': 'bg-greencolor2',
    'Business': 'bg-orange',
    'Personal Development': 'bg-secondaryColor',
    'Marketing': 'bg-blue',
    'Photography': 'bg-secondaryColor2',
    'Data Science': 'bg-greencolor2',
    'Health & Fitness': 'bg-orange',
    'Mobile Application': 'bg-yellow',
  };
  
  return categoryMap[categoryName] || 'bg-secondaryColor';
};

/**
 * Transform course data for display in course cards
 * 
 * Adds calculated fields like lessonCount, totalDuration, instructorCount
 * to course object for easier use in components.
 * 
 * @param {Object} course - Course object from API
 * @returns {Object} Transformed course object with calculated fields
 */
export const transformCourseForDisplay = (course) => {
  if (!course) return null;
  
  const lessonCount = countLessons(course.modules || []);
  const totalDuration = calculateTotalDuration(course.modules || []);
  const instructorCount = countInstructors(course.instructors || []);
  const isFree = isFreeCourse(course.courseTypeName);
  
  return {
    ...course,
    lessonCount,
    formattedLessonCount: formatLessonCount(lessonCount),
    totalDuration,
    formattedDuration: formatCourseDuration(totalDuration),
    instructorCount,
    isFree,
    categoryBadgeClass: getCategoryBadgeClass(course.categoryName),
  };
};

/**
 * Transform array of courses for display
 * 
 * @param {Array} courses - Array of course objects
 * @returns {Array} Array of transformed course objects
 */
export const transformCoursesForDisplay = (courses) => {
  if (!courses || !Array.isArray(courses)) return [];
  return courses.map(transformCourseForDisplay).filter(Boolean);
};

export default {
  countLessons,
  calculateTotalDuration,
  formatCourseDuration,
  countInstructors,
  formatLessonCount,
  isFreeCourse,
  getCategoryBadgeClass,
  transformCourseForDisplay,
  transformCoursesForDisplay,
};



