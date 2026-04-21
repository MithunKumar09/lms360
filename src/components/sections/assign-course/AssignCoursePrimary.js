/**
 * Assign Course Primary Component
 * 
 * Main component for the Assign Course feature.
 * Displays course listing with filters, expandable cards, and report functionality.
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuthStore } from '@/store/index.js';
import useAssignCourseStore from '@/store/assignCourseStore.js';
import { useAssignableCourses } from '@/hooks/api/useAssignableCourses.js';
import CourseCard from './CourseCard.js';
import CourseCardSkeleton from './CourseCardSkeleton.js';
import AssignModal from './AssignModal.js';
import ReportModal from './ReportModal.js';
import ErrorDisplay from '@/components/shared/errors/ErrorDisplay.js';
import NoData from '@/components/shared/others/NoData.js';

const AssignCoursePrimary = () => {
  const user = useAuthStore((state) => state.user);
  const filters = useAssignCourseStore((state) => state.filters);
  const openReportModal = useAssignCourseStore((state) => state.openReportModal);
  const setFilter = useAssignCourseStore((state) => state.setFilter);
  const clearFilters = useAssignCourseStore((state) => state.clearFilters);

  // Fetch assignable courses
  const {
    data: coursesData,
    isLoading,
    isError,
    error,
    refetch,
  } = useAssignableCourses();

  const courses = coursesData?.courses || [];
  const pagination = coursesData?.pagination || {};

  // Note: Debouncing is handled at the API level via React Query's staleTime
  // Date inputs don't need debouncing as they only trigger on change

  // Memoize filter options extraction (expensive operation)
  const filterOptions = useMemo(() => {
    if (courses.length === 0) {
      return {
        cohorts: [],
        classes: [],
        subjects: [],
        instructors: [],
      };
    }

    const uniqueCohorts = new Set();
    const uniqueClasses = new Set();
    const uniqueSubjects = new Set();
    const uniqueInstructors = new Map(); // Use Map to avoid duplicates by ID

    courses.forEach((course) => {
      course.cohorts?.forEach((c) => uniqueCohorts.add(c));
      course.classes?.forEach((c) => uniqueClasses.add(c));
      course.subjects?.forEach((s) => uniqueSubjects.add(s));
      if (course.instructor?.id && course.instructor?.name) {
        uniqueInstructors.set(course.instructor.id, {
          id: course.instructor.id,
          name: course.instructor.name,
        });
      }
    });

    return {
      cohorts: Array.from(uniqueCohorts).sort(),
      classes: Array.from(uniqueClasses).sort(),
      subjects: Array.from(uniqueSubjects).sort(),
      instructors: Array.from(uniqueInstructors.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    };
  }, [courses]);

  // Memoize handlers to prevent unnecessary re-renders
  const handleFilterChange = useCallback(
    (key, value) => {
      setFilter(key, value);
    },
    [setFilter]
  );

  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);


  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      {/* Header */}
      <div className="mb-6 pb-5 border-b-2 border-borderColor dark:border-borderColor-dark flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            Assign Courses
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Assign existing courses to additional cohorts, classes, or subjects
          </p>
        </div>
        <button
          onClick={openReportModal}
          className="px-4 py-2 bg-primaryColor text-whiteColor rounded hover:bg-primaryColor/90 transition-all duration-200 text-sm font-medium transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2"
          aria-label="View assignment report"
        >
          View Report
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg transition-all duration-300">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Cohort Filter */}
          <div>
            <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
              Cohort
            </label>
            <select
              value={filters.cohortId || ''}
              onChange={(e) => handleFilterChange('cohortId', e.target.value || null)}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-primaryColor"
              aria-label="Filter by cohort"
            >
              <option value="">All Cohorts</option>
              {filterOptions.cohorts.map((cohort, idx) => (
                <option key={idx} value={cohort}>
                  {cohort}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
              Class
            </label>
            <select
              value={filters.classId || ''}
              onChange={(e) => handleFilterChange('classId', e.target.value || null)}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            >
              <option value="">All Classes</option>
              {filterOptions.classes.map((cls, idx) => (
                <option key={idx} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
              Subject
            </label>
            <select
              value={filters.subjectId || ''}
              onChange={(e) => handleFilterChange('subjectId', e.target.value || null)}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            >
              <option value="">All Subjects</option>
              {filterOptions.subjects.map((subject, idx) => (
                <option key={idx} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Instructor Filter */}
          <div>
            <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
              Instructor
            </label>
            <select
              value={filters.instructorId || ''}
              onChange={(e) => handleFilterChange('instructorId', e.target.value || null)}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark"
            >
              <option value="">All Instructors</option>
              {filterOptions.instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2">
              Created Date
            </label>
            <input
              type="date"
              value={filters.createdFrom || ''}
              onChange={(e) => handleFilterChange('createdFrom', e.target.value || null)}
              className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-primaryColor"
              placeholder="From Date"
              aria-label="Filter by created date from"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
          {(filters.cohortId ||
          filters.classId ||
          filters.subjectId ||
          filters.instructorId ||
          filters.createdFrom ||
          filters.createdTo) && (
          <div className="mt-4">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blackColor dark:hover:text-blackColor-dark transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2 rounded"
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <CourseCardSkeleton key={idx} />
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <ErrorDisplay
          error={error}
          type="inline"
          onRetry={refetch}
        />
      )}

      {/* Course Listing */}
      {!isLoading && !isError && (
        <>
          {courses.length === 0 ? (
            <NoData message="No courses found. Try adjusting your filters." />
          ) : (
            <div className="space-y-4">
              {courses.map((course, idx) => (
                <div
                  key={course.id}
                  className="animate-fade-in"
                  style={{
                    animationDelay: `${idx * 0.1}s`,
                    animationFillMode: 'both',
                  }}
                >
                  <CourseCard course={course} />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center gap-2">
              <button
                disabled={pagination.page === 1}
                className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2"
                aria-label="Go to previous page"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400" aria-live="polite">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page === pagination.totalPages}
                className="px-4 py-2 border border-borderColor dark:border-borderColor-dark rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2"
                aria-label="Go to next page"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <AssignModal />
      <ReportModal />
    </div>
  );
};

export default AssignCoursePrimary;

