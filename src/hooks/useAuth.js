/**
 * useAuth Hook
 * 
 * Custom hook for accessing authentication state and actions.
 * Provides convenient access to auth store with helper functions.
 * 
 * @returns {Object} Auth state and actions
 * 
 * @example
 * ```jsx
 * const { user, isAuthenticated, login, logout, hasRole } = useAuth();
 * 
 * if (isAuthenticated) {
 *   return <div>Welcome, {user.email}</div>;
 * }
 * 
 * if (hasRole('superadmin')) {
 *   return <SuperadminDashboard />;
 * }
 * ```
 */

import { useAuthStore } from '@/store/index.js';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { getDashboardPath } from '@/lib/auth/roles.js';

/**
 * useAuth Hook
 * 
 * Provides access to authentication state and actions.
 * Also includes helper functions for role checking and navigation.
 */
const useAuth = () => {
  const router = useRouter();
  
  // Get state and actions from store
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const sessionToken = useAuthStore((state) => state.sessionToken);
  const sessionExpires = useAuthStore((state) => state.sessionExpires);
  
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const updateUser = useAuthStore((state) => state.updateUser);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const setLoading = useAuthStore((state) => state.setLoading);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  
  const hasRole = useAuthStore((state) => state.hasRole);
  const hasAnyRole = useAuthStore((state) => state.hasAnyRole);
  const isSuperadmin = useAuthStore((state) => state.isSuperadmin);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const isInstructor = useAuthStore((state) => state.isInstructor);
  const isStudent = useAuthStore((state) => state.isStudent);
  const isParent = useAuthStore((state) => state.isParent);
  const isVendor = useAuthStore((state) => state.isVendor);
  const isMentor = useAuthStore((state) => state.isMentor);
  const isSessionExpired = useAuthStore((state) => state.isSessionExpired);

  /**
   * Redirect to dashboard based on user role
   */
  const redirectToDashboard = () => {
    if (user?.role) {
      router.push(getDashboardPath(user.role));
    }
  };

  /**
   * Redirect to login page
   */
  const redirectToLogin = () => {
    router.push('/login');
  };

  /**
   * Require authentication - redirects to login if not authenticated
   * @param {Function} callback - Callback to execute if authenticated
   */
  const requireAuth = (callback) => {
    if (isAuthenticated && user) {
      callback();
    } else {
      redirectToLogin();
    }
  };

  /**
   * Require role - redirects to login if user doesn't have required role
   * @param {string|string[]} roles - Required role(s)
   * @param {Function} callback - Callback to execute if user has role
   */
  const requireRole = (roles, callback) => {
    if (!isAuthenticated || !user) {
      redirectToLogin();
      return;
    }

    const rolesArray = Array.isArray(roles) ? roles : [roles];
    if (hasAnyRole(rolesArray)) {
      callback();
    } else {
      // Redirect to user's dashboard if they don't have required role
      redirectToDashboard();
    }
  };

  /**
   * Check if user can access a route
   * @param {string|string[]} allowedRoles - Allowed roles for the route
   * @returns {boolean} Whether user can access the route
   */
  const canAccess = (allowedRoles) => {
    if (!isAuthenticated || !user) {
      return false;
    }

    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    return hasAnyRole(rolesArray);
  };

  // Check session expiration on mount and periodically
  useEffect(() => {
    if (isAuthenticated && sessionExpires) {
      const checkExpiration = () => {
        if (isSessionExpired()) {
          // Session expired, logout
          logout();
          redirectToLogin();
        }
      };

      // Check immediately
      checkExpiration();

      // Check every minute
      const interval = setInterval(checkExpiration, 60000);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, sessionExpires, isSessionExpired, logout]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    sessionToken,
    sessionExpires,

    // Actions
    login,
    logout,
    updateUser,
    refreshSession,
    setLoading,
    clearAuth,

    // Role checks
    hasRole,
    hasAnyRole,
    isSuperadmin,
    isAdmin,
    isInstructor,
    isStudent,
    isParent,
    isVendor,
    isMentor,
    isSessionExpired,

    // Helpers
    getDashboardPath: (role) => getDashboardPath(role),
    redirectToDashboard,
    redirectToLogin,
    requireAuth,
    requireRole,
    canAccess,
  };
};

export default useAuth;


