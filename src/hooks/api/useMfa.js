/**
 * useMfa API Hooks
 * 
 * React Query hooks for MFA operations.
 * Provides queries and mutations for MFA setup, verification, and backup codes.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { getDashboardPath } from '@/lib/auth/roles.js';

/**
 * useMfaSetup Query Hook
 * 
 * Fetches MFA setup data (QR code, secret, etc.).
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @param {string} options.email - Email for email-based setup (when no session available)
 * @returns {Object} MFA setup query
 */
export const useMfaSetup = (options = {}) => {
  return useQuery({
    queryKey: ['mfa', 'setup', options.email],
    queryFn: async () => {
      // Build URL with email parameter if provided
      // Get endpoint path (relative, not full URL)
      const endpoint = getEndpoint('mfa.setup');
      
      // Build query parameters
      const params = {};
      if (options.email) {
        params.email = options.email;
      }
      
      // Use apiClient.get() which handles query params correctly
      const response = await apiClient.get(endpoint, params);

      if (!response.success) {
        throw new Error(response.error || 'Failed to get MFA setup');
      }

      // Return response data (response already has data spread by API client)
      return response;
    },
    enabled: options.enabled !== false,
    staleTime: 0, // Always fetch fresh data for MFA setup
    gcTime: 0, // Don't cache MFA setup data
    retry: false, // Don't retry MFA setup queries
  });
};

/**
 * useVerifyMfaSetup Mutation Hook
 * 
 * Verifies MFA setup with TOTP code.
 * 
 * @returns {Object} Verify MFA setup mutation
 */
export const useVerifyMfaSetup = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: async ({ code, email }) => {
      console.log('🔐 [MFA VERIFY SETUP HOOK] Verifying MFA setup...', {
        codeLength: code?.length,
        email: email ? 'Present' : 'Missing'
      });
      
      const requestBody = { code };
      // Include email if provided (for initial setup when no session exists)
      if (email) {
        requestBody.email = email;
      }
      
      const response = await apiClient.post(getEndpoint('mfa.verifySetup'), requestBody);

      if (!response.success) {
        throw new Error(response.error || 'Failed to verify MFA setup');
      }

      // Return response data (backupCodes, success, etc.)
      return response;
    },
    onSuccess: (data) => {
      // Update auth store with session tokens if provided
      // This ensures user is logged in after MFA setup
      if (data.success && data.user && data.sessionToken) {
        login(
          data.user,
          data.sessionToken || null,
          data.refreshToken || null,
          data.expiresAt ? new Date(data.expiresAt) : null
        );
      }

      // Invalidate MFA setup query
      queryClient.invalidateQueries({ queryKey: ['mfa', 'setup'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.refetchQueries({ queryKey: ['user'] });

      // Show success message
      createAlert('success', 'MFA setup completed successfully');

      return data;
    },
    onError: (error) => {
      console.error('Verify MFA setup error:', error);
      createAlert('error', error.message || 'Failed to verify MFA setup');
    },
  });
};

/**
 * useVerifyMfa Mutation Hook
 * 
 * Verifies MFA code during login.
 * Redirects to dashboard on success, or to login page on error.
 * 
 * @returns {Object} Verify MFA mutation
 */
export const useVerifyMfa = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const createAlert = useSweetAlert();
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: async ({ email, code, isBackupCode = false }) => {
      const response = await apiClient.post(getEndpoint('mfa.verify'), {
        email,
        code,
        isBackupCode,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to verify MFA');
      }

      // Return response data (response already has data spread by API client)
      return response;
    },
    onSuccess: (data) => {
      console.log('🔐 [MFA VERIFY] ===== MFA VERIFICATION SUCCESS =====');
      console.log('🔐 [MFA VERIFY] Response data:', {
        success: data.success,
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
          role: data.user.role
        } : 'Missing',
        sessionToken: data.sessionToken ? 'Present' : 'Missing',
        refreshToken: data.refreshToken ? 'Present' : 'Missing',
        expiresAt: data.expiresAt
      });
      
      // Update auth store
      if (data.success && data.user) {
        console.log('🔐 [MFA VERIFY] Updating auth store...');
        login(
          data.user,
          data.sessionToken || null,
          data.refreshToken || null,
          data.expiresAt ? new Date(data.expiresAt) : null
        );
        console.log('🔐 [MFA VERIFY] ✅ Auth store updated');
      }

      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['session'] });
      queryClient.refetchQueries({ queryKey: ['user'] });
      console.log('🔐 [MFA VERIFY] ✅ Queries invalidated and refetched');

      // Show success message
      Swal.fire({
        icon: 'success',
        title: 'MFA Verified',
        text: 'Login successful!',
        timer: 1500,
        showConfirmButton: false,
      });

      // Redirect to dashboard or specified redirect URL
      setTimeout(() => {
        // Check for redirect parameter in URL (passed from middleware or guard)
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const redirectUrl = urlParams.get('redirect');
          
          if (redirectUrl) {
            router.push(redirectUrl);
          } else {
            const dashboardPath = getDashboardPath(data.user?.role || 'superadmin');
            router.push(dashboardPath);
          }
        } else {
          const dashboardPath = getDashboardPath(data.user?.role || 'superadmin');
          router.push(dashboardPath);
        }
      }, 500);
    },
    onError: (error) => {
      console.error('🔐 [MFA VERIFY] ❌ ===== MFA VERIFICATION ERROR =====');
      console.error('🔐 [MFA VERIFY] ❌ Error message:', error.message);
      console.error('🔐 [MFA VERIFY] ❌ Error stack:', error.stack);
      console.error('🔐 [MFA VERIFY] ❌ Error details:', error);
      createAlert('error', error.message || 'Failed to verify MFA');
      // Stay on MFA page so the user can retry or see the error clearly.
      // Only hard-redirect to login for terminal conditions (locked/inactive).
      const msg = error.message || '';
      if (msg.includes('Account locked') || msg.includes('Account inactive')) {
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            router.push('/login');
          }
        }, 2000);
      }
    },
  });
};

/**
 * useBackupCodes Query Hook
 * 
 * Fetches backup codes for MFA.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Backup codes query
 */
export const useBackupCodes = (options = {}) => {
  return useQuery({
    queryKey: ['mfa', 'backupCodes'],
    queryFn: async () => {
      const response = await apiClient.get(getEndpoint('mfa.backupCodes'));

      if (!response.success) {
        throw new Error(response.error || 'Failed to get backup codes');
      }

      // Return response data (codes, unusedCount, etc.)
      return response;
    },
    enabled: options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

/**
 * useRegenerateBackupCodes Mutation Hook
 * 
 * Regenerates backup codes for MFA.
 * 
 * @returns {Object} Regenerate backup codes mutation
 */
export const useRegenerateBackupCodes = () => {
  const queryClient = useQueryClient();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(getEndpoint('mfa.backupCodes'), {
        confirm: true,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to regenerate backup codes');
      }

      // Return response data (backupCodes, etc.)
      return response;
    },
    onSuccess: (data) => {
      // Invalidate backup codes query
      queryClient.invalidateQueries({ queryKey: ['mfa', 'backupCodes'] });

      // Show success message
      createAlert('success', 'Backup codes regenerated successfully');

      return data;
    },
    onError: (error) => {
      console.error('Regenerate backup codes error:', error);
      createAlert('error', error.message || 'Failed to regenerate backup codes');
    },
  });
};

export default {
  useMfaSetup,
  useVerifyMfaSetup,
  useVerifyMfa,
  useBackupCodes,
  useRegenerateBackupCodes,
};

