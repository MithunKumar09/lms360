/**
 * useHomeBlogs API Hook
 * 
 * React Query hook for fetching blogs for the home page.
 * Fetches global published blogs only (public endpoint).
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint } from '@/lib/api/endpoints.js';

/**
 * useHomeBlogs Query Hook
 * 
 * Fetches global published blogs for home page display.
 * Public endpoint - no authentication required.
 * 
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of blogs to fetch (default: 3)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Home blogs query
 */
export const useHomeBlogs = (options = {}) => {
  const { limit = 3, enabled = true } = options;

  return useQuery({
    queryKey: ['blogs', 'home', { limit }],
    queryFn: async () => {
      console.log('🔵 [CLIENT] [useHomeBlogs] ===== FETCH STARTED =====');
      console.log('🔵 [CLIENT] [useHomeBlogs] Limit:', limit);

      const endpoint = getEndpoint('blogs.home');
      const url = `${endpoint}?limit=${limit}`;
      console.log('🔵 [CLIENT] [useHomeBlogs] Request URL:', url);

      const response = await apiClient.get(url);

      console.log('🔵 [CLIENT] [useHomeBlogs] Raw response:', {
        success: response.success,
        error: response.error,
        blogsCount: response.blogs?.length || 0,
      });

      if (!response.success) {
        console.error('🔴 [CLIENT] [useHomeBlogs] Request failed:', response.error);
        throw new Error(response.error || 'Failed to fetch blogs');
      }

      console.log('🟢 [CLIENT] [useHomeBlogs] ===== FETCH SUCCESSFUL =====');
      return {
        blogs: response.blogs || [],
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes - blogs don't change very frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 2,
  });
};

export default useHomeBlogs;
