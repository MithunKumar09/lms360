/**
 * useCoursesList API Hook
 * 
 * React Query hook for fetching courses list for the public courses page.
 * Implements role-based query parameter building and response transformation.
 * Different from useCourseManagement which is for dashboard management pages.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildUrl } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import { buildRoleBasedListQueryParams } from '@/lib/course/queryBuilders.js';
import { transformCoursesForDisplay } from '@/lib/utils/courseUtils.js';

/**
 * useCoursesList Query Hook
 * 
 * Fetches courses for the public courses listing page based on user role.
 * Used on /courses page with filters, search, and pagination.
 * 
 * @param {Object} filters - Filter parameters
 * @param {number} filters.page - Page number (default: 1)
 * @param {number} filters.limit - Items per page (default: 12)
 * @param {string} filters.search - Search query
 * @param {string[]} filters.categoryIds - Category IDs to filter by
 * @param {string} filters.organizationId - Organization ID filter (superadmin only)
 * @param {string} filters.courseTypeId - Course type ID filter
 * @param {string} filters.tag - Tag filter
 * @param {string} filters.level - Course level filter
 * @param {string} filters.sortBy - Sort option ('newest' | 'oldest' | 'title_asc' | 'title_desc' | 'price_asc' | 'price_desc')
 * @param {Object} options - Query options
 * @returns {Object} Courses list query
 */
export const useCoursesList = (filters = {}, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  // PATCH B: stable primitives — avoid object-ref churn and enable hydration gate
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const userRole = useAuthStore((state) => state.user?.role ?? null);

  // Build role-based query parameters for list page
  const buildQueryParams = () => {
    try {
      return buildRoleBasedListQueryParams(filters, user);
    } catch (error) {
      console.error('Error building list query params:', error);
      // Fallback to basic params
      return {
        page: filters.page || 1,
        limit: filters.limit || 12,
        ...(filters.search && { search: filters.search }),
      };
    }
  };

  const queryParams = buildQueryParams();

  // Create stable query key for caching
  // Sort keys to ensure consistent cache keys
  const sortedParams = Object.keys(queryParams)
    .sort()
    .reduce((acc, key) => {
      acc[key] = queryParams[key];
      return acc;
    }, {});

  const queryKey = ['courses', 'list', user?.role || 'guest', sortedParams];

  return useQuery({
    queryKey,
    queryFn: async () => {
      // Prevent infinite loops - only fetch if query params are valid
      if (!queryParams || Object.keys(queryParams).length === 0) {
        console.warn('🔵 [CLIENT] [useCoursesList] Empty query params, skipping fetch');
        return {
          success: true,
          courses: [],
          pagination: {
            page: 1,
            limit: queryParams.limit || 12,
            totalItems: 0,
            totalPages: 0,
          },
        };
      }

      console.log('🔵 [CLIENT] [useCoursesList] ===== FETCH STARTED =====');
      console.log('🔵 [CLIENT] [useCoursesList] Query params:', queryParams);
      console.log('🔵 [CLIENT] [useCoursesList] User:', { id: user?.id, role: user?.role });
      
      const url = buildUrl(getEndpoint('courses.list'), {}, queryParams);
      console.log('🔵 [CLIENT] [useCoursesList] Request URL:', url);
      
      const response = await apiClient.get(url);

      console.log('🔵 [CLIENT] [useCoursesList] Raw response:', {
        success: response.success,
        error: response.error,
        coursesCount: response.courses?.length || 0,
        pagination: response.pagination,
      });

      if (!response.success) {
        console.error('🔵 [CLIENT] [useCoursesList] API returned error:', response.error);
        throw new Error(response.error || 'Failed to fetch courses');
      }

      // Transform courses to include calculated fields (lesson count, duration, etc.)
      try {
        const transformedCourses = transformCoursesForDisplay(response.courses || []);
        
        console.log('🔵 [CLIENT] [useCoursesList] Transformed response:', {
          coursesCount: transformedCourses.length,
          pagination: response.pagination,
        });
        console.log('🔵 [CLIENT] [useCoursesList] ===== FETCH SUCCESSFUL =====');
        
        return {
          ...response,
          courses: transformedCourses,
        };
      } catch (error) {
        console.error('🔵 [CLIENT] [useCoursesList] Error transforming response:', error);
        // Return original response if transformation fails
        return response;
      }
    },
    // PATCH B: gate on full hydration — role + id must both be present before firing.
    // Prevents the transient window (Zustand persist rehydrating from localStorage)
    // from triggering role-based query builders with an undefined/null user.
    enabled: !!userRole && !!userId && (options.enabled !== false),
    staleTime: options.staleTime ?? 2 * 60 * 1000, // 2 minutes - data is fresh for 2 minutes
    gcTime: options.gcTime ?? 5 * 60 * 1000, // 5 minutes - cache kept for 5 minutes after unused
    refetchOnWindowFocus: false, // Prevent infinite refetching on window focus
    refetchOnReconnect: true, // Refetch when network reconnects
    refetchOnMount: 'always', // Refetch when component mounts if data is stale
    refetchInterval: false, // No automatic polling
    // Keep previous data while refetching for smoother UX
    placeholderData: (previousData) => previousData,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (except 401)
      if (error?.status >= 400 && error?.status < 500 && error?.status !== 401) {
        return false;
      }
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    ...options,
  });
};

