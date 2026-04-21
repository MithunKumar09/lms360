/**
 * useSidebarAccessControl API Hook
 * 
 * React Query hook for checking sidebar access control.
 * Fetches and checks if the current user has access to a specific sidebar.
 * 
 * @param {string} sidebarName - Sidebar name to check (e.g., 'admin', 'instructor', 'student')
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Query result with is_enabled and isLoading
 */

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/index.js';
import apiClient from '@/lib/api/client.js';

export function useSidebarAccessControl(sidebarName, options = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { enabled = true } = options;

  return useQuery({
    queryKey: ['sidebar-access-control', 'check', sidebarName],
    queryFn: async () => {
      if (!sidebarName) {
        // Default to enabled if no sidebar name provided (backward compatibility)
        return {
          is_enabled: true,
          sidebar_name: null,
          user_id: null,
          user_role: null,
          org_id: null,
        };
      }

      try {
        const response = await apiClient.get(
          `/sidebar-access-control/check?sidebarName=${sidebarName}&includeDetails=false`
        );

        if (!response.success) {
          // On error, default to enabled (fail-open for backward compatibility)
          console.warn(
            `[Sidebar Access Control] Failed to check access for ${sidebarName}, defaulting to enabled`,
            response.error
          );
          return {
            is_enabled: true,
            sidebar_name: sidebarName,
            user_id: null,
            user_role: null,
            org_id: null,
          };
        }

        return response.data || {
          is_enabled: true, // Default to enabled if no data
          sidebar_name: sidebarName,
        };
      } catch (error) {
        // On error, default to enabled (fail-open for backward compatibility)
        console.warn(
          `[Sidebar Access Control] Error checking access for ${sidebarName}, defaulting to enabled`,
          error
        );
        return {
          is_enabled: true,
          sidebar_name: sidebarName,
          user_id: null,
          user_role: null,
          org_id: null,
        };
      }
    },
    enabled: isAuthenticated && enabled && !!sidebarName,
    staleTime: 5 * 60 * 1000, // 5 minutes - sidebar access doesn't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: true, // Refetch on reconnect
    retry: 1, // Retry once on failure
    // Default to enabled if query is disabled or sidebar name is missing
    placeholderData: {
      is_enabled: true,
      sidebar_name: sidebarName,
      user_id: null,
      user_role: null,
      org_id: null,
    },
  });
}
