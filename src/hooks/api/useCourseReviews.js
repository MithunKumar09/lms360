/**
 * useCourseReviews API Hook
 * 
 * React Query hook for fetching and managing course reviews
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';

/**
 * useCourseReviews Query Hook
 * 
 * Fetches reviews for a course with pagination
 * 
 * @param {string} courseId - Course ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Reviews per page (default: 10)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Reviews query
 */
export const useCourseReviews = (courseId, options = {}) => {
  const { page = 1, limit = 10, enabled = true } = options;

  return useQuery({
    queryKey: ['courseReviews', courseId, page, limit],
    queryFn: async () => {
      if (!courseId) {
        throw new Error('Course ID is required to fetch reviews');
      }
      const url = `/courses/${courseId}/reviews?page=${page}&limit=${limit}`;
      const response = await apiClient.get(url);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch course reviews');
      }
      return response;
    },
    enabled: enabled && !!courseId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * useCreateCourseReview Mutation Hook
 * 
 * Creates a new review for a course
 * 
 * @returns {Object} Create review mutation
 */
export const useCreateCourseReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, rating, reviewText }) => {
      if (!courseId) {
        throw new Error('Course ID is required');
      }
      if (!rating || rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const url = `/courses/${courseId}/reviews`;
      const response = await apiClient.post(url, {
        rating,
        reviewText: reviewText || null
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create review');
      }
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate reviews queries for this course
      queryClient.invalidateQueries({ queryKey: ['courseReviews', variables.courseId] });
      // Also invalidate course details to update rating stats
      queryClient.invalidateQueries({ queryKey: ['courseDetails', variables.courseId] });
    }
  });
};

