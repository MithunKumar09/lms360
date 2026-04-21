/**
 * Store Index
 * 
 * Central export point for all Zustand stores.
 * Provides easy access to all stores from a single import.
 */

export { default as useAuthStore } from './authStore.js';
export { default as useAppStore } from './appStore.js';
export { default as useInvitiesStore } from './invitiesStore.js';
export { default as useUsersCountStore } from './usersCountStore.js';
export { default as useCourseSettingsStore } from './courseSettingsStore.js';
export { default as useCourseStore } from './courseStore.js';
export { default as useCourseManagementStore } from './courseManagementStore.js';
export { default as useReviewsStore } from './reviewsStore.js';
export { default as useWishlistStore } from './wishlistStore.js';
export { default as useAssignCourseStore } from './assignCourseStore.js';
export { default as useAssignmentDraftStore } from './assignmentDraftStore.js';

// Re-export stores with their common names for convenience
import useAuthStore from './authStore.js';
import useAppStore from './appStore.js';
import useCourseSettingsStore from './courseSettingsStore.js';
import useCourseStore from './courseStore.js';
import useCourseManagementStore from './courseManagementStore.js';

/**
 * Get all stores (useful for debugging or dev tools)
 * @returns {Object} Object containing all stores
 */
export const getStores = () => ({
  auth: useAuthStore.getState(),
  app: useAppStore.getState(),
  course: useCourseStore.getState(),
});

/**
 * Reset all stores (useful for testing or logout)
 */
export const resetAllStores = () => {
  useAuthStore.getState().clearAuth();
  useAppStore.getState().clearNotifications();
};

export default {
  useAuthStore,
  useAppStore,
  useCourseSettingsStore,
  useCourseStore,
  useCourseManagementStore,
  getStores,
  resetAllStores,
};


