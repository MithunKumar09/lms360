/**
 * useCourseInquiries API Hook
 * 
 * React Query hooks for course inquiries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';

/**
 * useSubmitCourseInquiry Mutation Hook
 * 
 * Submits a course inquiry/contact form
 * 
 * @returns {Object} Submit inquiry mutation
 */
export const useSubmitCourseInquiry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, name, email, message }) => {
      if (!courseId) {
        throw new Error('Course ID is required');
      }
      if (!name || name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters');
      }
      if (!email || !/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
        throw new Error('Valid email is required');
      }
      if (!message || message.trim().length < 10) {
        throw new Error('Message must be at least 10 characters');
      }

      const url = `/courses/${courseId}/contact`;
      const response = await apiClient.post(url, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim()
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to submit inquiry');
      }
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate inquiries queries for this course (if admin)
      queryClient.invalidateQueries({ 
        queryKey: ['courseInquiries', variables.courseId] 
      });
    }
  });
};

/**
 * useCourseInquiries Query Hook
 * 
 * Fetches inquiries for a course (admin/superadmin only)
 * 
 * @param {string} courseId - Course ID
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status
 * @param {number} options.page - Page number
 * @param {number} options.limit - Inquiries per page
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Inquiries query
 */
export const useCourseInquiries = (courseId, options = {}) => {
  const { status = null, page = 1, limit = 20, enabled = true } = options;

  return useQuery({
    queryKey: ['courseInquiries', courseId, status, page, limit],
    queryFn: async () => {
      // If courseId is 'all' or null, fetch all inquiries
      let url;
      if (!courseId || courseId === 'all') {
        url = `/courses/inquiries?page=${page}&limit=${limit}`;
      } else {
        url = `/courses/${courseId}/inquiries?page=${page}&limit=${limit}`;
      }
      
      if (status) {
        url += `&status=${status}`;
      }
      
      const response = await apiClient.get(url);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch inquiries');
      }
      return response;
    },
    enabled: enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * useUpdateInquiryStatus Mutation Hook
 * 
 * Updates inquiry status (admin/superadmin only)
 * 
 * @returns {Object} Update status mutation
 */
export const useUpdateInquiryStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inquiryId, status }) => {
      if (!inquiryId || !status) {
        throw new Error('Inquiry ID and status are required');
      }

      const url = `/courses/inquiries/${inquiryId}`;
      const response = await apiClient.put(url, { status });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update inquiry status');
      }
      return response;
    },
    onSuccess: (data, variables) => {
      // Invalidate inquiries queries
      queryClient.invalidateQueries({ queryKey: ['courseInquiries'] });
    }
  });
};

/**
 * useDeleteInquiry Mutation Hook
 * 
 * Deletes an inquiry (admin/superadmin only)
 * 
 * @returns {Object} Delete inquiry mutation
 */
export const useDeleteInquiry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inquiryId) => {
      if (!inquiryId) {
        throw new Error('Inquiry ID is required');
      }

      const url = `/courses/inquiries/${inquiryId}`;
      const response = await apiClient.delete(url);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete inquiry');
      }
      return response;
    },
    onSuccess: () => {
      // Invalidate inquiries queries
      queryClient.invalidateQueries({ queryKey: ['courseInquiries'] });
    }
  });
};

