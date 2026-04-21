/**
 * useInstructorsForDropdown API Hook
 * 
 * React Query hook for fetching instructors for dropdowns in quiz forms.
 * Used by admin and superadmin to select instructors when creating quizzes.
 */

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { useAuthStore } from '@/store/index.js';

/**
 * useInstructorsForDropdown Query Hook
 * 
 * Fetches instructors for dropdown based on user role:
 * - Admin: Instructors from their organization only
 * - Superadmin: Instructors from selected organization (or all if orgId is null)
 * 
 * @param {Object} options - Query options
 * @param {string|null} options.orgId - Organization ID to filter instructors (for superadmin)
 * @returns {Object} Instructors query
 */
export const useInstructorsForDropdown = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const { orgId } = options;

  return useQuery({
    queryKey: ['instructors-dropdown', user?.id, user?.role, orgId],
    queryFn: async () => {
      const params = new URLSearchParams({
        roles: 'instructor,orginstructor', // Fetch both instructor roles
        pageSize: '1000', // Get all instructors (for dropdown)
        page: '1',
      });

      // For admin, always filter by their organization
      if (user?.role === 'admin' && user?.orgId) {
        params.append('orgId', user.orgId);
      }
      // For superadmin, filter by orgId if provided
      else if (user?.role === 'superadmin' && orgId) {
        params.append('orgId', orgId);
      }
      // For superadmin without orgId, fetch all instructors (global)
      
      const response = await apiClient.get(`/users?${params.toString()}`);

      if (!response.success && !response.items) {
        throw new Error(response.error || 'Failed to fetch instructors');
      }

      // Transform to dropdown format
      const instructors = (response.items || []).map((instructor) => ({
        id: instructor.id,
        label: `${instructor.firstName || ''} ${instructor.lastName || ''}`.trim() || instructor.email || 'Unknown',
        value: instructor.id,
        email: instructor.email,
      }));

      return {
        instructors,
        total: response.total || instructors.length,
      };
    },
    enabled: isAuthenticated && ['admin', 'superadmin'].includes(user?.role) && (options.enabled !== false),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
};

export default useInstructorsForDropdown;

