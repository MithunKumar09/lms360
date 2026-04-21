/**
 * Placement Hooks
 * 
 * React Query hooks for placement and career readiness operations
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/index.js';

/**
 * Get placement readiness score
 */
export function usePlacementReadiness() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['placement-readiness'],
    queryFn: async () => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to view readiness score');
      }

      const response = await fetch('/api/placement/readiness');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get readiness score');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false
  });
}

/**
 * Get job/internship postings
 */
export function usePostings(filters = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { postingType, status, search, minReadinessScore, page, pageSize } = filters;

  return useQuery({
    queryKey: ['placement-postings', { postingType, status, search, minReadinessScore, page, pageSize }],
    queryFn: async () => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to view postings');
      }

      const params = new URLSearchParams();
      if (postingType) params.append('postingType', postingType);
      if (status) params.append('status', status);
      if (search) params.append('search', search);
      if (minReadinessScore) params.append('minReadinessScore', minReadinessScore);
      if (page) params.append('page', page);
      if (pageSize) params.append('pageSize', pageSize);

      const response = await fetch(`/api/placement/postings?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get postings');
      }

      const data = await response.json();
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000
  });
}

/**
 * Get posting details
 */
export function usePosting(postingId) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['placement-posting', postingId],
    queryFn: async () => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to view posting');
      }

      if (!postingId) return null;

      const response = await fetch(`/api/placement/postings/${postingId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get posting');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: isAuthenticated && !!postingId,
    staleTime: 30 * 1000
  });
}

/**
 * Get user applications
 */
export function useApplications(filters = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { status, postingType, page, pageSize } = filters;

  return useQuery({
    queryKey: ['placement-applications', { status, postingType, page, pageSize }],
    queryFn: async () => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to view applications');
      }

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (postingType) params.append('postingType', postingType);
      if (page) params.append('page', page);
      if (pageSize) params.append('pageSize', pageSize);

      const response = await fetch(`/api/placement/applications?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get applications');
      }

      const data = await response.json();
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000
  });
}

/**
 * Create application mutation
 */
export function useCreateApplication() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useMutation({
    mutationFn: async (applicationData) => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to apply');
      }

      const response = await fetch('/api/placement/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create application');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-applications'] });
      queryClient.invalidateQueries({ queryKey: ['placement-postings'] });
    },
  });
}

/**
 * Get application by ID
 */
export function useApplication(applicationId) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['placement-application', applicationId],
    queryFn: async () => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to view application');
      }

      if (!applicationId) return null;

      const response = await fetch(`/api/placement/applications/${applicationId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get application');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: isAuthenticated && !!applicationId,
    staleTime: 30 * 1000
  });
}

/**
 * Withdraw application mutation
 */
export function useWithdrawApplication() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useMutation({
    mutationFn: async (applicationId) => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to withdraw application');
      }

      const response = await fetch(`/api/placement/applications/${applicationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to withdraw application');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-applications'] });
      queryClient.invalidateQueries({ queryKey: ['placement-application'] });
    },
  });
}

/**
 * Get recruitment drives
 */
export function useDrives(filters = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { status, fromDate, toDate, page, pageSize } = filters;

  return useQuery({
    queryKey: ['placement-drives', { status, fromDate, toDate, page, pageSize }],
    queryFn: async () => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to view drives');
      }

      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (page) params.append('page', page);
      if (pageSize) params.append('pageSize', pageSize);

      const response = await fetch(`/api/placement/drives?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get drives');
      }

      const data = await response.json();
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000
  });
}

/**
 * Register for drive mutation
 */
export function useRegisterForDrive() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useMutation({
    mutationFn: async (driveId) => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to register for drive');
      }

      const response = await fetch(`/api/placement/drives/${driveId}/register`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to register for drive');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-drives'] });
    },
  });
}

/**
 * Get resume
 */
export function useResume() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['placement-resume'],
    queryFn: async () => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to view resume');
      }

      const response = await fetch('/api/placement/resume');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get resume');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000
  });
}

/**
 * Update resume mutation
 */
export function useUpdateResume() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useMutation({
    mutationFn: async (resumeData) => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to update resume');
      }

      const response = await fetch('/api/placement/resume', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resumeData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update resume');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-resume'] });
    },
  });
}

/**
 * Generate resume mutation
 */
export function useGenerateResume() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to generate resume');
      }

      const response = await fetch('/api/placement/resume/generate', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate resume');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-resume'] });
    },
  });
}

/**
 * Get portfolio
 */
export function usePortfolio() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['placement-portfolio'],
    queryFn: async () => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to view portfolio');
      }

      const response = await fetch('/api/placement/portfolio');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get portfolio');
      }

      const data = await response.json();
      return data.data;
    },
    enabled: isAuthenticated,
    staleTime: 30 * 1000
  });
}

/**
 * Update portfolio mutation
 */
export function useUpdatePortfolio() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useMutation({
    mutationFn: async (portfolioData) => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to update portfolio');
      }

      const response = await fetch('/api/placement/portfolio', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(portfolioData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update portfolio');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-portfolio'] });
    },
  });
}

/**
 * Generate portfolio mutation
 */
export function useGeneratePortfolio() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        throw new Error('You must be logged in to generate portfolio');
      }

      const response = await fetch('/api/placement/portfolio/generate', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate portfolio');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-portfolio'] });
    },
  });
}
