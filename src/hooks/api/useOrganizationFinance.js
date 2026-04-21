/**
 * Organization Finance API Hooks
 * 
 * React Query hooks for organization finance operations (balance, payments, settlements, payouts)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import { useAuthStore } from '@/store/index.js';

/**
 * useOrganizationBalance Query Hook
 */
export const useOrganizationBalance = (orgId, options = {}) => {
  const { includeHistory = false, enabled = true } = options;

  return useQuery({
    queryKey: ['organizationBalance', orgId, includeHistory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (includeHistory) params.append('includeHistory', 'true');

      const response = await apiClient.get(`/organizations/${orgId}/finance/balance?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch organization balance');
      }

      return response;
    },
    enabled: enabled && !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * useOrganizationStatistics Query Hook
 */
export const useOrganizationStatistics = (orgId, options = {}) => {
  const { from, to, enabled = true } = options;

  return useQuery({
    queryKey: ['organizationStatistics', orgId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);

      const response = await apiClient.get(`/organizations/${orgId}/finance/statistics?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch organization statistics');
      }

      return response;
    },
    enabled: enabled && !!orgId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * useOrganizationPayments Query Hook
 */
export const useOrganizationPayments = (orgId, options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['organizationPayments', orgId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const response = await apiClient.get(`/organizations/${orgId}/finance/payments?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch organization payments');
      }

      return response;
    },
    enabled: enabled && !!orgId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * useOrganizationSettlements Query Hook
 */
export const useOrganizationSettlements = (orgId, options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['organizationSettlements', orgId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.from) params.append('from', filters.from);
      if (filters.to) params.append('to', filters.to);

      const response = await apiClient.get(`/organizations/${orgId}/finance/settlements?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch organization settlements');
      }

      return response;
    },
    enabled: enabled && !!orgId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * useOrganizationPayouts Query Hook
 */
export const useOrganizationPayouts = (orgId, options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['organizationPayouts', orgId, filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);

      const response = await apiClient.get(`/organizations/${orgId}/finance/payouts?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch organization payouts');
      }

      return response;
    },
    enabled: enabled && !!orgId,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * useRequestOrganizationPayout Mutation Hook
 */
export const useRequestOrganizationPayout = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const user = useAuthStore((state) => state.user);
  const orgId = user?.orgId;

  return useMutation({
    mutationFn: async ({ amount, currency = 'INR', mode = 'NEFT', referenceId }) => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      const response = await apiClient.post(`/organizations/${orgId}/finance/payouts`, {
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
      queryClient.invalidateQueries({ queryKey: ['organizationBalance', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organizationPayouts', orgId] });
      createAlert('success', 'Payout request created successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to create payout request');
    },
  });
};

