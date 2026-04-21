/**
 * Superadmin Finance API Hooks
 * 
 * React Query hooks for superadmin finance operations (balance, payments, settlements, payouts)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import { useAuthStore } from '@/store/index.js';

/**
 * useSuperadminBalance Query Hook
 */
export const useSuperadminBalance = (options = {}) => {
  const { includeHistory = false, enabled = true } = options;

  return useQuery({
    queryKey: ['superadminBalance', includeHistory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (includeHistory) params.append('includeHistory', 'true');

      const response = await apiClient.get(`/admin/finance/superadmin/balance?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch superadmin balance');
      }

      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * useSuperadminStatistics Query Hook
 */
export const useSuperadminStatistics = (options = {}) => {
  const { from, to, enabled = true } = options;

  return useQuery({
    queryKey: ['superadminStatistics', from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);

      const response = await apiClient.get(`/admin/finance/superadmin/statistics?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch superadmin statistics');
      }

      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * useSuperadminPayments Query Hook
 */
export const useSuperadminPayments = (options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['superadminPayments', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const response = await apiClient.get(`/admin/finance/superadmin/payments?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch superadmin payments');
      }

      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * useSuperadminSettlements Query Hook
 */
export const useSuperadminSettlements = (options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['superadminSettlements', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const response = await apiClient.get(`/admin/finance/superadmin/settlements?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch superadmin settlements');
      }

      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * useSuperadminPayouts Query Hook
 */
export const useSuperadminPayouts = (options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['superadminPayouts', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);

      const response = await apiClient.get(`/admin/finance/superadmin/payouts?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch superadmin payouts');
      }

      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * useRequestSuperadminPayout Mutation Hook
 */
export const useRequestSuperadminPayout = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ amount, currency = 'INR', mode = 'NEFT', referenceId }) => {
      const response = await apiClient.post('/admin/finance/superadmin/payouts', {
        amount,
        currency,
        mode,
        referenceId,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create payout request');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadminBalance'] });
      queryClient.invalidateQueries({ queryKey: ['superadminPayouts'] });
      createAlert('success', 'Payout request created successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to create payout request');
    },
  });
};

