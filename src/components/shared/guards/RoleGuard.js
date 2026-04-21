/**
 * Role Guard Component
 * 
 * Component to conditionally render content based on user role.
 * Usage: <RoleGuard allowedRoles={['superadmin', 'admin']}>...</RoleGuard>
 */

'use client';

import { useAuthStore } from '@/store/index.js';

/**
 * Role Guard Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string|string[]} props.allowedRoles - Allowed roles
 * @param {React.ReactNode} props.fallback - Fallback component if role doesn't match
 * @param {boolean} props.showFallback - Whether to show fallback or nothing
 * @returns {JSX.Element|null} Content or fallback
 */
const RoleGuard = ({
  children,
  allowedRoles,
  fallback = null,
  showFallback = false,
}) => {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // If not authenticated, show nothing or fallback
  if (!isAuthenticated || !user) {
    return showFallback ? <>{fallback}</> : null;
  }

  // Normalize allowedRoles to array
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  // STRICT: Superadmin can ONLY access superadmin routes
  // Superadmin is global (orgId=null) and should not access other dashboards
  if (user.role === 'superadmin') {
    // Only allow if superadmin role is explicitly allowed
    if (roles.includes('superadmin')) {
      return <>{children}</>;
    }
    // Superadmin trying to access non-superadmin content - BLOCK
    return showFallback ? <>{fallback}</> : null;
  }

  // Check if user has any of the allowed roles
  if (roles.includes(user.role)) {
    return <>{children}</>;
  }

  // User doesn't have required role
  return showFallback ? <>{fallback}</> : null;
};

export default RoleGuard;


