import React from "react";
import LessonQuizResults from "../lesson-quiz/LessonQuizResults";
import QuizFilter from "../dashboards/QuizFilter";
import HeadingDashboard from "../headings/HeadingDashboard";

const QuizContainers = ({ 
  allResults, 
  title, 
  table, 
  filters, 
  onFilterChange, 
  courses = [],
  pagination,
  onPageChange,
  isLoading = false
}) => {
  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      {/* heading */}
      <HeadingDashboard>{title ? title : "Student Quiz Attempts"}</HeadingDashboard>

      {/* filter content */}
      {filters && onFilterChange ? (
        <>
          <QuizFilter 
            filters={filters}
            onFilterChange={onFilterChange}
            courses={courses}
          />
          <hr className="my-4 border-contentColor opacity-35" />
        </>
      ) : (
        <>
          <QuizFilter />
          <hr className="my-4 border-contentColor opacity-35" />
        </>
      )}
      
      {/* main content */}
      {isLoading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primaryColor"></div>
          <p className="mt-4 text-contentColor dark:text-contentColor-dark">Loading assignments...</p>
        </div>
      ) : !allResults || allResults.length === 0 ? (
        <div className="text-center py-20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            className="mx-auto text-contentColor dark:text-contentColor-dark opacity-50 mb-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
          <p className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-2">
            No assignments found
          </p>
          <p className="text-sm text-contentColor dark:text-contentColor-dark">
            {filters && (filters.courseId || filters.status) 
              ? "Try adjusting your filters to see more results."
              : "You don't have any assignments yet."}
          </p>
        </div>
      ) : (
        <>
          <LessonQuizResults
            allResults={allResults}
            isHeading={false}
            title={"Quiz Attempts"}
            table={table}
          />
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && onPageChange && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-contentColor dark:text-contentColor-dark">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}{" "}
                assignments
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-contentColor dark:text-contentColor-dark flex items-center">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-4 py-2 bg-primaryColor text-whiteColor rounded-md hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuizContainers;
