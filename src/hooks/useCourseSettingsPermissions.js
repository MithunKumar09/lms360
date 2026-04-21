/**
 * Course Settings Permissions Hook
 * 
 * Combines auth store (user role) and course settings store (accessControl)
 * to provide permission checking for course settings features.
 * 
 * @param {string} featureName - Feature name: 'categories', 'subcategories', 'types', 'program_types', 'levels', 'skills', 'testimonials'
 * @returns {Object} Permission state: { hasReadAccess, hasWriteAccess, isSuperadmin, isLoading }
 */

"use client";

import { useEffect, useMemo } from "react";
import { useAuthStore } from "@/store/index.js";
import { useCourseSettingsStore } from "@/store/index.js";

const useCourseSettingsPermissions = (featureName) => {
  // Get user from auth store
  const user = useAuthStore((state) => state.user);
  
  // Get access control state and methods from course settings store
  const accessControl = useCourseSettingsStore((state) => state.accessControl);
  const fetchAccessControl = useCourseSettingsStore((state) => state.fetchAccessControl);
  const checkAccess = useCourseSettingsStore((state) => state.checkAccess);
  const loading = useCourseSettingsStore((state) => state.loading?.accessControl || false);
  
  // Check if user is superadmin
  const isSuperadmin = useMemo(() => {
    return user?.role === 'superadmin';
  }, [user?.role]);
  
  // Check read access
  // Note: According to backend design, read access is always allowed for admin
  // But we check accessControl for consistency and future flexibility
  const hasReadAccess = useMemo(() => {
    if (isSuperadmin) return true;
    if (!user || user.role !== 'admin') return false;
    // Admin always has read access (per backend design)
    // But we can check accessControl if it exists
    if (accessControl && accessControl[featureName]) {
      return accessControl[featureName].read_access === true;
    }
    // Default: allow read access for admin (matches backend behavior)
    return true;
  }, [isSuperadmin, user, accessControl, featureName]);
  
  // Check write access
  const hasWriteAccess = useMemo(() => {
    if (isSuperadmin) return true;
    if (!user || user.role !== 'admin') return false;
    // Check accessControl for write permission
    if (accessControl && accessControl[featureName]) {
      return accessControl[featureName].write_access === true;
    }
    // Default: no write access if not explicitly granted
    return false;
  }, [isSuperadmin, user, accessControl, featureName]);
  
  // Auto-fetch access control for admin users on first use
  useEffect(() => {
    // Only fetch for admin users
    if (user?.role === 'admin' && !loading) {
      // Check if accessControl is empty or doesn't have this feature
      const needsFetch = !accessControl || 
                        Object.keys(accessControl).length === 0 || 
                        !accessControl[featureName];
      
      if (needsFetch && typeof fetchAccessControl === 'function') {
        // Fetch access control settings
        fetchAccessControl(false, 'admin').catch((error) => {
          // Silently handle errors - access control fetch failures shouldn't break the UI
          console.warn('Failed to fetch access control:', error);
        });
      }
    }
  }, [user?.role, featureName, accessControl, fetchAccessControl, loading]);
  
  return {
    hasReadAccess,
    hasWriteAccess,
    isSuperadmin,
    isLoading: loading,
  };
};

export default useCourseSettingsPermissions;

