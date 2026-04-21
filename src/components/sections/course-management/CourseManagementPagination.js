'use client';

import { useState, useRef, useEffect } from 'react';
import ButtonPagination from '@/components/shared/buttons/ButtonPagination';

/**
 * Course Management Pagination Component
 * 
 * Professional pagination with page numbers, prev/next, jump to page, and total count.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.pagination - Pagination data
 * @param {number} props.pagination.page - Current page number
 * @param {number} props.pagination.limit - Items per page
 * @param {number} props.pagination.total - Total number of courses
 * @param {number} props.pagination.totalPages - Total number of pages
 * @param {Function} props.onPageChange - Page change handler
 * @returns {JSX.Element} Pagination component
 */
const CourseManagementPagination = ({ pagination, onPageChange }) => {
  const [jumpToPage, setJumpToPage] = useState('');
  const jumpInputRef = useRef(null);

  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const { page, limit, total, totalPages } = pagination;
  const skip = (page - 1) * limit;

  // Generate page numbers (show max 7 pages around current page)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;
    let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    // Adjust if we're near the end
    if (endPage - startPage < maxVisible - 1) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Add first page if not in range
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('ellipsis-start');
      }
    }

    // Add pages in range
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add last page if not in range
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('ellipsis-end');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  // Handle page jump
  const handleJumpToPage = (e) => {
    e.preventDefault();
    const pageNum = parseInt(jumpToPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpToPage('');
      if (jumpInputRef.current) {
        jumpInputRef.current.blur();
      }
    }
  };

  // Handle pagination
  const handlePagination = (id) => {
    if (id === 'prev') {
      if (page > 1) {
        onPageChange(page - 1);
      }
    } else if (id === 'next') {
      if (page < totalPages) {
        onPageChange(page + 1);
      }
    } else if (typeof id === 'number') {
      // ButtonPagination uses 0-based index, convert to 1-based page
      onPageChange(id + 1);
    }
  };

  // Calculate display range
  const startItem = skip + 1;
  const endItem = Math.min(skip + limit, total);

  return (
    <div className="container mb-6">
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-md p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Total Count and Range */}
          <div className="text-sm text-contentColor dark:text-contentColor-dark">
            <span className="font-medium">
              Showing {startItem} to {endItem} of {total} courses
            </span>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            {/* Previous Button */}
            <ButtonPagination
              type="prev"
              skip={skip}
              limit={limit}
              totalItems={total}
              handlePagesnation={handlePagination}
              idx="prev"
              currentPage={page - 1}
            />

            {/* Page Numbers */}
            <ul className="flex items-center gap-2">
              {pageNumbers.map((pageNum, idx) => {
                if (pageNum === 'ellipsis-start' || pageNum === 'ellipsis-end') {
                  return (
                    <li key={`ellipsis-${idx}`}>
                      <span className="px-2 text-contentColor/50 dark:text-contentColor-dark/50">
                        ...
                      </span>
                    </li>
                  );
                }

                return (
                  <li key={pageNum}>
                    <ButtonPagination
                      idx={pageNum - 1}
                      id={pageNum}
                      handlePagesnation={handlePagination}
                      currentPage={page - 1}
                    />
                  </li>
                );
              })}
            </ul>

            {/* Next Button */}
            <ButtonPagination
              type="next"
              skip={skip}
              limit={limit}
              totalItems={total}
              handlePagesnation={handlePagination}
              idx="next"
              currentPage={page - 1}
            />
          </div>

          {/* Jump to Page */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-contentColor dark:text-contentColor-dark whitespace-nowrap">
              Jump to:
            </span>
            <form onSubmit={handleJumpToPage} className="flex items-center gap-2">
              <input
                ref={jumpInputRef}
                type="number"
                min="1"
                max={totalPages}
                value={jumpToPage}
                onChange={(e) => setJumpToPage(e.target.value)}
                placeholder={page.toString()}
                className="w-16 px-2 py-1.5 text-sm text-center bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-md text-contentColor dark:text-contentColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-sm font-medium text-whiteColor bg-primaryColor hover:bg-primaryColor/90 rounded-md transition-colors"
              >
                Go
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseManagementPagination;
