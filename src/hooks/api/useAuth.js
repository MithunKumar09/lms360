/**
 * useAuth API Hooks
 * 
 * React Query hooks for authentication operations.
 * Provides mutations and queries for login, logout, session, and token refresh.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore } from '@/store/index.js';
import { useRouter } from 'next/navigation';
import useSweetAlert from '@/hooks/useSweetAlert';
import { getDashboardPath } from '@/lib/auth/roles.js';

/**
 * useLogin Mutation Hook
 * 
 * Handles user login with email and password.
 *
 * @returns {Object} Login mutation
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const createAlert = useSweetAlert();
  const login = useAuthStore((state) => state.login);

  return useMutation({
    mutationFn: async ({ email, password, rememberMe }) => {
      const response = await apiClient.post(getEndpoint('auth.login'), {
        email,
        password,
        rememberMe,
      });

      // Check if MFA verification is required (this is a success case with requiresMfa flag)
      // The API returns 200 status with requiresMfa: true when password is correct
      if (response.requiresMfa) {
        return response;
      }

      // Check if MFA setup is required (this is a success case with requiresMfaSetup flag)
      // The API returns 200 status with requiresMfaSetup: true when password is correct but MFA needs setup
      if (response.requiresMfaSetup) {
        return response;
      }

      // Password is correct but the account must reset its password before sign-in.
      // The API returns 200 with requiresPasswordReset: true (+ hasValidResetToken).
      // Surface it to the component (which renders a persistent notice) instead of
      // throwing a generic "Login failed".
      if (response.requiresPasswordReset) {
        return response;
      }

      // Check if request was successful
      if (!response.success) {
        // Create error object with response data for better error handling
        const error = new Error(response.error || 'Login failed');
        error.status = response.status;
        error.data = {
          accountLocked: response.accountLocked,
          rateLimited: response.rateLimited,
          requiresMfa: response.requiresMfa,
          requiresMfaSetup: response.requiresMfaSetup,
          minutesRemaining: response.minutesRemaining,
        };
        throw error;
      }

      // Return response data (user, success, etc.)
      return response;
    },
    onSuccess: (data) => {
      // Check if MFA verification is required (MFA is set up, needs TOTP code)
      if (data.requiresMfa) {
        createAlert('info', 'Multi-factor authentication required');
        console.log('🔐 [LOGIN] Redirecting to MFA verification page...');
        router.push(`/mfa?mode=verify&email=${encodeURIComponent(data.email || data.user?.email)}`);
        return;
      }

      // Check if MFA setup is required (MFA is enabled but not set up yet)
      if (data.requiresMfaSetup) {
        createAlert('info', 'MFA setup required before accessing dashboard');
        console.log('🔐 [LOGIN] Redirecting to MFA setup page...');
        router.push(`/mfa?mode=setup&email=${encodeURIComponent(data.email || data.user?.email)}`);
        return;
      }

      // Login successful
      if (data.success && data.user) {
        createAlert('success', 'Login successful!');
        
        // Update auth store
        login(
          data.user,
          data.sessionToken || null,
          data.refreshToken || null,
          data.expiresAt ? new Date(data.expiresAt) : null
        );

        // Invalidate and refetch user-related queries
        queryClient.invalidateQueries({ queryKey: ['user'] });
        queryClient.invalidateQueries({ queryKey: ['session'] });
        
        // Invalidate wishlist to sync after login
        queryClient.invalidateQueries({ queryKey: ['wishlist'] });

        // Redirect to role-based dashboard.
        // Use replace (not push) so the login page is not in the back stack.
        const dashboardPath = getDashboardPath(data.user.role);
        console.log('🔐 [LOGIN] Redirecting to dashboard:', dashboardPath);
        router.replace(dashboardPath);
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      // Error message is already shown in the login form
      // Pass error data through for form component to handle
      throw error;
    },
  });
};

/**
 * Helper function to clear cookies on client side
 * This is a backup to ensure cookies are cleared even if server-side clearing fails
 */
