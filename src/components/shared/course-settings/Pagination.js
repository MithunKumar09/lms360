/**
 * Pagination Component
 * 
 * Professional pagination component for tables
 */

"use client";

import { useMemo } from "react";

const Pagination = ({
  totalItems = 0,
  itemsPerPage = 10,
  currentPage = 1,
  onPageChange,
  showInfo = true,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Calculate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5; // Show max 5 page numbers

    if (totalPages <= maxVisible) {
      // Show all pages if total pages is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages with ellipsis
      if (currentPage <= 3) {
        // Show first pages
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Show last pages
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show middle pages
        pages.push(1);
        pages.push("ellipsis");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = useMemo(() => getPageNumbers(), [totalPages, currentPage]);

  if (totalPages <= 1) {
    return null; // Don't show pagination if only one page
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-borderColor dark:border-borderColor-dark">
      {/* Info */}
      {showInfo && (
        <div className="text-sm text-contentColor dark:text-contentColor-dark">
          Showing <span className="font-semibold text-blackColor dark:text-blackColor-dark">{startItem}</span> to{" "}
          <span className="font-semibold text-blackColor dark:text-blackColor-dark">{endItem}</span> of{" "}
          <span className="font-semibold text-blackColor dark:text-blackColor-dark">{totalItems}</span> results
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`
            px-3 py-2 text-sm font-medium rounded-md transition-colors
            ${currentPage === 1
              ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"
              : "bg-whiteColor text-blackColor border border-borderColor dark:bg-whiteColor-dark dark:text-blackColor-dark dark:border-borderColor-dark hover:bg-primaryColor hover:text-whiteColor hover:border-primaryColor dark:hover:bg-primaryColor dark:hover:text-whiteColor"
            }
          `}
          aria-label="Previous page"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, idx) => {
            if (page === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-contentColor dark:text-contentColor-dark"
                >
                  ...
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`
                  min-w-[36px] px-3 py-2 text-sm font-medium rounded-md transition-colors
                  ${isActive
                    ? "bg-primaryColor text-whiteColor dark:bg-primaryColor dark:text-whiteColor"
                    : "bg-whiteColor text-blackColor border border-borderColor dark:bg-whiteColor-dark dark:text-blackColor-dark dark:border-borderColor-dark hover:bg-primaryColor hover:text-whiteColor hover:border-primaryColor dark:hover:bg-primaryColor dark:hover:text-whiteColor"
                  }
                `}
                aria-label={`Go to page ${page}`}
                aria-current={isActive ? "page" : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`
            px-3 py-2 text-sm font-medium rounded-md transition-colors
            ${currentPage === totalPages
              ? "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"
              : "bg-whiteColor text-blackColor border border-borderColor dark:bg-whiteColor-dark dark:text-blackColor-dark dark:border-borderColor-dark hover:bg-primaryColor hover:text-whiteColor hover:border-primaryColor dark:hover:bg-primaryColor dark:hover:text-whiteColor"
            }
          `}
          aria-label="Next page"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Pagination;

