'use client';

import { useState, useCallback } from 'react';
import CourseManagementHeader from '@/components/sections/course-management/CourseManagementHeader';
import CourseManagementFilters from '@/components/sections/course-management/CourseManagementFilters';
import CourseManagementTable from '@/components/sections/course-management/CourseManagementTable';
import CourseManagementPagination from '@/components/sections/course-management/CourseManagementPagination';
import CourseManagementBulkActions from '@/components/sections/course-management/CourseManagementBulkActions';
import CourseManagementSkeleton from '@/components/sections/course-management/CourseManagementSkeleton';
import { useCourseManagement } from '@/hooks/api/useCourses';
import { useAuthStore } from '@/store/index';

/**
 * Course Management Main Component
 * 
 * Main container component for course management page.
 * Handles data fetching, state management, and component orchestration.
 * 
 * @param {Object} props - Component props
 * @param {string} props.role - User role ('superadmin' | 'admin' | 'instructor')
 * @returns {JSX.Element} Course management page
 */
const CourseManagementMain = ({ role }) => {
  const user = useAuthStore((state) => state.user);
  
  // Filter state
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    search: '',
    instructorId: null,
    level: null,
    organizationId: null,
    classId: null,
    subjectId: null,
    status: null,
    sortBy: 'newest',
    dateFrom: null,
    dateTo: null,
  });

  // Selection state
  const [selectedCourses, setSelectedCourses] = useState([]);

  // Fetch courses based on role
  // Query parameters are now built automatically based on user role
  const { data, isLoading, error, refetch } = useCourseManagement(
    {
      ...filters,
      role, // Pass role explicitly for query key
    },
    {
      enabled: !!user, // Only fetch when user is available
    }
  );

  // Handle filter changes (memoized to prevent infinite loops)
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 })); // Reset to page 1 on filter change
    setSelectedCourses([]); // Clear selection on filter change
  }, []);

  // Handle page change
  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
    setSelectedCourses([]); // Clear selection on page change
  };

  // Handle selection change
  const handleSelectionChange = (courseIds) => {
    setSelectedCourses(courseIds);
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedCourses([]);
  };

  // Loading state
  if (isLoading) {
    return <CourseManagementSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="container pt-6 pb-100px">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                Error Loading Courses
              </h3>
              <p className="text-red-600 dark:text-red-300 mt-1">
                {error.message || 'Failed to load courses. Please try again.'}
              </p>
              <button
                onClick={() => refetch()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data?.courses || data.courses.length === 0) {
    // Check if filters are active
    const hasActiveFilters = filters.search || 
      filters.instructorId || 
      filters.level || 
      filters.organizationId || 
      filters.classId || 
      filters.subjectId || 
      filters.status || 
      filters.dateFrom || 
      filters.dateTo ||
      (filters.sortBy && filters.sortBy !== 'newest');

    return (
      <div className="container pb-100px">
        <CourseManagementHeader role={role} />
        <CourseManagementFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          activeFilterCount={hasActiveFilters ? Object.values(filters).filter(f => f !== null && f !== '' && f !== 1 && f !== 10 && f !== 'newest').length : 0}
        />
        <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-md p-12 text-center">
          <svg
            className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <h3 className="text-xl font-semibold text-contentColor dark:text-contentColor-dark mb-2">
            No Courses Found
          </h3>
          <p className="text-contentColor/70 dark:text-contentColor-dark/70">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results.'
              : 'No courses have been created yet.'}
          </p>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="course-management-container">
      <CourseManagementHeader role={role} />
      <CourseManagementFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />
      {selectedCourses.length > 0 && (
        <CourseManagementBulkActions
          selectedCourses={selectedCourses}
          onClearSelection={handleClearSelection}
          totalCourses={data?.pagination?.total || 0}
          currentPageCourseIds={data?.courses?.map((c) => c.id) || []}
          onSelectAll={(select) => {
            const currentPageIds = data?.courses?.map((c) => c.id) || [];
            if (select) {
              handleSelectionChange([...new Set([...selectedCourses, ...currentPageIds])]);
            } else {
              handleSelectionChange(selectedCourses.filter((id) => !currentPageIds.includes(id)));
            }
          }}
          allSelected={
            data?.courses?.length > 0 &&
            data.courses.every((course) => selectedCourses.includes(course.id))
          }
        />
      )}
      <CourseManagementTable
        courses={data?.courses || []}
        selectedCourses={selectedCourses}
        onSelectionChange={handleSelectionChange}
        role={role}
        currentPage={filters.page}
        totalCourses={data?.pagination?.total || 0}
      />
      <CourseManagementPagination
        pagination={data?.pagination}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default CourseManagementMain;

