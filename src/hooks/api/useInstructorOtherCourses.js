/**
 * useInstructorOtherCourses API Hook
 * 
 * React Query hook for fetching other courses by the same instructor(s).
 * Used for "Author More Courses" section on course details page.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';

/**
 * useInstructorOtherCourses Query Hook
 * 
 * Fetches courses by instructor IDs, excluding the current course.
 * 
 * @param {string[]} instructorIds - Array of instructor UUIDs
 * @param {string} excludeCourseId - Current course ID to exclude
 * @param {Object} options - Query options
 * @returns {Object} Courses query
 */
export const useInstructorOtherCourses = (instructorIds = [], excludeCourseId = null, options = {}) => {
  return useQuery({
    queryKey: ['instructor-other-courses', instructorIds.sort().join(','), excludeCourseId],
    queryFn: async () => {
      if (!instructorIds || instructorIds.length === 0) {
        return { courses: [], total: 0 };
      }

      // Build query params with instructor filter
      // Note: API already filters by published status by default
      const params = new URLSearchParams({
        page: '1',
        limit: '12', // Get up to 12 courses
        instructorIds: instructorIds.join(','), // Filter by instructor IDs
      });
      
      const response = await apiClient.get(`/courses?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch instructor courses');
      }

      // Get courses from response
      let courses = response.courses || [];

      // Exclude current course
      if (excludeCourseId) {
        courses = courses.filter(course => course.id !== excludeCourseId);
      }

      // Limit to 6 courses for the slider
      courses = courses.slice(0, 6);

      return {
        courses,
        total: courses.length,
      };
    },
    enabled: instructorIds.length > 0 && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
};

export default useInstructorOtherCourses;

