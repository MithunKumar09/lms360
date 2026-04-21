/**
 * useFilterCounts Hook
 * 
 * Hook to calculate and fetch filter counts for categories, organizations, etc.
 * Uses memoization to optimize performance.
 */

import { useMemo } from 'react';
import { useCoursesList } from './useCoursesList.js';
import { useAuthStore } from '@/store/index.js';

/**
 * Calculate filter counts from courses
 * 
 * @param {Array} courses - Array of courses
 * @returns {Object} Filter counts object
 */
export const calculateFilterCounts = (courses) => {
  if (!courses || !Array.isArray(courses)) {
    return {
      categories: {},
      organizations: {},
      courseTypes: {},
      tags: {},
      levels: {},
    };
  }

  const counts = {
    categories: {},
    organizations: {},
    courseTypes: {},
    tags: {},
    levels: {},
  };

  courses.forEach((course) => {
    // Count by category
    if (course.categoryName) {
      counts.categories[course.categoryName] = (counts.categories[course.categoryName] || 0) + 1;
    }

    // Count by organization
    if (course.organizationName) {
      counts.organizations[course.organizationName] = (counts.organizations[course.organizationName] || 0) + 1;
    }
    if (course.organizationId) {
      counts.organizations[course.organizationId] = (counts.organizations[course.organizationId] || 0) + 1;
    }

    // Count by course type
    if (course.courseTypeName) {
      counts.courseTypes[course.courseTypeName] = (counts.courseTypes[course.courseTypeName] || 0) + 1;
    }

    // Count by level (if available)
    if (course.levelName || course.level) {
      const levelName = course.levelName || course.level;
      counts.levels[levelName] = (counts.levels[levelName] || 0) + 1;
    }
  });

  return counts;
};

/**
 * useFilterCounts Hook
 * 
 * Fetches all courses without filters to calculate accurate filter counts.
 * Uses memoization to optimize performance.
 * 
 * @param {Object} baseFilters - Base filters (role, etc.) without category/org filters
 * @returns {Object} Filter counts for all filter types
 */
export const useFilterCounts = (baseFilters = {}) => {
  const user = useAuthStore((state) => state.user);
  
  // Fetch all courses without filter restrictions to get accurate counts
  // We exclude category/org filters but keep role-based filtering
  const countFilters = useMemo(() => {
    return {
      ...baseFilters,
      page: 1,
      limit: 1000, // Get a large set to calculate counts
      // Don't include category/org filters for count calculation
    };
  }, [baseFilters]);

  const { data: allCoursesData, isLoading } = useCoursesList(countFilters, {
    enabled: true,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const allCourses = allCoursesData?.courses || [];

  // Calculate counts from all courses
  const filterCounts = useMemo(() => {
    return calculateFilterCounts(allCourses);
  }, [allCourses]);

  return {
    counts: filterCounts,
    isLoading,
    totalCourses: allCourses.length,
  };
};

export default useFilterCounts;



