/**
 * Finance API Hooks
 * 
 * React Query hooks for finance operations (settlements, payouts, payment splits, etc.)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useSettlements Query Hook
 */
export const useSettlements = (options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['settlements', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);

      const response = await apiClient.get(`/admin/finance/settlements?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch settlements');
      }

      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * usePaymentSplits Query Hook
 */
export const usePaymentSplits = (options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['paymentSplits', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.settlementId) params.append('settlementId', filters.settlementId);

      const response = await apiClient.get(`/admin/finance/payment-splits?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch payment splits');
      }

      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * usePayouts Query Hook
 */
export const usePayouts = (options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['payouts', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.vendorId) params.append('vendorId', filters.vendorId);

      const response = await apiClient.get(`/admin/finance/payouts?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch payouts');
      }

      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * useVendorKYC Query Hook
 */
export const useVendorKYC = (options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['vendorKYC', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.kycStatus) params.append('kycStatus', filters.kycStatus);

      const response = await apiClient.get(`/admin/finance/vendor-kyc?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch vendor KYC');
      }

      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
};

/**
 * useWebhookLogs Query Hook
 */
export const useWebhookLogs = (options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['webhookLogs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.eventType) params.append('eventType', filters.eventType);
      if (filters.search) params.append('search', filters.search);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await apiClient.get(`/admin/finance/webhook-logs?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch webhook logs');
      }

      return response;
    },
    enabled,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * useProcessPayout Mutation Hook
 */
export const useProcessPayout = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ payoutId, action }) => {
      const response = await apiClient.post('/admin/finance/payouts', {
        payoutId,
        action,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to process payout');
      }

      return response;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payouts'] });
      createAlert('success', `Payout ${variables.action}ed successfully`);
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to process payout');
    },
  });
};

/**
 * useUpdateVendorKYC Mutation Hook
 */
export const useUpdateVendorKYC = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async ({ vendorAccountId, kycStatus, rejectionReason }) => {
      const response = await apiClient.patch('/admin/finance/vendor-kyc', {
        vendorAccountId,
        kycStatus,
        rejectionReason,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to update KYC status');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorKYC'] });
      createAlert('success', 'KYC status updated successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to update KYC status');
    },
  });
};

/**
 * useReplayWebhook Mutation Hook
 */
export const useReplayWebhook = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (webhookLogId) => {
      const response = await apiClient.post('/admin/finance/webhook-logs', {
        webhookLogId,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to replay webhook');
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhookLogs'] });
      createAlert('success', 'Webhook replayed successfully');
    },
    onError: (error) => {
      createAlert('error', error.message || 'Failed to replay webhook');
    },
  });
};

/**
 * useFinanceStatistics Query Hook
 */
export const useFinanceStatistics = (options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['financeStatistics', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);

      const response = await apiClient.get(`/admin/finance/statistics?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch finance statistics');
      }

      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * useOrders Query Hook
 */
export const useOrders = (options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      if (filters.itemType) params.append('itemType', filters.itemType);
      if (filters.userId) params.append('userId', filters.userId);

      const response = await apiClient.get(`/admin/finance/orders?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch orders');
      }

      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * useTransactions Query Hook
 */
export const useTransactions = (options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.status) params.append('status', filters.status);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);
      if (filters.method) params.append('method', filters.method);
      if (filters.userId) params.append('userId', filters.userId);

      const response = await apiClient.get(`/admin/finance/transactions?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transactions');
      }

      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * useRevenue Query Hook
 */
export const useRevenue = (options = {}) => {
  const { filters = {}, enabled = true } = options;

  return useQuery({
    queryKey: ['revenue', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.period) params.append('period', filters.period);
      if (filters.groupBy) params.append('groupBy', filters.groupBy);
      if (filters.fromDate) params.append('fromDate', filters.fromDate);
      if (filters.toDate) params.append('toDate', filters.toDate);

      const response = await apiClient.get(`/admin/finance/revenue?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch revenue analytics');
      }

      return response;
    },
    enabled,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

