/**
 * useInstructorReviews API Hook
 * 
 * React Query hooks for fetching and managing instructor reviews
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';

/**
 * useInstructorReviews Query Hook
 * 
 * Fetches reviews for an instructor with pagination
 * 
 * @param {string} instructorId - Instructor ID
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Reviews per page (default: 10)
 * @param {number|null} options.rating - Filter by rating (optional)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Reviews query
 */
export const useInstructorReviews = (instructorId, options = {}) => {
  const { page = 1, limit = 10, rating = null, enabled = true } = options;

  return useQuery({
    queryKey: ['instructorReviews', instructorId, page, limit, rating],
    queryFn: async () => {
      if (!instructorId) {
        throw new Error('Instructor ID is required to fetch reviews');
      }
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      
      if (rating !== null) {
        params.append('rating', rating.toString());
      }
      
      const url = `/instructors/${instructorId}/reviews?${params.toString()}`;
      const response = await apiClient.get(url);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch instructor reviews');
      }
      return response;
    },
    enabled: enabled && !!instructorId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2, // Retry failed requests 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

/**
 * useInstructorReviewStats Query Hook
 * 
 * Fetches review statistics for an instructor (average rating, total count, distribution)
 * 
 * @param {string} instructorId - Instructor ID
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Review statistics query
 */
export const useInstructorReviewStats = (instructorId, options = {}) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['instructorReviewStats', instructorId],
    queryFn: async () => {
      if (!instructorId) {
        throw new Error('Instructor ID is required to fetch review statistics');
      }
      
      const url = `/instructors/${instructorId}/reviews/statistics`;
      const response = await apiClient.get(url);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch instructor review statistics');
      }
      return response.statistics;
    },
    enabled: enabled && !!instructorId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2, // Retry failed requests 2 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

/**
 * useCreateInstructorReview Mutation Hook
 * 
 * Creates or updates a review for an instructor
 * 
 * @returns {Object} Create review mutation
 */
export const useCreateInstructorReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ instructorId, rating, feedbackText }) => {
      if (!instructorId) {
        throw new Error('Instructor ID is required');
      }
      if (!rating || rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      const url = `/instructors/${instructorId}/reviews`;
      const response = await apiClient.post(url, {
        rating,
        feedbackText: feedbackText || null
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create/update review');
      }
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate reviews queries for this instructor
      queryClient.invalidateQueries({ queryKey: ['instructorReviews', variables.instructorId] });
      queryClient.invalidateQueries({ queryKey: ['instructorReviewStats', variables.instructorId] });
    }
  });
};

/**
 * useStudentReviewForInstructor Query Hook
 * 
 * Gets the current student's review for a specific instructor
 * 
 * @param {string} instructorId - Instructor ID
 * @param {string} studentId - Student ID (optional, will use current user if not provided)
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Student review query
 */
export const useStudentReviewForInstructor = (instructorId, studentId = null, options = {}) => {
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['studentReviewForInstructor', instructorId, studentId],
    queryFn: async () => {
      if (!instructorId) {
        throw new Error('Instructor ID is required');
      }
      
      // Get all reviews and filter client-side for the student
      // (API doesn't have a specific endpoint for this, but we can filter from the list)
      const url = `/instructors/${instructorId}/reviews?limit=100`;
      const response = await apiClient.get(url);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch reviews');
      }
      
      // If studentId is provided, find their review
      if (studentId && response.reviews) {
        const studentReview = response.reviews.find(review => review.studentId === studentId);
        return studentReview || null;
      }
      
      return null;
    },
    enabled: enabled && !!instructorId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 1, // Retry once for student review check
    retryDelay: 1000,
  });
};

export default {
  useInstructorReviews,
  useInstructorReviewStats,
  useCreateInstructorReview,
  useStudentReviewForInstructor
};
