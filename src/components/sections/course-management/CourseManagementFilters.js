'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuthStore } from '@/store/index';
import InstructorSelector from '@/components/shared/forms/InstructorSelector';
import OrganizationSelector from '@/components/shared/forms/OrganizationSelector';
import ClassSelector from '@/components/shared/forms/ClassSelector';
import SubjectSelector from '@/components/shared/forms/SubjectSelector';
import CourseLevelSelector from '@/components/shared/forms/CourseLevelSelector';
import { useCourseLevels } from '@/hooks/api/useCourseSettings';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

/**
 * Course Management Filters Component
 * 
 * Advanced filter component with search, dropdowns, date range, and sort options.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.filters - Current filter state
 * @param {Function} props.onFiltersChange - Filter change handler
 * @returns {JSX.Element} Filters component
 */
const CourseManagementFilters = ({ filters, onFiltersChange }) => {
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const userId = user?.id;
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const debouncedSearch = useDebouncedValue(searchValue, 500);
  const prevDebouncedSearchRef = useRef(debouncedSearch);

  // Fetch current instructor's class IDs (only for instructor role)
  const { data: instructorClassesData } = useQuery({
    queryKey: ['instructor-classes', userId],
    queryFn: async () => {
      if (userRole !== 'instructor' || !userId) {
        return { classIds: [] };
      }
      try {
        const response = await apiClient.get('/instructor/classes', { instructorId: userId });
        return {
          classIds: response.classIds || [],
        };
      } catch (error) {
        console.error('Error fetching instructor classes:', error);
        return { classIds: [] };
      }
    },
    enabled: userRole === 'instructor' && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const instructorClassIds = instructorClassesData?.classIds || [];

  // Update search filter when debounced value changes
  useEffect(() => {
    // Only update if the debounced value actually changed (prevents infinite loop)
    if (debouncedSearch !== prevDebouncedSearchRef.current) {
      prevDebouncedSearchRef.current = debouncedSearch;
      onFiltersChange({ search: debouncedSearch || '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]); // onFiltersChange is memoized in parent with useCallback, so it's stable

  // Handle individual filter changes
  const handleFilterChange = useCallback((key, value) => {
    onFiltersChange({ [key]: value });
  }, [onFiltersChange]);

  // Clear all filters
  const handleClearFilters = () => {
    setSearchValue('');
    onFiltersChange({
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
  };

  // Count active filters
  const activeFilterCount = [
    filters.search,
    filters.instructorId,
    filters.level,
    filters.organizationId,
    filters.classId,
    filters.subjectId,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  // Get course levels for level filter
  const { data: levelsData } = useCourseLevels({ status: 1 });

  return (
    <div className="container mb-6">
      <div className="bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-md overflow-hidden">
        {/* Filter Header (Mobile Toggle) */}
        <div className="flex items-center justify-between p-4 border-b border-borderColor dark:border-borderColor-dark lg:border-b-0">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
              Filters
            </h3>
            {activeFilterCount > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-primaryColor text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </div>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="lg:hidden p-2 text-contentColor dark:text-contentColor-dark hover:text-primaryColor dark:hover:text-primaryColor transition-colors"
            aria-label="Toggle filters"
          >
            <svg
              className={`w-5 h-5 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Filter Content */}
        <div className={`${isFilterOpen ? 'block' : 'hidden lg:block'} p-4 lg:p-6`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {/* Search Input */}
            <div className="md:col-span-2 lg:col-span-3 xl:col-span-4">
              <label className="block text-sm font-medium text-contentColor dark:text-contentColor-dark mb-2">
                Search Courses
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Search by course title..."
                  className="w-full px-4 py-2.5 pr-10 bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-md text-contentColor dark:text-contentColor-dark placeholder:text-contentColor/50 dark:placeholder:text-contentColor-dark/50 focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-contentColor/50 dark:text-contentColor-dark/50">
                  <i className="icofont-search-1 text-lg"></i>
                </div>
              </div>
            </div>

            {/* Instructor Filter */}
            <div>
              <InstructorSelector
                value={filters.instructorId ? [filters.instructorId] : []}
                onChange={(selected) => {
                  handleFilterChange('instructorId', selected.length > 0 ? selected[0] : null);
                }}
                label="Instructor"
                placeholder="All Instructors"
                organizationId={filters.organizationId}
                classIds={userRole === 'instructor' ? instructorClassIds : undefined}
              />
            </div>

            {/* Level Filter */}
            <div>
              <CourseLevelSelector
                value={filters.level}
                onChange={(value) => handleFilterChange('level', value)}
                label="Course Level"
                placeholder="All Levels"
              />
            </div>

            {/* Organization Filter (Superadmin only) */}
            {user?.role === 'superadmin' && (
              <div>
                <OrganizationSelector
                  value={filters.organizationId}
                  onChange={(value) => handleFilterChange('organizationId', value)}
                  label="Organization"
                  placeholder="All Organizations"
                />
              </div>
            )}

            {/* Class Filter */}
            <div>
              <ClassSelector
                value={filters.classId ? [filters.classId] : []}
                onChange={(selected) => {
                  handleFilterChange('classId', selected.length > 0 ? selected[0] : null);
                  // Clear subject if class changes
                  if (selected.length === 0) {
                    handleFilterChange('subjectId', null);
                  }
                }}
                label="Class"
                placeholder="All Classes"
                organizationId={filters.organizationId}
                instructorIds={userRole === 'instructor' ? (userId ? [userId] : []) : undefined}
              />
            </div>

            {/* Subject Filter */}
            <div>
              <SubjectSelector
                classIds={filters.classId ? [filters.classId] : []}
                value={filters.subjectId ? [filters.subjectId] : []}
                onChange={(selected) => {
                  handleFilterChange('subjectId', selected.length > 0 ? selected[0] : null);
                }}
                label="Subject"
                placeholder="All Subjects"
                organizationId={filters.organizationId}
                disabled={!filters.classId}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-contentColor dark:text-contentColor-dark mb-2">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || null)}
                className="w-full px-4 py-2.5 bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-md text-contentColor dark:text-contentColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent transition-all appearance-none relative"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Sort By Filter */}
            <div>
              <label className="block text-sm font-medium text-contentColor dark:text-contentColor-dark mb-2">
                Sort By
              </label>
              <select
                value={filters.sortBy || 'newest'}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-4 py-2.5 bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-md text-contentColor dark:text-contentColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent transition-all appearance-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title_asc">Title A-Z</option>
                <option value="title_desc">Title Z-A</option>
              </select>
            </div>

            {/* Date Range Filters */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-contentColor dark:text-contentColor-dark mb-2">
                Created Date Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value || null)}
                    className="w-full px-4 py-2.5 bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-md text-contentColor dark:text-contentColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent transition-all"
                  />
                  <span className="text-xs text-contentColor/70 dark:text-contentColor-dark/70 mt-1 block">From</span>
                </div>
                <div>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value || null)}
                    min={filters.dateFrom || undefined}
                    className="w-full px-4 py-2.5 bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-md text-contentColor dark:text-contentColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent transition-all"
                  />
                  <span className="text-xs text-contentColor/70 dark:text-contentColor-dark/70 mt-1 block">To</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-borderColor dark:border-borderColor-dark">
            <button
              onClick={handleClearFilters}
              disabled={activeFilterCount === 0}
              className="px-4 py-2 text-sm font-medium text-contentColor dark:text-contentColor-dark hover:text-primaryColor dark:hover:text-primaryColor disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear All Filters
            </button>
            {activeFilterCount > 0 && (
              <span className="text-sm text-contentColor/70 dark:text-contentColor-dark/70">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseManagementFilters;
