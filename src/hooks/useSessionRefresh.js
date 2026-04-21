/**
 * useSessionRefresh Hook
 * 
 * Custom hook for automatic token refresh.
 * Refreshes token before expiry and handles refresh errors.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/index.js';
import apiClient from '@/lib/api/client.js';
import { getEndpoint } from '@/lib/api/endpoints.js';
import { useRouter } from 'next/navigation';

/**
 * useSessionRefresh Hook
 * 
 * Automatically refreshes token before expiry.
 * 
 * @param {Object} options - Hook options
 * @param {number} options.refreshThreshold - Refresh threshold in milliseconds (default: 5 minutes)
 * @param {number} options.checkInterval - Check interval in milliseconds (default: 1 minute)
 * @param {boolean} options.enabled - Whether automatic refresh is enabled (default: true)
 * @returns {Object} Refresh state and functions
 */
export function useSessionRefresh(options = {}) {
  const {
    refreshThreshold = 5 * 60 * 1000, // 5 minutes
    checkInterval = 60 * 1000, // 1 minute
    enabled = true,
  } = options;

  const router = useRouter();
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const sessionExpires = useAuthStore((state) => state.sessionExpires);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const refreshTimeoutRef = useRef(null);
  const checkIntervalRef = useRef(null);
  const isRefreshingRef = useRef(false);

  /**
   * Refresh token
   */
  const refreshToken = useCallback(async () => {
    // Prevent multiple simultaneous refresh attempts
    if (isRefreshingRef.current) {
      console.log('🔄 [SESSION REFRESH] Already refreshing, skipping...');
      return;
    }

    if (!isAuthenticated || !sessionToken) {
      console.log('🔄 [SESSION REFRESH] Not authenticated or no session token, skipping refresh');
      return;
    }

    try {
      isRefreshingRef.current = true;
      console.log('🔄 [SESSION REFRESH] Attempting token refresh...');

      const response = await apiClient.post(getEndpoint('auth.refresh'));

      if (response.success && response.accessToken && response.expiresAt) {
        // Update auth store with new tokens
        refreshSession(
          response.accessToken,
          response.refreshToken || null,
          new Date(response.expiresAt)
        );

        console.log('🔄 [SESSION REFRESH] ✅ Token refreshed successfully');
      } else {
        console.log('🔄 [SESSION REFRESH] ❌ Refresh response invalid:', response);
        throw new Error(response.error || 'Failed to refresh token');
      }
    } catch (error) {
      console.error('🔄 [SESSION REFRESH] ❌ Token refresh error:', error);
      console.error('🔄 [SESSION REFRESH] ❌ Error details:', {
        status: error.status,
        message: error.message,
        isAuthError: error.status === 401 || error.message.includes('Invalid') || error.message.includes('expired')
      });

      // Only logout if it's a real auth error AND we have a session
      // Don't logout during login flow (when there's no session yet)
      if ((error.status === 401 || error.message.includes('Invalid') || error.message.includes('expired')) && isAuthenticated) {
        console.log('🔄 [SESSION REFRESH] ⚠️ Auth error detected, but user is authenticated - logging out');
        await logout();
        router.push('/login');
      } else {
        console.log('🔄 [SESSION REFRESH] ⚠️ Refresh failed but not logging out (likely during login flow)');
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [isAuthenticated, sessionToken, refreshSession, logout, router]);

  /**
   * Check if token needs refresh and schedule refresh
   */
  const checkAndScheduleRefresh = useCallback(async () => {
    if (!enabled || !isAuthenticated || !sessionToken) {
      return;
    }

    try {
      // Check session expiry from store (simpler than parsing JWT on client)
      if (sessionExpires) {
        const now = Date.now();
        const expiryTime = new Date(sessionExpires).getTime();
        const timeUntilExpiry = expiryTime - now;
        const timeUntilRefresh = timeUntilExpiry - refreshThreshold;

        if (timeUntilRefresh <= 0) {
          // Refresh immediately if we're past the threshold
          await refreshToken();
        } else {
          // Clear any existing timeout
          if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current);
          }

          // Schedule refresh
          refreshTimeoutRef.current = setTimeout(() => {
            refreshToken();
          }, timeUntilRefresh);
        }
      } else {
        // If no expiry info, refresh immediately to be safe
        await refreshToken();
      }
    } catch (error) {
      console.error('Error checking token refresh:', error);
    }
  }, [enabled, isAuthenticated, sessionToken, sessionExpires, refreshThreshold, refreshToken]);

  /**
   * Setup automatic refresh
   */
  useEffect(() => {
    if (!enabled || !isAuthenticated || !sessionToken) {
      // Clear any existing timeouts/intervals
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Initial check
    checkAndScheduleRefresh();

    // Set up periodic check
    checkIntervalRef.current = setInterval(() => {
      checkAndScheduleRefresh();
    }, checkInterval);

    // Cleanup on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [enabled, isAuthenticated, sessionToken, checkInterval, checkAndScheduleRefresh]);

  /**
   * Manual refresh function
   */
  const manualRefresh = useCallback(async () => {
    await refreshToken();
  }, [refreshToken]);

  return {
    refreshToken: manualRefresh,
    isRefreshing: isRefreshingRef.current,
  };
}

export default useSessionRefresh;

