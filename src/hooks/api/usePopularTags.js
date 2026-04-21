/**
 * usePopularTags API Hook
 * 
 * React Query hook for fetching popular course tags
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';

/**
 * usePopularTags Query Hook
 * 
 * Fetches popular course tags
 * 
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of tags to fetch (default: 10)
 * @param {boolean} options.enabled - Whether query is enabled (default: true)
 * @returns {Object} Popular tags query
 */
export const usePopularTags = (options = {}) => {
  const { limit = 10, enabled = true } = options;

  return useQuery({
    queryKey: ['popularTags', limit],
    queryFn: async () => {
      const url = `/courses/tags/popular?limit=${limit}`;
      const response = await apiClient.get(url);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch popular tags');
      }
      return response;
    },
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes (tags don't change frequently)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

