/**
 * usePopularSearches Hook
 * 
 * React Query hook for fetching popular search terms.
 * Can be used to display trending or popular searches.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint } from '@/lib/api/endpoints.js';

/**
 * usePopularSearches Query Hook
 * 
 * Fetches popular search terms. Falls back to default popular searches
 * if API endpoint is not available.
 * 
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of popular searches to fetch
 * @returns {Object} Popular searches query
 */
export const usePopularSearches = (options = {}) => {
  const { limit = 10 } = options;

  // Default popular searches (can be replaced with API call)
  const defaultPopularSearches = [
    'JavaScript',
    'React',
    'Python',
    'Web Development',
    'Data Science',
    'Machine Learning',
    'UI/UX Design',
    'Full Stack',
    'Mobile Development',
    'Cloud Computing',
  ];

  return useQuery({
    queryKey: ['popular-searches', { limit }],
    queryFn: async () => {
      // Try to fetch from API if endpoint exists
      try {
        // Uncomment when API endpoint is ready:
        // const response = await apiClient.get(getEndpoint('courses.popularSearches'), {
        //   params: { limit },
        // });
        // return response.popularSearches || defaultPopularSearches.slice(0, limit);
        
        // For now, return default popular searches
        return {
          popularSearches: defaultPopularSearches.slice(0, limit),
          success: true,
        };
      } catch (error) {
        console.warn('Failed to fetch popular searches, using defaults:', error);
        return {
          popularSearches: defaultPopularSearches.slice(0, limit),
          success: false,
        };
      }
    },
    staleTime: 30 * 60 * 1000, // 30 minutes (popular searches don't change often)
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    ...options,
  });
};

export default usePopularSearches;



