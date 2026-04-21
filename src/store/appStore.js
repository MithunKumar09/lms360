/**
 * Application Store
 * 
 * Manages global application state such as theme, notifications, and UI state.
 * Uses Zustand for state management with localStorage persistence.
 * 
 * @typedef {Object} Notification
 * @property {string} id - Notification ID
 * @property {string} type - Notification type (success, error, warning, info)
 * @property {string} message - Notification message
 * @property {Date} timestamp - Notification timestamp
 * @property {boolean} read - Whether notification is read
 * 
 * @typedef {Object} AppState
 * @property {string} theme - Current theme (light, dark, system)
 * @property {Notification[]} notifications - Array of notifications
 * @property {boolean} sidebarOpen - Whether sidebar is open (for dashboards)
 * @property {boolean} isLoading - Global loading state
 * @property {Object} preferences - User preferences
 * 
 * @typedef {Object} AppActions
 * @property {Function} setTheme - Set theme
 * @property {Function} toggleTheme - Toggle theme
 * @property {Function} addNotification - Add notification
 * @property {Function} removeNotification - Remove notification
 * @property {Function} markNotificationRead - Mark notification as read
 * @property {Function} clearNotifications - Clear all notifications
 * @property {Function} setSidebarOpen - Set sidebar open state
 * @property {Function} toggleSidebar - Toggle sidebar
 * @property {Function} setLoading - Set global loading state
 * @property {Function} setPreference - Set user preference
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Application Store
 */
const useAppStore = create(
  persist(
    (set, get) => ({
      // State
      theme: 'system', // 'light', 'dark', or 'system'
      notifications: [],
      sidebarOpen: true,
      isLoading: false,
      // UI State Management
      modals: {}, // Modal states: { [modalId]: { isOpen: boolean, data: any } }
      asyncOperations: {}, // Async operation states: { [operationId]: { loading: boolean, error: Error | null } }
      preferences: {
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
      },

      // Actions

      /**
       * Set theme
       * @param {string} theme - Theme to set ('light', 'dark', or 'system')
       */
      setTheme: (theme) => {
        set({ theme });
        // Apply theme to document
        if (typeof window !== 'undefined') {
          if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },

      /**
       * Toggle theme between light and dark
       */
      toggleTheme: () => {
        const currentTheme = get().theme;
        if (currentTheme === 'system') {
          // If system, toggle to opposite of current system preference
          const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
          get().setTheme(isDark ? 'light' : 'dark');
        } else {
          get().setTheme(currentTheme === 'light' ? 'dark' : 'light');
        }
      },

      /**
       * Add notification
       * @param {string} type - Notification type
       * @param {string} message - Notification message
       * @param {number} duration - Auto-remove duration in ms (optional)
       */
      addNotification: (type, message, duration = null) => {
        const notification = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          type,
          message,
          timestamp: new Date(),
          read: false,
        };

        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 50), // Keep max 50 notifications
        }));

        // Auto-remove notification after duration
        if (duration) {
          setTimeout(() => {
            get().removeNotification(notification.id);
          }, duration);
        }

        return notification.id;
      },

      /**
       * Remove notification
       * @param {string} id - Notification ID
       */
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      /**
       * Mark notification as read
       * @param {string} id - Notification ID
       */
      markNotificationRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },

      /**
       * Clear all notifications
       */
      clearNotifications: () => {
        set({ notifications: [] });
      },

      /**
       * Set sidebar open state
       * @param {boolean} open - Whether sidebar is open
       */
      setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
      },

      /**
       * Toggle sidebar
       */
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      /**
       * Set global loading state
       * @param {boolean} loading - Loading state
       */
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      /**
       * Set user preference
       * @param {string} key - Preference key
       * @param {*} value - Preference value
       */
      setPreference: (key, value) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            [key]: value,
          },
        }));
      },

      /**
       * Get user preference
       * @param {string} key - Preference key
       * @param {*} defaultValue - Default value if not found
       * @returns {*} Preference value
       */
      getPreference: (key, defaultValue = null) => {
        return get().preferences[key] ?? defaultValue;
      },

      // UI State Management Actions

      /**
       * Open modal
       * @param {string} modalId - Modal identifier
       * @param {*} data - Optional data to pass to modal
       */
      openModal: (modalId, data = null) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [modalId]: { isOpen: true, data },
          },
        }));
      },

      /**
       * Close modal
       * @param {string} modalId - Modal identifier
       */
      closeModal: (modalId) => {
        set((state) => ({
          modals: {
            ...state.modals,
            [modalId]: { isOpen: false, data: null },
          },
        }));
      },

      /**
       * Check if modal is open
       * @param {string} modalId - Modal identifier
       * @returns {boolean} Whether modal is open
       */
      isModalOpen: (modalId) => {
        return get().modals[modalId]?.isOpen ?? false;
      },

      /**
       * Get modal data
       * @param {string} modalId - Modal identifier
       * @returns {*} Modal data
       */
      getModalData: (modalId) => {
        return get().modals[modalId]?.data ?? null;
      },

      /**
       * Start async operation
       * @param {string} operationId - Operation identifier
       */
      startAsyncOperation: (operationId) => {
        set((state) => ({
          asyncOperations: {
            ...state.asyncOperations,
            [operationId]: { loading: true, error: null },
          },
        }));
      },

      /**
       * Complete async operation
       * @param {string} operationId - Operation identifier
       */
      completeAsyncOperation: (operationId) => {
        set((state) => ({
          asyncOperations: {
            ...state.asyncOperations,
            [operationId]: { loading: false, error: null },
          },
        }));
      },

      /**
       * Set async operation error
       * @param {string} operationId - Operation identifier
       * @param {Error} error - Error object
       */
      setAsyncOperationError: (operationId, error) => {
        set((state) => ({
          asyncOperations: {
            ...state.asyncOperations,
            [operationId]: { loading: false, error },
          },
        }));
      },

      /**
       * Check if async operation is loading
       * @param {string} operationId - Operation identifier
       * @returns {boolean} Whether operation is loading
       */
      isAsyncOperationLoading: (operationId) => {
        return get().asyncOperations[operationId]?.loading ?? false;
      },

      /**
       * Get async operation error
       * @param {string} operationId - Operation identifier
       * @returns {Error | null} Error object or null
       */
      getAsyncOperationError: (operationId) => {
        return get().asyncOperations[operationId]?.error ?? null;
      },

      /**
       * Clear async operation state
       * @param {string} operationId - Operation identifier
       */
      clearAsyncOperation: (operationId) => {
        set((state) => {
          const { [operationId]: _, ...rest } = state.asyncOperations;
          return { asyncOperations: rest };
        });
      },
    }),
    {
      name: 'app-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist certain fields
      partialize: (state) => ({
        theme: state.theme,
        preferences: state.preferences,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

export default useAppStore;


