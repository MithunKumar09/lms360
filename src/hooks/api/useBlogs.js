/**
 * useBlogs API Hook
 * 
 * React Query hook for fetching blogs list with filters and pagination.
 * Supports different scopes (global, organization, personal) based on user role.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildUrl } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useBlogs Query Hook
 * 
 * Fetches blogs list with filters and pagination.
 * Automatically determines scope based on user role.
 * 
 * @param {Object} options - Query options
 * @param {Object} options.filters - Filter parameters
 * @param {string} options.filters.scope - Blog scope ('global' | 'organization' | 'personal')
 * @param {string} options.filters.org_id - Organization ID (for org scope)
 * @param {string} options.filters.author_id - Author ID (for personal scope)
 * @param {string} options.filters.status - Status filter ('draft' | 'published' | 'archived')
 * @param {string} options.filters.search - Search query
 * @param {number} options.filters.page - Page number (default: 1)
 * @param {number} options.filters.limit - Items per page (default: 10)
 * @param {string} options.filters.sortBy - Sort field (default: 'created_at')
 * @param {string} options.filters.sortDir - Sort direction ('asc' | 'desc', default: 'desc')
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Blogs query
 */
export const useBlogs = (options = {}) => {
  const { filters = {}, enabled = true } = options;
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;

  // Build query parameters
  const queryParams = {
    page: filters.page || 1,
    limit: filters.limit || 10,
    sortBy: filters.sortBy || 'created_at',
    sortDir: filters.sortDir || 'desc',
  };

  // Add scope filter if provided
  if (filters.scope) {
    queryParams.scope = filters.scope;
  }

  // Add org_id filter if provided
  if (filters.org_id) {
    queryParams.org_id = filters.org_id;
  }

  // Add author_id filter if provided
  if (filters.author_id) {
    queryParams.author_id = filters.author_id;
  }

  // Add status filter if provided
  if (filters.status) {
    queryParams.status = filters.status;
  }

  // Add search filter if provided
  if (filters.search) {
    queryParams.search = filters.search;
  }

  const queryKey = ['blogs', 'list', queryParams];

  return useQuery({
    queryKey,
    queryFn: async () => {
      console.log('🔵 [CLIENT] [useBlogs] ===== FETCH STARTED =====');
      console.log('🔵 [CLIENT] [useBlogs] Query params:', queryParams);
      console.log('🔵 [CLIENT] [useBlogs] User:', { id: user?.id, role: userRole });
      
      const endpoint = getEndpoint('blogs.list');
      const url = buildUrl(endpoint, {}, queryParams);
      console.log('🔵 [CLIENT] [useBlogs] Request URL:', url);
      
      const response = await apiClient.get(url);

      console.log('🔵 [CLIENT] [useBlogs] Raw response:', {
        success: response.success,
        error: response.error,
        blogsCount: response.blogs?.length || 0,
        pagination: response.pagination,
      });

      if (!response.success) {
        console.error('🔴 [CLIENT] [useBlogs] API returned error:', response.error);
        throw new Error(response.error || 'Failed to fetch blogs');
      }

      console.log('🟢 [CLIENT] [useBlogs] ===== FETCH SUCCESSFUL =====');
      return {
        blogs: response.blogs || [],
        pagination: response.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };
    },
    enabled: isAuthenticated && enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes - data is fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes - cache kept for 5 minutes after unused
    refetchOnWindowFocus: false, // Prevent infinite refetching on window focus
    refetchOnReconnect: true, // Refetch when network reconnects
    refetchOnMount: true,
    retry: 2,
  });
};

export default useBlogs;
