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
    <div className="mb-30px rounded-3xl border border-borderColor bg-whiteColor p-5 shadow-sm dark:border-borderColor-dark dark:bg-whiteColor-dark md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 rounded-3xl border border-borderColor bg-gradient-to-r from-primaryColor/[0.04] to-transparent p-6 dark:border-borderColor-dark dark:from-primaryColor/[0.08] lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-blackColor dark:text-blackColor-dark">
            Assign Courses
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-contentColor dark:text-contentColor-dark">
            Assign existing courses to additional cohorts, classes, or subjects
          </p>
        </div>
        <button
          onClick={openReportModal}
          className="inline-flex items-center justify-center rounded-2xl bg-primaryColor px-5 py-3 text-sm font-semibold text-whiteColor shadow-lg shadow-primaryColor/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-primaryColor/90 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2"
          aria-label="View assignment report"
        >
          View Report
        </button>
      </div>

      {/* Filters */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
  <div className="rounded-2xl border border-borderColor bg-whiteColor p-5 shadow-sm dark:border-borderColor-dark dark:bg-whiteColor-dark">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-contentColor dark:text-contentColor-dark">
      Total Courses
    </p>
    <h3 className="mt-3 text-3xl font-bold text-blackColor dark:text-blackColor-dark">
      {pagination.total || courses.length || 0}
    </h3>
  </div>

  <div className="rounded-2xl border border-borderColor bg-whiteColor p-5 shadow-sm dark:border-borderColor-dark dark:bg-whiteColor-dark">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-contentColor dark:text-contentColor-dark">
      Cohorts
    </p>
    <h3 className="mt-3 text-3xl font-bold text-blackColor dark:text-blackColor-dark">
      {filterOptions.cohorts.length}
    </h3>
  </div>

  <div className="rounded-2xl border border-borderColor bg-whiteColor p-5 shadow-sm dark:border-borderColor-dark dark:bg-whiteColor-dark">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-contentColor dark:text-contentColor-dark">
      Subjects
    </p>
    <h3 className="mt-3 text-3xl font-bold text-blackColor dark:text-blackColor-dark">
      {filterOptions.subjects.length}
    </h3>
  </div>

  <div className="rounded-2xl border border-borderColor bg-whiteColor p-5 shadow-sm dark:border-borderColor-dark dark:bg-whiteColor-dark">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-contentColor dark:text-contentColor-dark">
      Instructors
    </p>
    <h3 className="mt-3 text-3xl font-bold text-blackColor dark:text-blackColor-dark">
      {filterOptions.instructors.length}
    </h3>
  </div>
</div>
      <div className="mb-8 rounded-3xl border border-borderColor bg-lightGrey4/40 p-5 transition-all duration-300 dark:border-borderColor-dark dark:bg-primaryColor/[0.03] md:p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {/* Cohort Filter */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-contentColor dark:text-contentColor-dark">
              Cohort
            </label>
            <select
              value={filters.cohortId || ''}
              onChange={(e) => handleFilterChange('cohortId', e.target.value || null)}
              className="h-12 w-full rounded-2xl border border-borderColor bg-whiteColor px-4 text-sm font-medium text-blackColor shadow-sm transition-all duration-300 focus:border-primaryColor focus:outline-none focus:ring-4 focus:ring-primaryColor/10 dark:border-borderColor-dark dark:bg-whiteColor-dark dark:text-blackColor-dark"
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
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-contentColor dark:text-contentColor-dark">
              Class
            </label>
            <select
              value={filters.classId || ''}
              onChange={(e) => handleFilterChange('classId', e.target.value || null)}
              className="h-12 w-full rounded-2xl border border-borderColor bg-whiteColor px-4 text-sm font-medium text-blackColor shadow-sm transition-all duration-300 focus:border-primaryColor focus:outline-none focus:ring-4 focus:ring-primaryColor/10 dark:border-borderColor-dark dark:bg-whiteColor-dark dark:text-blackColor-dark"
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
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-contentColor dark:text-contentColor-dark">
              Subject
            </label>
            <select
              value={filters.subjectId || ''}
              onChange={(e) => handleFilterChange('subjectId', e.target.value || null)}
              className="h-12 w-full rounded-2xl border border-borderColor bg-whiteColor px-4 text-sm font-medium text-blackColor shadow-sm transition-all duration-300 focus:border-primaryColor focus:outline-none focus:ring-4 focus:ring-primaryColor/10 dark:border-borderColor-dark dark:bg-whiteColor-dark dark:text-blackColor-dark"
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
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-contentColor dark:text-contentColor-dark">
              Instructor
            </label>
            <select
              value={filters.instructorId || ''}
              onChange={(e) => handleFilterChange('instructorId', e.target.value || null)}
              className="h-12 w-full rounded-2xl border border-borderColor bg-whiteColor px-4 text-sm font-medium text-blackColor shadow-sm transition-all duration-300 focus:border-primaryColor focus:outline-none focus:ring-4 focus:ring-primaryColor/10 dark:border-borderColor-dark dark:bg-whiteColor-dark dark:text-blackColor-dark"
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
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-contentColor dark:text-contentColor-dark">
              Created Date
            </label>
            <input
              type="date"
              value={filters.createdFrom || ''}
              onChange={(e) => handleFilterChange('createdFrom', e.target.value || null)}
              className="h-12 w-full rounded-2xl border border-borderColor bg-whiteColor px-4 text-sm font-medium text-blackColor shadow-sm transition-all duration-300 focus:border-primaryColor focus:outline-none focus:ring-4 focus:ring-primaryColor/10 dark:border-borderColor-dark dark:bg-whiteColor-dark dark:text-blackColor-dark"
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
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleClearFilters}
              className="rounded-2xl border border-borderColor bg-whiteColor px-5 py-2.5 text-sm font-medium text-contentColor shadow-sm transition-all duration-300 hover:border-primaryColor/20 hover:text-blackColor dark:border-borderColor-dark dark:bg-whiteColor-dark dark:text-contentColor-dark dark:hover:text-blackColor-dark"
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-5">
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
            <div className="space-y-5">
              {courses.map((course, idx) => (
                <div
                  key={course.id}
                  className="animate-fade-in rounded-3xl border border-transparent transition-all duration-300"
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
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-borderColor bg-lightGrey4/40 p-4 dark:border-borderColor-dark dark:bg-primaryColor/[0.03]">
              <button
                disabled={pagination.page === 1}
                className="rounded-2xl border border-borderColor bg-whiteColor px-5 py-2.5 text-sm font-semibold text-blackColor shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primaryColor/20 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-borderColor-dark dark:bg-whiteColor-dark dark:text-blackColor-dark"
                aria-label="Go to previous page"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-contentColor dark:text-contentColor-dark" aria-live="polite">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page === pagination.totalPages}
                className="rounded-2xl border border-borderColor bg-whiteColor px-5 py-2.5 text-sm font-semibold text-blackColor shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primaryColor/20 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-borderColor-dark dark:bg-whiteColor-dark dark:text-blackColor-dark"
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

