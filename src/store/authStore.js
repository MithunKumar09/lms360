/**
 * Authentication Store
 * 
 * Manages authentication state, user data, and session information.
 * Uses Zustand for state management with localStorage persistence.
 * 
 * @typedef {Object} User
 * @property {string} id - User ID
 * @property {string} email - User email
 * @property {string} role - User role (superadmin, admin, instructor, student)
 * @property {string|null} orgId - Organization ID (null for superadmin)
 * @property {boolean} isActive - Whether user is active
 * @property {boolean} mfaEnabled - Whether MFA is enabled
 * @property {boolean} mfaVerified - Whether MFA is verified
 * 
 * @typedef {Object} AuthState
 * @property {User|null} user - Current user data
 * @property {boolean} isAuthenticated - Whether user is authenticated
 * @property {boolean} isLoading - Whether auth state is loading
 * @property {string|null} sessionToken - Current session token
 * @property {string|null} refreshToken - Current refresh token
 * @property {Date|null} sessionExpires - Session expiration date
 * 
 * @typedef {Object} AuthActions
 * @property {Function} login - Login action
 * @property {Function} logout - Logout action
 * @property {Function} updateUser - Update user data
 * @property {Function} refreshSession - Refresh session tokens
 * @property {Function} setLoading - Set loading state
 * @property {Function} clearAuth - Clear all auth data
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Authentication Store
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      isAuthenticated: false,
      isLoading: false,
      sessionToken: null,
      refreshToken: null,
      sessionExpires: null,

      // Actions

      /**
       * Login action
       * @param {User} userData - User data from login
       * @param {string} sessionToken - Session token
       * @param {string} refreshToken - Refresh token (optional)
       * @param {Date} expiresAt - Session expiration date (optional)
       */
      login: (userData, sessionToken = null, refreshToken = null, expiresAt = null) => {
        set({
          user: userData,
          isAuthenticated: true,
          isLoading: false,
          sessionToken: sessionToken,
          refreshToken: refreshToken,
          sessionExpires: expiresAt,
        });
      },

      /**
       * Logout action
       * Clears all authentication data from state and localStorage
       * Note: This is a pure state clearing function. API call is handled by useLogout hook.
       * Wishlist is cleared via React Query cache invalidation in useLogout hook
       */
      logout: () => {
        // Clear state synchronously
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          sessionToken: null,
          refreshToken: null,
          sessionExpires: null,
        });

        // Explicitly clear localStorage to ensure immediate removal
        // This is critical for production environments where state updates might be async
        if (typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorage.removeItem('auth-storage');
            console.log('✅ [AUTH STORE] localStorage cleared');
          } catch (error) {
            console.error('❌ [AUTH STORE] Error clearing localStorage:', error);
            // Continue even if localStorage clear fails
          }
        }
      },

      /**
       * Update user data
       * @param {Partial<User>} userData - Partial user data to update
       */
      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: {
              ...currentUser,
              ...userData,
            },
          });
        }
      },

      /**
       * Set user directly (for session updates)
       * @param {User|null} userData - User data to set
       */
      setUser: (userData) => {
        set({ user: userData });
      },

      /**
       * Set authentication state directly
       * @param {boolean} authenticated - Authentication state
       */
      setIsAuthenticated: (authenticated) => {
        set({ isAuthenticated: authenticated });
      },

      /**
       * Refresh session tokens
       * @param {string} sessionToken - New session token
       * @param {string} refreshToken - New refresh token
       * @param {Date} expiresAt - New expiration date
       */
      refreshSession: (sessionToken, refreshToken, expiresAt) => {
        set({
          sessionToken: sessionToken,
          refreshToken: refreshToken,
          sessionExpires: expiresAt,
        });
      },

      /**
       * Set loading state
       * @param {boolean} loading - Loading state
       */
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      /**
       * Clear all authentication data
       * Used for cleanup or error recovery
       */
      clearAuth: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          sessionToken: null,
          refreshToken: null,
          sessionExpires: null,
        });
      },

      /**
       * Check if user has specific role
       * @param {string} role - Role to check
       * @returns {boolean} Whether user has the role
       */
      hasRole: (role) => {
        const user = get().user;
        return user?.role === role;
      },

      /**
       * Check if user has any of the specified roles
       * @param {string[]} roles - Roles to check
       * @returns {boolean} Whether user has any of the roles
       */
      hasAnyRole: (roles) => {
        const user = get().user;
        return user && roles.includes(user.role);
      },

      /**
       * Check if user is superadmin
       * @returns {boolean} Whether user is superadmin
       */
      isSuperadmin: () => {
        return get().hasRole('superadmin');
      },

      /**
       * Check if user is admin
       * @returns {boolean} Whether user is admin
       */
      isAdmin: () => {
        return get().hasRole('admin');
      },

      /**
       * Check if user is instructor
       * @returns {boolean} Whether user is instructor
       */
      isInstructor: () => {
        return get().hasRole('instructor');
      },

      /**
       * Check if user is student
       * @returns {boolean} Whether user is student
       */
      isStudent: () => {
        return get().hasRole('student');
      },

      /**
       * Check if user is parent
       * @returns {boolean} Whether user is parent
       */
      isParent: () => {
        return get().hasRole('parent');
      },

      /**
       * Check if user is vendor
       * @returns {boolean} Whether user is vendor
       */
      isVendor: () => {
        return get().hasRole('vendor');
      },

      /**
       * Check if user is mentor
       * @returns {boolean} Whether user is mentor
       */
      isMentor: () => {
        return get().hasRole('mentor');
      },

      /**
       * Check if session is expired
       * @returns {boolean} Whether session is expired
       */
      isSessionExpired: () => {
        const expires = get().sessionExpires;
        if (!expires) return false;
        return new Date() > new Date(expires);
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionToken: state.sessionToken,
        refreshToken: state.refreshToken,
        sessionExpires: state.sessionExpires,
      }),
    }
  )
);

export default useAuthStore;


