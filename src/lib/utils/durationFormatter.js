/**
 * Duration Formatting Utilities
 */

/**
 * Format duration in minutes to "02hr 35min" format
 * @param {number} minutes - Duration in minutes
 * @returns {string} Formatted duration string
 */
export const formatDuration = (minutes) => {
  if (!minutes || minutes === 0) return '0min';
  
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  if (hours > 0 && mins > 0) {
    return `${hours.toString().padStart(2, '0')}hr ${mins}min`;
  } else if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}hr`;
  } else {
    return `${mins}min`;
  }
};

/**
 * Format duration in seconds to "02hr 35min" format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration string
 */
export const formatDurationFromSeconds = (seconds) => {
  if (!seconds || seconds === 0) return '0min';
  const minutes = Math.floor(seconds / 60);
  return formatDuration(minutes);
};

/**
 * Calculate total duration for a module (sum of all lesson durations)
 * @param {Array} modules - Array of modules with chapters and lessons
 * @param {string} moduleId - Module ID
 * @returns {number} Total duration in minutes
 */
export const calculateModuleDuration = (modules, moduleId) => {
  const courseModule = modules.find(m => m.id === moduleId);
  if (!courseModule || !courseModule.chapters) return 0;
  
  let totalMinutes = 0;
  courseModule.chapters.forEach(chapter => {
    if (chapter.lessons) {
      chapter.lessons.forEach(lesson => {
        totalMinutes += lesson.duration || 0;
      });
    }
  });
  
  return totalMinutes;
};

export default formatDuration;

