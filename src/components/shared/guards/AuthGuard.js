/**
 * Auth Guard Component
 * 
 * Client-side route guard component.
 * Checks authentication and role, shows loading state, and redirects if unauthorized.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/index.js';
import { useSession } from '@/hooks/api/useAuth.js';
import { canAccessRole, requiresMfa, getDashboardPath } from '@/lib/auth/roles.js';
import Preloader from '@/components/shared/others/Preloader';

/**
 * Auth Guard Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string|string[]} props.allowedRoles - Allowed roles
 * @param {boolean} props.requireMfa - Whether MFA is required
 * @param {string} props.redirectTo - Redirect path if unauthorized
 * @param {React.ReactNode} props.fallback - Fallback component to show while loading
 * @returns {JSX.Element|null} Protected content or null
 */
const AuthGuard = ({
  children,
  allowedRoles = null,
  requireMfa = false,
  redirectTo = '/login',
  fallback = null,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const { data: sessionData, isLoading: sessionLoading } = useSession();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      setIsChecking(true);

      // Wait for session to load
      if (sessionLoading) {
        return;
      }

      // Check authentication
      if (!isAuthenticated || !user) {
        // Check if session exists from NextAuth (might need refresh)
        if (sessionData && sessionData.authenticated && sessionData.user) {
          console.log('🔄 [AUTH GUARD] Session exists but not in store, updating store...');
          
          // FIX #4: VALIDATION - Check if user in session matches current store user
          const store = useAuthStore.getState();
          const currentUser = store.user;
          
          if (currentUser && currentUser.id !== sessionData.user.id) {
            // Session user doesn't match store user - potential session hijack or mismatch
            console.error('🔄 [AUTH GUARD] ❌ Session user mismatch detected!', {
              storeUserId: currentUser.id,
              storeUserEmail: currentUser.email,
              storeUserRole: currentUser.role,
              sessionUserId: sessionData.user.id,
              sessionUserEmail: sessionData.user.email,
              sessionUserRole: sessionData.user.role,
            });
            // Clear auth and redirect to login
            store.clearAuth();
            const loginUrl = new URL(redirectTo, window.location.origin);
            loginUrl.searchParams.set('callbackUrl', pathname);
            loginUrl.searchParams.set('error', 'Session mismatch detected. Please login again.');
            router.push(loginUrl.toString());
            return;
          }
          
          // FIX #4: Update store only if user matches or store is empty
          if (!currentUser || currentUser.id === sessionData.user.id) {
            if (store.login) {
              // Update auth store with session data
              store.login(
                sessionData.user,
                null, // sessionToken - will be refreshed if needed
                null, // refreshToken - stored in cookie
                sessionData.session?.expires ? new Date(sessionData.session.expires) : null
              );
              console.log('🔄 [AUTH GUARD] ✅ Store updated with session data');
            }
          }
          // Continue to role check instead of redirecting
          // Don't return here, let it continue to role check
        } else {
          // No session at all - redirect to login
          console.log('🔄 [AUTH GUARD] No session found, redirecting to login');
          const loginUrl = new URL(redirectTo, window.location.origin);
          loginUrl.searchParams.set('callbackUrl', pathname);
          router.push(loginUrl.toString());
          return;
        }
      }

      // Check role if specified
      if (allowedRoles) {
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        
        // Normalize user role to handle orgadmin -> admin mapping
        const { normalizeRole } = await import('@/lib/auth/roles.js');
        const normalizedUserRole = normalizeRole(user.role);
        
        // Check if user can access any of the allowed roles
        // For shared routes (announcements and organization-finance), allow superadmin to access admin role
        const canAccess = roles.some(role => {
          if (pathname && (
            pathname.startsWith('/dashboards/announcements') ||
            pathname.startsWith('/dashboards/organization-finance')
          )) {
            // Allow superadmin to access shared routes (announcements and organization-finance)
            return canAccessRole(normalizedUserRole, role, pathname);
          }
          return canAccessRole(normalizedUserRole, role);
        });
        
        if (!canAccess) {
          // User doesn't have required role - redirect to their dashboard
          const userDashboard = getDashboardPath(user.role);
          router.push(`/forbidden?error=Access denied&redirect=${encodeURIComponent(userDashboard)}`);
          return;
        }
      }

      // Check MFA if required or if role requires MFA
      const roleRequiresMfa = allowedRoles 
        ? Array.isArray(allowedRoles) 
          ? allowedRoles.some(role => requiresMfa(role))
          : requiresMfa(allowedRoles)
        : false;
      
      if (requireMfa || roleRequiresMfa) {
        // Check if MFA is enabled
        if (user.mfaEnabled && !user.mfaVerified) {
          // Redirect to MFA verification
          router.push(`/mfa?mode=verify&email=${encodeURIComponent(user.email)}&redirect=${encodeURIComponent(pathname)}`);
          return;
        }
      }

      // All checks passed
      setIsChecking(false);
    };

    checkAccess();
  }, [isAuthenticated, user, allowedRoles, requireMfa, redirectTo, pathname, router, sessionLoading, sessionData]);

  // Show loading state - use Preloader component which handles session and logo automatically
  if (isChecking || sessionLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return <Preloader />;
  }

  // Render children if all checks passed
  return <>{children}</>;
};

export default AuthGuard;


