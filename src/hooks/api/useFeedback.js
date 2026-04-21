/**
 * Feedback API Hooks
 * 
 * React Query hooks for feedback operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import useSweetAlert from '@/hooks/useSweetAlert.js';

/**
 * useFeedbacks Query Hook
 * 
 * Fetches list of feedbacks with filters and pagination.
 * 
 * @param {Object} options - Query options
 * @param {Object} options.filters - Filter options (status, category, role, from, to, q)
 * @param {Object} options.pagination - Pagination options (page, limit)
 * @param {Object} options.sort - Sort options (by, dir)
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Query result
 */
export function useFeedbacks(options = {}) {
	const { filters = {}, pagination = {}, sort = {}, enabled = true } = options;

	return useQuery({
		queryKey: ['feedbacks', filters, pagination, sort],
		queryFn: async () => {
			const params = new URLSearchParams();

			// Add pagination params
			if (pagination.page) params.append('page', pagination.page);
			if (pagination.limit) params.append('limit', pagination.limit);

			// Add filter params
			if (filters.status) params.append('status', filters.status);
			if (filters.category) params.append('category', filters.category);
			if (filters.role) params.append('role', filters.role);
			if (filters.from) params.append('from', filters.from);
			if (filters.to) params.append('to', filters.to);
			if (filters.q) params.append('q', filters.q);

			// Add sort params
			if (sort.by) params.append('sortBy', sort.by);
			if (sort.dir) params.append('sortDir', sort.dir);

			const response = await apiClient.get(`/feedback?${params.toString()}`);

			if (!response.success) {
				throw new Error(response.error || 'Failed to fetch feedbacks');
			}

			return response;
		},
		enabled,
		staleTime: 30 * 1000, // 30 seconds
	});
}

/**
 * useFeedback Query Hook
 * 
 * Fetches single feedback by ID.
 * 
 * @param {string} id - Feedback ID
 * @param {Object} options - Query options
 * @returns {Object} Query result
 */
export function useFeedback(id, options = {}) {
	return useQuery({
		queryKey: ['feedback', id],
		queryFn: async () => {
			const response = await apiClient.get(`/feedback/${id}`);

			if (!response.success) {
				throw new Error(response.error || 'Failed to fetch feedback');
			}

			return response;
		},
		enabled: !!id && (options.enabled !== false),
		staleTime: 30 * 1000, // 30 seconds
	});
}

/**
 * useCreateFeedback Mutation Hook
 * 
 * Creates new feedback submission.
 * 
 * @returns {Object} Create feedback mutation
 */
export function useCreateFeedback() {
	const queryClient = useQueryClient();
	const createAlert = useSweetAlert();

	return useMutation({
		mutationFn: async (data) => {
			const response = await apiClient.post('/feedback', data);

			if (!response.success) {
				throw new Error(response.error || 'Failed to submit feedback');
			}

			return response;
		},
		onSuccess: (data) => {
			// Invalidate feedbacks list
			queryClient.invalidateQueries({ queryKey: ['feedbacks'] });

			// Show success message
			createAlert('success', 'Thank you! Your feedback has been submitted successfully.');
		},
		onError: (error) => {
			console.error('Create feedback error:', error);
			createAlert('error', error.message || 'Failed to submit feedback. Please try again.');
		},
	});
}

/**
 * useUpdateFeedback Mutation Hook
 * 
 * Updates feedback (status, admin_notes) - superadmin only.
 * 
 * @returns {Object} Update feedback mutation
 */
export function useUpdateFeedback() {
	const queryClient = useQueryClient();
	const createAlert = useSweetAlert();

	return useMutation({
		mutationFn: async ({ id, ...updates }) => {
			const response = await apiClient.patch(`/feedback/${id}`, updates);

			if (!response.success) {
				throw new Error(response.error || 'Failed to update feedback');
			}

			return response;
		},
		onSuccess: (data, variables) => {
			// Invalidate feedbacks list and single feedback
			queryClient.invalidateQueries({ queryKey: ['feedbacks'] });
			queryClient.invalidateQueries({ queryKey: ['feedback', variables.id] });

			// Show success message
			createAlert('success', 'Feedback updated successfully.');
		},
		onError: (error) => {
			console.error('Update feedback error:', error);
			createAlert('error', error.message || 'Failed to update feedback. Please try again.');
		},
	});
}

