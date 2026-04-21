/**
 * Assign Course Store
 * 
 * Zustand store for Assign Course feature UI state.
 * Manages filter state, expanded courses, modal states, and caching.
 * 
 * @typedef {Object} FilterState
 * @property {string|null} cohortId - Cohort ID filter
 * @property {string|null} classId - Class ID filter (cohort)
 * @property {string|null} subjectId - Subject ID filter
 * @property {string|null} instructorId - Instructor ID filter
 * @property {string|null} createdFrom - Start date filter (ISO date)
 * @property {string|null} createdTo - End date filter (ISO date)
 * 
 * @typedef {Object} AssignCourseState
 * @property {FilterState} filters - Filter state
 * @property {Set<string>} expandedCourses - Course IDs that are expanded
 * @property {string|null} selectedCourse - Course ID for assign modal
 * @property {boolean} isAssignModalOpen - Whether assign modal is open
 * @property {boolean} isReportModalOpen - Whether report modal is open
 * @property {Object|null} coursesCache - Cached courses data
 * @property {Object|null} optionsCache - Cached assignment options
 * @property {Object|null} reportCache - Cached report data
 * @property {number|null} cacheTimestamp - Cache timestamp
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Assign Course Store
 */
const useAssignCourseStore = create(
  persist(
    (set, get) => ({
      // Filters
      filters: {
        cohortId: null,
        classId: null,
        subjectId: null,
        instructorId: null,
        createdFrom: null,
        createdTo: null,
      },

      // UI State
      expandedCourses: [], // Course IDs that are expanded (stored as array for persistence)
      selectedCourse: null, // Course ID for assign modal
      isAssignModalOpen: false,
      isReportModalOpen: false,

      // Cache
      coursesCache: null,
      optionsCache: null,
      reportCache: null,
      cacheTimestamp: null,

      // Actions
      /**
       * Set filter value
       * @param {string} key - Filter key
       * @param {*} value - Filter value
       */
      setFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),

      /**
       * Clear all filters
       */
      clearFilters: () =>
        set({
          filters: {
            cohortId: null,
            classId: null,
            subjectId: null,
            instructorId: null,
            createdFrom: null,
            createdTo: null,
          },
        }),

      /**
       * Toggle course expansion
       * @param {string} courseId - Course ID to toggle
       */
      toggleCourseExpansion: (courseId) =>
        set((state) => {
          const expanded = Array.isArray(state.expandedCourses)
            ? new Set(state.expandedCourses)
            : new Set();
          if (expanded.has(courseId)) {
            expanded.delete(courseId);
          } else {
            expanded.add(courseId);
          }
          return { expandedCourses: Array.from(expanded) };
        }),

      /**
       * Check if course is expanded
       * @param {string} courseId - Course ID to check
       * @returns {boolean} Whether course is expanded
       */
      isCourseExpanded: (courseId) => {
        const state = get();
        const expanded = Array.isArray(state.expandedCourses)
          ? new Set(state.expandedCourses)
          : new Set();
        return expanded.has(courseId);
      },

      /**
       * Open assign modal
       * @param {string} courseId - Course ID to assign
       */
      openAssignModal: (courseId) =>
        set({
          selectedCourse: courseId,
          isAssignModalOpen: true,
        }),

      /**
       * Close assign modal
       */
      closeAssignModal: () =>
        set({
          selectedCourse: null,
          isAssignModalOpen: false,
        }),

      /**
       * Open report modal
       */
      openReportModal: () => set({ isReportModalOpen: true }),

      /**
       * Close report modal
       */
      closeReportModal: () => set({ isReportModalOpen: false }),

      // Cache management
      /**
       * Set courses cache
       * @param {Object} data - Courses data to cache
       */
      setCoursesCache: (data) =>
        set({
          coursesCache: data,
          cacheTimestamp: Date.now(),
        }),

      /**
       * Get cached courses if still valid
       * @returns {Object|null} Cached courses or null
       */
      getCachedCourses: () => {
        const state = get();
        if (
          state.coursesCache &&
          state.cacheTimestamp &&
          Date.now() - state.cacheTimestamp < CACHE_DURATION
        ) {
          return state.coursesCache;
        }
        return null;
      },

      /**
       * Set options cache
       * @param {string} courseId - Course ID
       * @param {Object} data - Options data to cache
       */
      setOptionsCache: (courseId, data) =>
        set((state) => ({
          optionsCache: {
            ...state.optionsCache,
            [courseId]: { data, timestamp: Date.now() },
          },
        })),

      /**
       * Get cached options if still valid
       * @param {string} courseId - Course ID
       * @returns {Object|null} Cached options or null
       */
      getCachedOptions: (courseId) => {
        const state = get();
        if (
          state.optionsCache &&
          state.optionsCache[courseId] &&
          Date.now() - state.optionsCache[courseId].timestamp < CACHE_DURATION
        ) {
          return state.optionsCache[courseId].data;
        }
        return null;
      },

      /**
       * Set report cache
       * @param {Object} data - Report data to cache
       */
      setReportCache: (data) =>
        set({
          reportCache: data,
          cacheTimestamp: Date.now(),
        }),

      /**
       * Get cached report if still valid
       * @returns {Object|null} Cached report or null
       */
      getCachedReport: () => {
        const state = get();
        if (
          state.reportCache &&
          state.cacheTimestamp &&
          Date.now() - state.cacheTimestamp < CACHE_DURATION
        ) {
          return state.reportCache;
        }
        return null;
      },

      /**
       * Clear all cache
       */
      clearCache: () =>
        set({
          coursesCache: null,
          optionsCache: null,
          reportCache: null,
          cacheTimestamp: null,
        }),
    }),
    {
      name: 'assign-course-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filters: state.filters,
        expandedCourses: Array.isArray(state.expandedCourses)
          ? state.expandedCourses
          : [],
      }),
    }
  )
);

export default useAssignCourseStore;

