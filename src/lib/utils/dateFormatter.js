/**
 * Date Formatting Utilities
 */

/**
 * Format date to "Sep 29, 2024" format
 * @param {string|Date} date - Date string or Date object
 * @returns {string} Formatted date string
 */
export const formatDateShort = (date) => {
  if (!date) return '--';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '--';
    
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '--';
  }
};

export default formatDateShort;

