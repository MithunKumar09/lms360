/**
 * useBlog API Hook
 * 
 * React Query hook for fetching a single blog by ID or slug.
 * Used for blog details pages.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { buildEndpoint, getEndpoint } from '@/lib/api/endpoints.js';

/**
 * useBlog Query Hook
 * 
 * Fetches blog details by ID or slug including all related data.
 * 
 * @param {string} blogId - Blog UUID or slug
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Blog details query
 */
export const useBlog = (blogId, options = {}) => {
  return useQuery({
    queryKey: ['blog', 'details', blogId],
    queryFn: async () => {
      if (!blogId) {
        throw new Error('Blog ID or slug is required');
      }

      const endpoint = buildEndpoint(getEndpoint('blogs.get'), { id: blogId });
      const response = await apiClient.get(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch blog details');
      }

      return response.blog;
    },
    enabled: !!blogId && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry on 404 (blog not found) or 403 (permission denied)
      if (error?.status === 404 || error?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

export default useBlog;
