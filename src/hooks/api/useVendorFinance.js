/**
 * Vendor Finance API Hooks
 * 
 * React Query hooks for vendor finance operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useVendorFinance Query Hook
 * Fetches vendor finance data (statistics, balance, payments, payouts)
 */
export const useVendorFinance = (options = {}) => {
  const { type = 'all', page = 1, limit = 10, enabled = true } = options;
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['vendorFinance', type, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);

      const response = await apiClient.get(`/vendor/finance?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch vendor finance data');
      }

      return response;
    },
    enabled: enabled && user?.role === 'vendor',
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * useVendorStatistics Query Hook
 */
export const useVendorStatistics = (options = {}) => {
  const { enabled = true } = options;
  const { data, isLoading, error } = useVendorFinance({ type: 'statistics', enabled });

  return {
    data: data?.statistics ? { statistics: data.statistics } : null,
    isLoading,
    error,
  };
};

/**
 * useVendorBalance Query Hook
 */
export const useVendorBalance = (options = {}) => {
  const { enabled = true } = options;
  const { data, isLoading, error } = useVendorFinance({ type: 'balance', enabled });

  return {
    data: data?.balance ? { balance: data.balance } : null,
    isLoading,
    error,
  };
};

/**
 * useVendorPayments Query Hook
 */
export const useVendorPayments = (options = {}) => {
  const { page = 1, limit = 10, enabled = true } = options;
  const { data, isLoading, error } = useVendorFinance({ type: 'payments', page, limit, enabled });

  return {
    data: data?.payments || null,
    isLoading,
    error,
  };
};

/**
 * useVendorPayouts Query Hook
 */
export const useVendorPayouts = (options = {}) => {
  const { page = 1, limit = 10, enabled = true } = options;
  const { data, isLoading, error } = useVendorFinance({ type: 'payouts', page, limit, enabled });

  return {
    data: data?.payouts || null,
    isLoading,
    error,
  };
};

/**
 * useVendorBankDetails Query Hook
 * Fetches vendor bank account details
 */
export const useVendorBankDetails = (options = {}) => {
  const { enabled = true } = options;
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['vendorBankDetails'],
    queryFn: async () => {
      const response = await apiClient.get('/vendor/bank-details');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch bank details');
      }

      return response;
    },
    enabled: enabled && user?.role === 'vendor',
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * useUpdateVendorBankDetails Mutation Hook
 * Updates vendor bank account details
 */
export const useUpdateVendorBankDetails = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bankDetails) => {
      const response = await apiClient.put('/vendor/bank-details', bankDetails);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update bank details');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendorBankDetails']);
    },
  });
};

/**
 * useVendorEarnings Query Hook
 * Fetches vendor earnings data
 */
export const useVendorEarnings = (options = {}) => {
  const { enabled = true } = options;
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ['vendorEarnings'],
    queryFn: async () => {
      const response = await apiClient.get('/vendor/earnings');

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch earnings');
      }

      return response;
    },
    enabled: enabled && user?.role === 'vendor',
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * useWithdrawRequest Mutation Hook
 * Creates a withdrawal request
 */
export const useWithdrawRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/vendor/withdraw', data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create withdrawal request');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['vendorEarnings']);
      queryClient.invalidateQueries(['vendorFinance']);
      queryClient.invalidateQueries(['vendorBalance']);
    },
  });
};