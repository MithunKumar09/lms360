/**
 * Login Guard Component
 * 
 * Redirects authenticated users away from login page.
 * If user is already logged in, redirects them to their dashboard.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/index.js';
import { useSession } from '@/hooks/api/useAuth.js';
import { getDashboardPath } from '@/lib/auth/roles.js';

/**
 * Login Guard Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Children or null while redirecting
 */
const LoginGuard = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // PATCH B: stable string primitive — avoids object-ref churn in dep array
  const callbackUrl = searchParams?.get('callbackUrl') ?? null;

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  // PATCH B: extract primitive role instead of subscribing to the whole user object
  const userRole = useAuthStore((state) => state.user?.role ?? null);

  const { data: sessionData, isLoading: sessionLoading } = useSession();
  // PATCH B: extract stable primitives from sessionData so the object ref never enters deps
  const sessionAuthenticated = sessionData?.authenticated ?? false;
  const sessionUserRole = sessionData?.user?.role ?? null;

  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasCheckedRef = useRef(false);
  const hasRedirectedRef = useRef(false); // PATCH A: one-time redirect lock
  const redirectTimeoutRef = useRef(null);

  useEffect(() => {
    // Prevent multiple checks and redirects
    if (hasCheckedRef.current || isRedirecting) {
      return;
    }

    // Fast-path: Zustand store (localStorage-persisted) confirms authentication.
    // Do not wait for the session API call — a network failure on bootstrap
    // must never override confirmed store auth and force the login page to show.
    if (isAuthenticated && userRole) {
      if (pathname === getDashboardPath(userRole) || pathname.startsWith('/dashboards/')) {
        hasCheckedRef.current = true;
        return;
      }
      const dashboardPath = getDashboardPath(userRole);
      console.log('🔄 [LOGIN GUARD] Store auth confirmed, redirecting to dashboard:', dashboardPath);
      hasCheckedRef.current = true;
      // PATCH A: fire redirect exactly once per mount
      if (hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;
      setIsRedirecting(true);
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = setTimeout(() => {
        // PATCH C: replace instead of push so stale ?error= entries are cleared
        const destination = callbackUrl || dashboardPath;
        router.replace(destination);
      }, 50);
      return () => {
        if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      };
    }

    // Wait for session to load — only when store auth is unknown
    if (sessionLoading) {
      // Reset check after 2 seconds if still loading (might be stuck or cookies cleared)
      const timeout = setTimeout(() => {
        console.log('🔄 [LOGIN GUARD] Session loading timeout, allowing login page');
        hasCheckedRef.current = true;
      }, 2000);
      return () => clearTimeout(timeout);
    }

    // Mark as checked
    hasCheckedRef.current = true;

    // No store auth — fall back to session API response
    if (sessionAuthenticated && sessionUserRole) {
      const dashboardPath = getDashboardPath(sessionUserRole);
      if (pathname === dashboardPath || pathname.startsWith('/dashboards/')) {
        return;
      }
      console.log('🔄 [LOGIN GUARD] Session confirmed, redirecting to dashboard:', dashboardPath);
      // PATCH A: fire redirect exactly once per mount
      if (hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;
      setIsRedirecting(true);
      if (redirectTimeoutRef.current) clearTimeout(redirectTimeoutRef.current);
      redirectTimeoutRef.current = setTimeout(() => {
        // PATCH C: replace instead of push so stale ?error= entries are cleared
        const destination = callbackUrl || dashboardPath;
        router.replace(destination);
      }, 50);
    } else {
      // No authentication - allow login page to render
      console.log('🔄 [LOGIN GUARD] No authentication found, allowing login page');
    }

    // Cleanup timeout on unmount
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
      }
    };
  // PATCH B: only stable primitives — no object refs (user, sessionData) that churn on every render
  }, [isAuthenticated, userRole, sessionAuthenticated, sessionUserRole, sessionLoading, pathname, callbackUrl]);

  // Show loading state while checking or redirecting
  if (sessionLoading || isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <svg
              className="animate-spin h-8 w-8 text-primaryColor"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>
          <p className="text-contentColor dark:text-contentColor-dark">
            {isRedirecting ? 'Redirecting...' : 'Checking authentication...'}
          </p>
        </div>
      </div>
    );
  }

  // Render children if not authenticated
  return <>{children}</>;
};

export default LoginGuard;