const clearClientCookies = () => {
  if (typeof document === 'undefined') return;

  try {
    // List of all possible cookie names to clear
    const cookieNames = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'refresh-token',
    ];

    // Get current domain and path
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    cookieNames.forEach((cookieName) => {
      // Clear with current path
      document.cookie = `${cookieName}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      
      // Clear with root path
      document.cookie = `${cookieName}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${hostname}`;
      
      // For production, also try with domain prefix
      if (!isLocalhost) {
        const domainParts = hostname.split('.');
        if (domainParts.length > 1) {
          const rootDomain = '.' + domainParts.slice(-2).join('.');
          document.cookie = `${cookieName}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${rootDomain}`;
        }
      }

      // For secure cookies, try with secure flag
      if (cookieName.includes('Secure') || cookieName.includes('Host')) {
        document.cookie = `${cookieName}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure`;
      }
    });

    console.log('✅ [LOGOUT] Client-side cookies cleared');
  } catch (error) {
    console.error('❌ [LOGOUT] Error clearing client-side cookies:', error);
    // Continue even if cookie clearing fails
  }
};

/**
 * useLogout Mutation Hook
 * 
 * Handles user logout with proper error handling, state management, and cleanup.
 * 
 * @returns {Object} Logout mutation
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const createAlert = useSweetAlert();
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(getEndpoint('auth.logout'));

      if (!response.success) {
        throw new Error(response.error || 'Logout failed');
      }

      // Return response data
      return response;
    },
    onSuccess: async () => {
      try {
        // Clear API client cache first
        apiClient.clearAuthCache();

        // Clear client-side cookies as backup
        clearClientCookies();

        // Clear auth store (synchronous operation)
        logout();

        // Clear wishlist store
        try {
          const { useWishlistStore } = require('@/store/wishlistStore.js');
          useWishlistStore.getState().clearWishlist();
        } catch (error) {
          console.error('Error clearing wishlist on logout:', error);
        }

        // Clear all queries
        queryClient.clear();

        // Show success message
        createAlert('success', 'Logged out successfully');

        // Wait a brief moment to ensure all cleanup is complete
        // Then redirect to login
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify logout state before redirect
        // Get auth store state directly to verify logout
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated && !authState.user) {
          console.log('✅ [LOGOUT] Logout verified, redirecting to login');
          // Use window.location.href for hard redirect to ensure full page reload
          // This prevents any cached session state from persisting
          window.location.href = '/login';
        } else {
          console.warn('⚠️ [LOGOUT] Logout state not cleared properly, forcing hard redirect');
          // Force hard redirect even if state check fails
          // Hard redirect ensures cookies and cache are fully cleared
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('❌ [LOGOUT] Error during logout cleanup:', error);
        // Even if cleanup fails, redirect to login with hard redirect
        window.location.href = '/login';
      }
    },
    onError: (error) => {
      console.error('❌ [LOGOUT] Logout API error:', error);

      // Determine if this is a network error or server error
      const isNetworkError = 
        error.message?.includes('Network') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('network') ||
        error.status === 0 ||
        !error.status;

      // Only clear state on network errors (user is offline or server unreachable)
      // For server errors (401, 403, 500, etc.), don't clear state as session might still be valid
      if (isNetworkError) {
        console.log('⚠️ [LOGOUT] Network error detected, clearing local state anyway');
        createAlert('warning', 'Network error during logout. Local session cleared.');
        
        // Clear local state for network errors
        apiClient.clearAuthCache();
        clearClientCookies();
        logout();
        
        try {
          const { useWishlistStore } = require('@/store/wishlistStore.js');
          useWishlistStore.getState().clearWishlist();
        } catch (error) {
          console.error('Error clearing wishlist on logout:', error);
        }
        
        queryClient.clear();
        // Use hard redirect for network errors to ensure full cleanup
        window.location.href = '/login';
      } else {
        // Server error - don't clear state, show error message
        console.error('❌ [LOGOUT] Server error during logout, keeping state intact');
        createAlert('error', error.message || 'Logout failed. Please try again.');
        // Don't redirect or clear state on server errors
      }
    },
  });
};

/**
 * useSession Query Hook
 * 
 * Fetches current session information.
 * 
 * @returns {Object} Session query
 */
export const useSession = () => {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        const response = await apiClient.get(getEndpoint('auth.session'));

        if (!response.success) {
          // Return a safe response structure even on failure
          return {
            authenticated: false,
            user: null,
            session: null,
            error: response.error || 'Failed to get session',
          };
        }

        // Return response data (user, session, etc.)
        return response;
      } catch (error) {
        // Return safe structure on error instead of throwing
        console.error('🔄 [USE SESSION] Error fetching session:', error);
        return {
          authenticated: false,
          user: null,
          session: null,
          error: error.message || 'Failed to get session',
        };
      }
    },
    staleTime: 30 * 1000, // 30 seconds - reduce refetch frequency
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Disable to prevent excessive refetches
    refetchOnReconnect: true,
    retry: 1, // Only retry once on failure
    retryDelay: 1000, // 1 second delay between retries
    // Don't throw errors - return safe structure instead
    throwOnError: false,
    // Mark as critical query for preloader tracking
    meta: { isCritical: true },
  });
};

/**
 * useRefreshToken Mutation Hook
 * 
 * Refreshes authentication token.
 * 
 * @returns {Object} Refresh token mutation
 */
export const useRefreshToken = () => {
  const queryClient = useQueryClient();
  const refreshSession = useAuthStore((state) => state.refreshSession);

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(getEndpoint('auth.refresh'));

      if (!response.success) {
        throw new Error(response.error || 'Token refresh failed');
      }

      // Return response data (accessToken, refreshToken, expiresAt, etc.)
      return response;
    },
    onSuccess: (data) => {
      // Update auth store with new tokens
      if (data.accessToken && data.refreshToken && data.expiresAt) {
        refreshSession(
          data.accessToken,
          data.refreshToken,
          new Date(data.expiresAt)
        );
      }

      // Invalidate session query to refetch with new token
      queryClient.invalidateQueries({ queryKey: ['session'] });
    },
    onError: (error) => {
      console.error('Token refresh error:', error);
      // If token refresh fails, user should be logged out
      // This will be handled by the API client interceptor
    },
  });
};

export default {
  useLogin,
  useLogout,
  useSession,
  useRefreshToken,
};

