/**
 * Pagination Utility Functions
 * 
 * Utility functions for pagination calculations including
 * page number generation with ellipsis, range calculations, etc.
 */

/**
 * Generate page numbers with ellipsis for large page counts
 * 
 * @param {number} currentPage - Current page (0-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {number} maxVisible - Maximum number of visible page buttons (default: 7)
 * @returns {Array} Array of page numbers and ellipsis markers
 */
export const generatePageNumbers = (currentPage, totalPages, maxVisible = 7) => {
  if (totalPages <= 1) return [];
  if (totalPages <= maxVisible) {
    // Show all pages if total is less than max visible
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const pages = [];
  const halfVisible = Math.floor(maxVisible / 2);

  // Always show first page
  pages.push(0);

  let startPage = Math.max(1, currentPage - halfVisible);
  let endPage = Math.min(totalPages - 2, currentPage + halfVisible);

  // Adjust if near the start
  if (currentPage <= halfVisible) {
    endPage = Math.min(maxVisible - 2, totalPages - 2);
    startPage = 1;
  }

  // Adjust if near the end
  if (currentPage >= totalPages - halfVisible - 1) {
    startPage = Math.max(1, totalPages - maxVisible + 1);
    endPage = totalPages - 2;
  }

  // Add ellipsis after first page if needed
  if (startPage > 1) {
    pages.push('ellipsis-start');
  }

  // Add middle pages
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  // Add ellipsis before last page if needed
  if (endPage < totalPages - 2) {
    pages.push('ellipsis-end');
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages - 1);
  }

  return pages;
};

/**
 * Calculate showing range (e.g., "1-12 of 120")
 * 
 * @param {number} currentPage - Current page (0-indexed)
 * @param {number} limit - Items per page
 * @param {number} totalItems - Total number of items
 * @returns {Object} Object with from, to, and formatted string
 */
export const calculateShowingRange = (currentPage, limit, totalItems) => {
  const from = totalItems === 0 ? 0 : currentPage * limit + 1;
  const to = Math.min((currentPage + 1) * limit, totalItems);
  
  return {
    from,
    to,
    formatted: totalItems === 0 
      ? 'No results' 
      : `Showing ${from}-${to} of ${totalItems}`,
  };
};

/**
 * Validate page number
 * 
 * @param {number} page - Page number to validate
 * @param {number} totalPages - Total number of pages
 * @returns {number} Validated page number
 */
export const validatePage = (page, totalPages) => {
  if (page < 0) return 0;
  if (page >= totalPages) return Math.max(0, totalPages - 1);
  return page;
};

/**
 * Default page size options
 */
export const DEFAULT_PAGE_SIZES = [12, 24, 48, 96];



