/**
 * Course Management Store
 * 
 * Zustand store for course management UI state.
 * Manages filter state, selection state, and UI preferences.
 * 
 * @typedef {Object} FilterState
 * @property {string} search - Search query
 * @property {string|null} instructorId - Instructor ID filter
 * @property {string|null} level - Course level filter
 * @property {string|null} organizationId - Organization ID filter
 * @property {string|null} classId - Class ID filter
 * @property {string|null} subjectId - Subject ID filter
 * @property {string|null} status - Status filter ('active' | 'inactive')
 * @property {string} sortBy - Sort option ('newest' | 'oldest' | 'title_asc' | 'title_desc')
 * @property {string|null} dateFrom - Start date filter (ISO date)
 * @property {string|null} dateTo - End date filter (ISO date)
 * 
 * @typedef {Object} CourseManagementState
 * @property {FilterState} filters - Filter state
 * @property {string[]} selectedCourses - Selected course IDs
 * @property {boolean} isFilterOpen - Whether filter section is open (for mobile)
 * @property {number} currentPage - Current page number
 */

import { create } from 'zustand';

/**
 * Course Management Store
 */
const useCourseManagementStore = create((set, get) => ({
  // Initial filter state
  filters: {
    search: '',
    instructorId: null,
    level: null,
    organizationId: null,
    classId: null,
    subjectId: null,
    status: null,
    sortBy: 'newest',
    dateFrom: null,
    dateTo: null,
  },

  // Selection state
  selectedCourses: [],

  // UI state
  isFilterOpen: true, // For mobile responsive design
  currentPage: 1,

  /**
   * Set all filters at once
   * @param {FilterState} filters - New filter state
   */
  setFilters: (filters) => set({ filters }),

  /**
   * Update a single filter
   * @param {string} key - Filter key
   * @param {*} value - Filter value
   */
  updateFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
      currentPage: 1, // Reset to page 1 on filter change
    })),

  /**
   * Clear all filters
   */
  clearFilters: () =>
    set({
      filters: {
        search: '',
        instructorId: null,
        level: null,
        organizationId: null,
        classId: null,
        subjectId: null,
        status: null,
        sortBy: 'newest',
        dateFrom: null,
        dateTo: null,
      },
      currentPage: 1,
      selectedCourses: [], // Clear selection when filters are cleared
    }),

  /**
   * Set selected courses
   * @param {string[]} courseIds - Selected course IDs
   */
  setSelectedCourses: (courseIds) => set({ selectedCourses: courseIds }),

  /**
   * Toggle course selection
   * @param {string} courseId - Course ID to toggle
   */
  toggleCourseSelection: (courseId) =>
    set((state) => {
      const isSelected = state.selectedCourses.includes(courseId);
      return {
        selectedCourses: isSelected
          ? state.selectedCourses.filter((id) => id !== courseId)
          : [...state.selectedCourses, courseId],
      };
    }),

  /**
   * Select all courses on current page
   * @param {string[]} courseIds - All course IDs on current page
   */
  selectAllCourses: (courseIds) => set({ selectedCourses: courseIds }),

  /**
   * Deselect all courses
   */
  clearSelection: () => set({ selectedCourses: [] }),

  /**
   * Toggle filter section (for mobile)
   */
  toggleFilterOpen: () =>
    set((state) => ({ isFilterOpen: !state.isFilterOpen })),

  /**
   * Set current page
   * @param {number} page - Page number
   */
  setCurrentPage: (page) =>
    set({ currentPage: page, selectedCourses: [] }), // Clear selection on page change
}));

export default useCourseManagementStore;

