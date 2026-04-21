/**
 * Superadmin Session Context
 * 
 * Centralized session management for superadmin dashboard.
 * Provides session data, role, and CSRF token to all superadmin components.
 */

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from '@/hooks/api/useAuth.js';
import { useAuthStore } from '@/store/index.js';

const SuperadminSessionContext = createContext(null);

/**
 * Superadmin Session Provider
 * 
 * Wraps superadmin dashboard components and provides centralized session management.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {Object} props.initialSession - Initial session data from server
 * @returns {JSX.Element} Provider component
 */
export function SuperadminSessionProvider({ children, initialSession = null }) {
  const [session, setSession] = useState(initialSession);
  
  // Hooks must be called unconditionally
  const sessionQuery = useSession();
  const authStore = useAuthStore();
  
  // Safely extract store values and functions
  const user = authStore?.user ?? null;
  const isAuthenticated = authStore?.isAuthenticated ?? false;
  const setUser = authStore?.setUser;
  const setIsAuthenticated = authStore?.setIsAuthenticated;
  
  // Safely extract session data (handle errors gracefully)
  const sessionData = sessionQuery.data;
  const sessionLoading = sessionQuery.isLoading;
  const sessionError = sessionQuery.error;
  
  // Log errors but don't let them break the component
  useEffect(() => {
    if (sessionError) {
      console.error('🔄 [SESSION CONTEXT] Session query error:', sessionError);
    }
  }, [sessionError]);

  // Update session when sessionData changes
  useEffect(() => {
    // Skip if there's an error (don't update session on error)
    if (sessionError) {
      console.log('🔄 [SESSION CONTEXT] Error detected, skipping session update');
      return;
    }

    // Ensure setUser and setIsAuthenticated are functions before using them
    if (typeof setUser !== 'function' || typeof setIsAuthenticated !== 'function') {
      console.error('🔄 [SESSION CONTEXT] setUser or setIsAuthenticated is not a function', {
        setUser: typeof setUser,
        setIsAuthenticated: typeof setIsAuthenticated,
      });
      return;
    }

    // Only process if we have valid session data
    if (sessionData && typeof sessionData === 'object' && !(sessionData instanceof Error)) {
      if (sessionData.authenticated && sessionData.user) {
        // Update session state
        setSession({
          user: sessionData.user,
          expires: sessionData.session?.expires,
          authenticated: true,
        });

        // Update auth store (don't clear session, just update it)
        if (sessionData.user.role === 'superadmin') {
          try {
            setUser(sessionData.user);
            setIsAuthenticated(true);
          } catch (error) {
            console.error('🔄 [SESSION CONTEXT] Error updating auth store:', error);
          }
        }
      } else if (sessionData.authenticated === false) {
        // Only log if we're sure there's no session AND it's not loading
        // Don't clear during refresh operations or MFA verification
        // Check if we have a user in store or initial session - if so, don't clear
        if (!user && !initialSession) {
          // Only log, don't clear - might be refreshing or in MFA flow
          console.log('🔄 [SESSION CONTEXT] Session not authenticated, but preserving existing session');
        }
        // Don't clear session - preserve it during refresh/MFA operations
      }
    }
    // If sessionData is null or undefined, don't do anything - might be loading
  }, [sessionData, setUser, setIsAuthenticated, user, initialSession, sessionError]);

  // Use initial session if available and no session data yet
  useEffect(() => {
    // Ensure setUser and setIsAuthenticated are functions before using them
    if (typeof setUser !== 'function' || typeof setIsAuthenticated !== 'function') {
      return;
    }

    if (initialSession && !session && !sessionLoading) {
      setSession(initialSession);
      if (initialSession.user && initialSession.user.role === 'superadmin') {
        try {
          setUser(initialSession.user);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('🔄 [SESSION CONTEXT] Error setting initial session:', error);
        }
      }
    }
  }, [initialSession, session, sessionLoading, setUser, setIsAuthenticated]);

  // Safely construct context value - ensure no error objects are included
  const value = {
    session: session && typeof session === 'object' && !(session instanceof Error) ? session : null,
    user: (session?.user && typeof session.user === 'object' && !(session.user instanceof Error)) 
      ? session.user 
      : (user && typeof user === 'object' && !(user instanceof Error) ? user : null),
    role: (session?.user?.role && typeof session.user.role === 'string') 
      ? session.user.role 
      : (user?.role && typeof user.role === 'string' ? user.role : null),
    orgId: session?.user?.orgId ?? user?.orgId ?? null,
    isAuthenticated: Boolean(session?.authenticated || isAuthenticated),
    isLoading: Boolean(sessionLoading),
    mfaEnabled: Boolean(session?.user?.mfaEnabled ?? user?.mfaEnabled ?? false),
    mfaVerified: Boolean(session?.user?.mfaVerified ?? user?.mfaVerified ?? false),
    // CSRF token is handled by NextAuth cookies automatically
    // We don't need to expose it explicitly as it's in the cookie
  };

  // Ensure children is valid React node (not an error object)
  const safeChildren = children && typeof children === 'object' && !(children instanceof Error) 
    ? children 
    : null;

  return (
    <SuperadminSessionContext.Provider value={value}>
      {safeChildren}
    </SuperadminSessionContext.Provider>
  );
}

/**
 * Hook to access superadmin session context
 * 
 * @returns {Object} Session context value
 */
export function useSuperadminSession() {
  const context = useContext(SuperadminSessionContext);
  
  if (!context) {
    throw new Error('useSuperadminSession must be used within SuperadminSessionProvider');
  }
  
  return context;
}

/**
 * Hook to check if current user is superadmin
 * 
 * @returns {boolean} Whether user is superadmin
 */
export function useIsSuperadmin() {
  const { role } = useSuperadminSession();
  return role === 'superadmin';
}

