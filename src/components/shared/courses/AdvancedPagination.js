/**
 * AdvancedPagination Component
 * 
 * Professional pagination component with:
 * - First/last page buttons
 * - Ellipsis for large page counts
 * - Page size selector
 * - Results count display
 * - Keyboard shortcuts
 * - URL query parameter support
 */

'use client';

import React, { useEffect } from 'react';
import { generatePageNumbers, calculateShowingRange } from '@/lib/utils/paginationUtils';
import { useRouter, useSearchParams } from 'next/navigation';

const AdvancedPagination = ({
  currentPage = 0,
  totalPages = 1,
  totalItems = 0,
  limit = 12,
  pageSizes = [12, 24, 48, 96],
  onPageChange,
  onPageSizeChange,
  scrollToRef,
  showPageSizeSelector = true,
  showResultsCount = true,
  updateUrlParams = true,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Generate page numbers with ellipsis
  const pageNumbers = generatePageNumbers(currentPage, totalPages, 7);

  // Calculate showing range
  const { formatted: showingText } = calculateShowingRange(currentPage, limit, totalItems);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage === currentPage || newPage < 0 || newPage >= totalPages) return;

    // Scroll to top if ref provided
    if (scrollToRef?.current) {
      scrollToRef.current.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update URL params if enabled
    if (updateUrlParams) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', (newPage + 1).toString()); // Convert to 1-based for URL
      router.push(`?${params.toString()}`, { scroll: false });
    }

    // Call callback
    onPageChange?.(newPage);
  };

  // Handle page size change
  const handlePageSizeChange = (newLimit) => {
    if (newLimit === limit) return;

    // Reset to first page when page size changes
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', newLimit.toString());
    params.set('page', '1'); // Reset to first page
    router.push(`?${params.toString()}`, { scroll: false });

    onPageSizeChange?.(newLimit);
    handlePageChange(0); // Reset to first page
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if no input is focused
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      // Left arrow: Previous page
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (currentPage > 0) {
          e.preventDefault();
          handlePageChange(currentPage - 1);
        }
      }
      // Right arrow: Next page
      else if (e.key === 'ArrowRight' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        if (currentPage < totalPages - 1) {
          e.preventDefault();
          handlePageChange(currentPage + 1);
        }
      }
      // Home: First page
      else if (e.key === 'Home' && !e.shiftKey && !e.altKey) {
        if (currentPage > 0) {
          e.preventDefault();
          handlePageChange(0);
        }
      }
      // End: Last page
      else if (e.key === 'End' && !e.shiftKey && !e.altKey) {
        if (currentPage < totalPages - 1) {
          e.preventDefault();
          handlePageChange(totalPages - 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages]); // handlePageChange is stable, no need to include

  // Button class styles
  const buttonBaseClass = "w-10 h-10 leading-10 md:w-50px md:h-50px md:leading-50px text-center transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-whitegrey1 dark:disabled:hover:bg-whitegrey1-dark";
  const buttonActiveClass = "bg-primaryColor text-whiteColor dark:hover:bg-primaryColor";
  const buttonInactiveClass = "text-blackColor2 bg-whitegrey1 dark:text-blackColor2-dark dark:bg-whitegrey1-dark hover:text-whiteColor hover:bg-primaryColor dark:hover:text-whiteColor dark:hover:bg-primaryColor";

  if (totalPages <= 1) return null;

  return (
    <div className="mt-60px mb-30px">
      {/* Results count and page size selector */}
      {(showResultsCount || showPageSizeSelector) && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          {showResultsCount && (
            <div className="text-sm text-contentColor dark:text-contentColor-dark">
              {showingText}
            </div>
          )}
          {showPageSizeSelector && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-contentColor dark:text-contentColor-dark">
                Show:
              </label>
              <select
                value={limit}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="px-3 py-1 text-sm border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark rounded focus:outline-none focus:ring-2 focus:ring-primaryColor"
              >
                {pageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span className="text-sm text-contentColor dark:text-contentColor-dark">
                per page
              </span>
            </div>
          )}
        </div>
      )}

      {/* Pagination buttons */}
      <ul className="flex items-center justify-center gap-15px flex-wrap">
        {/* First page button */}
        <li>
          <button
            onClick={() => handlePageChange(0)}
            disabled={currentPage === 0}
            className={`${buttonBaseClass} ${buttonInactiveClass}`}
            aria-label="First page"
          >
            <i className="icofont-double-left"></i>
          </button>
        </li>

        {/* Previous page button */}
        <li>
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className={`${buttonBaseClass} ${buttonInactiveClass}`}
            aria-label="Previous page"
          >
            <i className="icofont-simple-left"></i>
          </button>
        </li>

        {/* Page numbers */}
        {pageNumbers.map((page, idx) => {
          if (page === 'ellipsis-start' || page === 'ellipsis-end') {
            return (
              <li key={`ellipsis-${idx}`}>
                <span className="w-10 h-10 leading-10 md:w-50px md:h-50px md:leading-50px text-center text-contentColor dark:text-contentColor-dark">
                  ...
                </span>
              </li>
            );
          }

          const pageNumber = page; // 0-indexed
          const displayNumber = pageNumber + 1; // 1-indexed for display

          return (
            <li key={pageNumber}>
              <button
                onClick={() => handlePageChange(pageNumber)}
                className={`${buttonBaseClass} ${
                  pageNumber === currentPage ? buttonActiveClass : buttonInactiveClass
                }`}
                aria-label={`Page ${displayNumber}`}
                aria-current={pageNumber === currentPage ? 'page' : undefined}
              >
                {displayNumber}
              </button>
            </li>
          );
        })}

        {/* Next page button */}
        <li>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className={`${buttonBaseClass} ${buttonInactiveClass}`}
            aria-label="Next page"
          >
            <i className="icofont-simple-right"></i>
          </button>
        </li>

        {/* Last page button */}
        <li>
          <button
            onClick={() => handlePageChange(totalPages - 1)}
            disabled={currentPage >= totalPages - 1}
            className={`${buttonBaseClass} ${buttonInactiveClass}`}
            aria-label="Last page"
          >
            <i className="icofont-double-right"></i>
          </button>
        </li>
      </ul>

      {/* Keyboard shortcuts hint (shown on hover via tooltip or small text) */}
      <div className="mt-2 text-center">
        <p className="text-xs text-contentColor dark:text-contentColor-dark opacity-70">
          Use arrow keys or Ctrl+Home/End for navigation
        </p>
      </div>
    </div>
  );
};

export default AdvancedPagination;

