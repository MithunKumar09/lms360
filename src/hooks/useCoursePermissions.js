/**
 * Course Permissions Hook
 * 
 * Hook for managing course creation permissions based on user role.
 */

'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/index.js';
import { useCourseStore } from '@/store/index.js';

/**
 * Hook to enforce role-based permissions for course creation
 */
export const useCoursePermissions = () => {
  const user = useAuthStore((state) => state.user);
  const { courseData, updateField } = useCourseStore();
  const isAdmin = user?.role === 'admin';
  const isSuperadmin = user?.role === 'superadmin';
  const userOrgId = user?.orgId;

  // Auto-assign organization for admin users
  useEffect(() => {
    if (isAdmin && userOrgId && courseData.organizationId !== userOrgId) {
      // Admin users must use their own organization
      updateField('organizationId', userOrgId);
    }
  }, [isAdmin, userOrgId, courseData.organizationId, updateField]);

  return {
    isAdmin,
    isSuperadmin,
    userOrgId,
    canSelectOrganization: isSuperadmin,
    defaultOrganizationId: isAdmin ? userOrgId : null,
  };
};