/**
 * useCourseFilters Query Hook
 * 
 * Fetches filter options (categories, organizations, course types, etc.)
 * for populating filter dropdowns.
 * 
 * @param {Object} options - Query options
 * @returns {Object} Filter options query
 */
export const useCourseFilters = (options = {}) => {
  const user = useAuthStore((state) => state.user);
  const isSuperadmin = user?.role === 'superadmin';

  // Fetch categories and skills from public endpoint
  const filtersQuery = useQuery({
    queryKey: ['courses', 'filters'],
    queryFn: async () => {
      const response = await apiClient.get('/courses/filters');
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch filters');
      }
      return {
        categories: response.categories || [],
        skills: response.skills || [],
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });

  // Fetch organizations (only for superadmin)
  const organizationsQuery = useQuery({
    queryKey: ['organizations', 'list'],
    queryFn: async () => {
      try {
      const response = await apiClient.get(getEndpoint('organizations.list'));
      return response.organizations || [];
      } catch (error) {
        // Gracefully handle access denied errors (expected for non-superadmin users)
        if (error.status === 403 || error.status === 401) {
          return [];
        }
        throw error;
      }
    },
    enabled: isSuperadmin && (options.enabled !== false),
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry on auth errors
    ...options,
  });

  // Fetch course types (instructors can now access this)
  const courseTypesQuery = useQuery({
    queryKey: ['course-settings', 'course-types', { status: 1 }],
    queryFn: async () => {
      try {
        const response = await apiClient.get(getEndpoint('courseSettings.courseTypes'), { status: 1 });
        // API returns { success: true, data: [...] }
        return response.data || response.types || [];
      } catch (error) {
        // Gracefully handle access denied errors
        if (error.status === 403 || error.status === 401) {
          console.warn('Course types access denied, returning empty array');
          return [];
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry on auth errors
    ...options,
  });

  // Fetch course levels (instructors can access this)
  const courseLevelsQuery = useQuery({
    queryKey: ['course-settings', 'course-levels', { status: 1 }],
    queryFn: async () => {
      try {
        const response = await apiClient.get(getEndpoint('courseSettings.courseLevels'), { status: 1 });
        // API returns { success: true, data: [...] }
        return response.data || response.levels || [];
      } catch (error) {
        // Gracefully handle access denied errors
        if (error.status === 403 || error.status === 401) {
          console.warn('Course levels access denied, returning empty array');
          return [];
        }
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false, // Don't retry on auth errors
    ...options,
  });

  return {
    categories: filtersQuery.data?.categories || [],
    skills: filtersQuery.data?.skills || [],
    organizations: organizationsQuery.data || [],
    courseTypes: courseTypesQuery.data || [],
    courseLevels: courseLevelsQuery.data || [],
    isLoading: filtersQuery.isLoading || organizationsQuery.isLoading || 
                courseTypesQuery.isLoading || courseLevelsQuery.isLoading,
    isError: filtersQuery.isError || organizationsQuery.isError || 
             courseTypesQuery.isError || courseLevelsQuery.isError,
    error: filtersQuery.error || organizationsQuery.error || 
           courseTypesQuery.error || courseLevelsQuery.error,
  };
};

export default useCoursesList;

