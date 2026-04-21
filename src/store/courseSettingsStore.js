/**
 * Course Settings Store
 * 
 * Zustand store for managing course settings data with caching.
 * Handles all course settings modules: categories, subcategories, types, etc.
 * 
 * Features:
 * - 5-minute cache duration
 * - Loading states per module
 * - Error handling
 * - Optimistic updates
 * - Cache invalidation on mutations
 */

import { create } from 'zustand';
import apiClient from '@/lib/api/client.js';

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

/**
 * Course Settings Store
 */
const useCourseSettingsStore = create((set, get) => ({
  // Cache data
  categories: [],
  subcategories: [],
  courseTypes: [],
  programTypes: [],
  courseLevels: [],
  courseSkills: [],
  testimonials: [],
  accessControl: {},

  // Loading states
  loading: {
    categories: false,
    subcategories: false,
    courseTypes: false,
    programTypes: false,
    courseLevels: false,
    courseSkills: false,
    testimonials: false,
    accessControl: false,
  },

  // Error states
  errors: {
    categories: null,
    subcategories: null,
    courseTypes: null,
    programTypes: null,
    courseLevels: null,
    courseSkills: null,
    testimonials: null,
    accessControl: null,
  },

  // Cache timestamps
  cacheTimestamp: {
    categories: null,
    subcategories: null,
    courseTypes: null,
    programTypes: null,
    courseLevels: null,
    courseSkills: null,
    testimonials: null,
    accessControl: null,
  },

  /**
   * Check if cache is valid for a module
   * @param {string} module - Module name
   * @returns {boolean} True if cache is valid
   */
  isCacheValid: (module) => {
    const timestamp = get().cacheTimestamp[module];
    if (!timestamp) return false;
    return Date.now() - timestamp < CACHE_DURATION;
  },

  /**
   * Clear cache for a specific module
   * @param {string} module - Module name
   */
  clearCache: (module) => {
    set((state) => ({
      cacheTimestamp: {
        ...state.cacheTimestamp,
        [module]: null,
      },
    }));
  },

  /**
   * Clear all caches
   */
  clearAllCache: () => {
    set({
      cacheTimestamp: {
        categories: null,
        subcategories: null,
        courseTypes: null,
        programTypes: null,
        courseLevels: null,
        courseSkills: null,
        testimonials: null,
        accessControl: null,
      },
    });
  },

  /**
   * Refetch all course settings data (useful when access control changes)
   */
  refetchAll: async () => {
    const state = get();
    const promises = [];
    
    // Refetch all modules in parallel
    if (state.fetchCategories) promises.push(state.fetchCategories(true));
    if (state.fetchSubcategories) promises.push(state.fetchSubcategories(true));
    if (state.fetchCourseTypes) promises.push(state.fetchCourseTypes(true));
    if (state.fetchProgramTypes) promises.push(state.fetchProgramTypes(true));
    if (state.fetchCourseLevels) promises.push(state.fetchCourseLevels(true));
    if (state.fetchCourseSkills) promises.push(state.fetchCourseSkills(true));
    if (state.fetchTestimonials) promises.push(state.fetchTestimonials(true));
    
    await Promise.allSettled(promises);
  },

  // ==================== CATEGORIES ====================

  /**
   * Fetch categories
   * @param {boolean} forceRefresh - Force refresh even if cache is valid
   * @param {Object} filters - Optional filters
   */
  fetchCategories: async (forceRefresh = false, filters = {}) => {
    const state = get();
    
    // Check cache validity
    if (!forceRefresh && state.isCacheValid('categories') && state.categories.length > 0) {
      return state.categories;
    }

    set((prev) => ({
      loading: { ...prev.loading, categories: true },
      errors: { ...prev.errors, categories: null },
    }));

    try {
      const queryParams = new URLSearchParams();
      if (filters.org_id) queryParams.append('org_id', filters.org_id);
      if (filters.status !== undefined) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);

      const endpoint = `/course-settings/categories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get(endpoint);

      if (response.success) {
        const categories = response.data || [];
        set({
          categories,
          loading: { ...get().loading, categories: false },
          errors: { ...get().errors, categories: null },
          cacheTimestamp: { ...get().cacheTimestamp, categories: Date.now() },
        });
        return categories;
      } else {
        throw new Error(response.error || 'Failed to fetch categories');
      }
    } catch (error) {
      // Silently handle access denied errors (expected when superadmin restricts access)
      const isAccessDenied = error.message?.includes('Access denied') || error.message?.includes("don't have read permission");
      if (!isAccessDenied) {
        console.error('Error fetching categories:', error);
      }
      set((prev) => ({
        categories: isAccessDenied ? [] : prev.categories, // Clear data if access denied
        loading: { ...prev.loading, categories: false },
        errors: { ...prev.errors, categories: isAccessDenied ? null : (error.message || 'Failed to fetch categories') },
      }));
      if (!isAccessDenied) {
        throw error;
      }
      return []; // Return empty array for access denied
    }
  },

  /**
   * Create category
   */
  createCategory: async (data) => {
    set((prev) => ({
      loading: { ...prev.loading, categories: true },
      errors: { ...prev.errors, categories: null },
    }));

    try {
      const response = await apiClient.post('/course-settings/categories', data);

      if (response.success) {
        const newCategory = response.data;
        set((prev) => ({
          categories: [...prev.categories, newCategory],
          loading: { ...prev.loading, categories: false },
          errors: { ...prev.errors, categories: null },
        }));
        // Clear cache to force refresh on next fetch
        get().clearCache('categories');
        return newCategory;
      } else {
        throw new Error(response.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      set((prev) => ({
        loading: { ...prev.loading, categories: false },
        errors: { ...prev.errors, categories: error.message || 'Failed to create category' },
      }));
      throw error;
    }
  },

  /**
   * Update category
   */
  updateCategory: async (id, data) => {
    set((prev) => ({
      loading: { ...prev.loading, categories: true },
      errors: { ...prev.errors, categories: null },
    }));

    try {
      const response = await apiClient.put(`/course-settings/categories/${id}`, data);

      if (response.success) {
        const updatedCategory = response.data;
        set((prev) => ({
          categories: prev.categories.map((cat) => (cat.id === id ? updatedCategory : cat)),
          loading: { ...prev.loading, categories: false },
          errors: { ...prev.errors, categories: null },
        }));
        get().clearCache('categories');
        return updatedCategory;
      } else {
        throw new Error(response.error || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      set((prev) => ({
        loading: { ...prev.loading, categories: false },
        errors: { ...prev.errors, categories: error.message || 'Failed to update category' },
      }));
      throw error;
    }
  },

  /**
   * Delete category
   */
  deleteCategory: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, categories: true },
      errors: { ...prev.errors, categories: null },
    }));

    try {
      const response = await apiClient.delete(`/course-settings/categories/${id}`);

      if (response.success) {
        set((prev) => ({
          categories: prev.categories.filter((cat) => cat.id !== id),
          loading: { ...prev.loading, categories: false },
          errors: { ...prev.errors, categories: null },
        }));
        get().clearCache('categories');
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      set((prev) => ({
        loading: { ...prev.loading, categories: false },
        errors: { ...prev.errors, categories: error.message || 'Failed to delete category' },
      }));
      throw error;
    }
  },

  /**
   * Toggle category status
   */
  toggleCategoryStatus: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, categories: true },
      errors: { ...prev.errors, categories: null },
    }));

    try {
      const response = await apiClient.patch(`/course-settings/categories/${id}/toggle`);

      if (response.success) {
        const updatedCategory = response.data;
        set((prev) => ({
          categories: prev.categories.map((cat) => (cat.id === id ? updatedCategory : cat)),
          loading: { ...prev.loading, categories: false },
          errors: { ...prev.errors, categories: null },
        }));
        get().clearCache('categories');
        return updatedCategory;
      } else {
        throw new Error(response.error || 'Failed to toggle category status');
      }
    } catch (error) {
      console.error('Error toggling category status:', error);
      set((prev) => ({
        loading: { ...prev.loading, categories: false },
        errors: { ...prev.errors, categories: error.message || 'Failed to toggle category status' },
      }));
      throw error;
    }
  },

  // ==================== SUBCATEGORIES ====================

  fetchSubcategories: async (forceRefresh = false, filters = {}) => {
    const state = get();
    
    if (!forceRefresh && state.isCacheValid('subcategories') && state.subcategories.length > 0) {
      return state.subcategories;
    }

    set((prev) => ({
      loading: { ...prev.loading, subcategories: true },
      errors: { ...prev.errors, subcategories: null },
    }));

    try {
      const queryParams = new URLSearchParams();
      if (filters.category_id) queryParams.append('category_id', filters.category_id);
      if (filters.org_id) queryParams.append('org_id', filters.org_id);
      if (filters.status !== undefined) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);

      const endpoint = `/course-settings/subcategories${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get(endpoint);

      if (response.success) {
        const subcategories = response.data || [];
        set({
          subcategories,
          loading: { ...get().loading, subcategories: false },
          errors: { ...get().errors, subcategories: null },
          cacheTimestamp: { ...get().cacheTimestamp, subcategories: Date.now() },
        });
        return subcategories;
      } else {
        throw new Error(response.error || 'Failed to fetch subcategories');
      }
    } catch (error) {
      // Silently handle access denied errors (expected when superadmin restricts access)
      const isAccessDenied = error.message?.includes('Access denied') || error.message?.includes("don't have read permission");
      if (!isAccessDenied) {
        console.error('Error fetching subcategories:', error);
      }
      set((prev) => ({
        subcategories: isAccessDenied ? [] : prev.subcategories, // Clear data if access denied
        loading: { ...prev.loading, subcategories: false },
        errors: { ...prev.errors, subcategories: isAccessDenied ? null : (error.message || 'Failed to fetch subcategories') },
      }));
      if (!isAccessDenied) {
        throw error;
      }
      return []; // Return empty array for access denied
    }
  },

  createSubcategory: async (data) => {
    set((prev) => ({
      loading: { ...prev.loading, subcategories: true },
      errors: { ...prev.errors, subcategories: null },
    }));

    try {
      const response = await apiClient.post('/course-settings/subcategories', data);

      if (response.success) {
        const newSubcategory = response.data;
        set((prev) => ({
          subcategories: [...prev.subcategories, newSubcategory],
          loading: { ...prev.loading, subcategories: false },
          errors: { ...prev.errors, subcategories: null },
        }));
        get().clearCache('subcategories');
        return newSubcategory;
      } else {
        throw new Error(response.error || 'Failed to create subcategory');
      }
    } catch (error) {
      console.error('Error creating subcategory:', error);
      set((prev) => ({
        loading: { ...prev.loading, subcategories: false },
        errors: { ...prev.errors, subcategories: error.message || 'Failed to create subcategory' },
      }));
      throw error;
    }
  },

  updateSubcategory: async (id, data) => {
    set((prev) => ({
      loading: { ...prev.loading, subcategories: true },
      errors: { ...prev.errors, subcategories: null },
    }));

    try {
      const response = await apiClient.put(`/course-settings/subcategories/${id}`, data);

      if (response.success) {
        const updatedSubcategory = response.data;
        set((prev) => ({
          subcategories: prev.subcategories.map((sub) => (sub.id === id ? updatedSubcategory : sub)),
          loading: { ...prev.loading, subcategories: false },
          errors: { ...prev.errors, subcategories: null },
        }));
        get().clearCache('subcategories');
        return updatedSubcategory;
      } else {
        throw new Error(response.error || 'Failed to update subcategory');
      }
    } catch (error) {
      console.error('Error updating subcategory:', error);
      set((prev) => ({
        loading: { ...prev.loading, subcategories: false },
        errors: { ...prev.errors, subcategories: error.message || 'Failed to update subcategory' },
      }));
      throw error;
    }
  },

  deleteSubcategory: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, subcategories: true },
      errors: { ...prev.errors, subcategories: null },
    }));

    try {
      const response = await apiClient.delete(`/course-settings/subcategories/${id}`);

      if (response.success) {
        set((prev) => ({
          subcategories: prev.subcategories.filter((sub) => sub.id !== id),
          loading: { ...prev.loading, subcategories: false },
          errors: { ...prev.errors, subcategories: null },
        }));
        get().clearCache('subcategories');
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete subcategory');
      }
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      set((prev) => ({
        loading: { ...prev.loading, subcategories: false },
        errors: { ...prev.errors, subcategories: error.message || 'Failed to delete subcategory' },
      }));
      throw error;
    }
  },

  toggleSubcategoryStatus: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, subcategories: true },
      errors: { ...prev.errors, subcategories: null },
    }));

    try {
      const response = await apiClient.patch(`/course-settings/subcategories/${id}/toggle`);

      if (response.success) {
        const updatedSubcategory = response.data;
        set((prev) => ({
          subcategories: prev.subcategories.map((sub) => (sub.id === id ? updatedSubcategory : sub)),
          loading: { ...prev.loading, subcategories: false },
          errors: { ...prev.errors, subcategories: null },
        }));
        get().clearCache('subcategories');
        return updatedSubcategory;
      } else {
        throw new Error(response.error || 'Failed to toggle subcategory status');
      }
    } catch (error) {
      console.error('Error toggling subcategory status:', error);
      set((prev) => ({
        loading: { ...prev.loading, subcategories: false },
        errors: { ...prev.errors, subcategories: error.message || 'Failed to toggle subcategory status' },
      }));
      throw error;
    }
  },

  // ==================== COURSE TYPES ====================

  fetchCourseTypes: async (forceRefresh = false, filters = {}) => {
    const state = get();
    
    if (!forceRefresh && state.isCacheValid('courseTypes') && state.courseTypes.length > 0) {
      return state.courseTypes;
    }

    set((prev) => ({
      loading: { ...prev.loading, courseTypes: true },
      errors: { ...prev.errors, courseTypes: null },
    }));

    try {
      const queryParams = new URLSearchParams();
      if (filters.org_id) queryParams.append('org_id', filters.org_id);
      if (filters.status !== undefined) queryParams.append('status', filters.status);
      if (filters.fixed !== undefined) queryParams.append('fixed', filters.fixed);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);

      const endpoint = `/course-settings/types${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get(endpoint);

      if (response.success) {
        const courseTypes = response.data || [];
        set({
          courseTypes,
          loading: { ...get().loading, courseTypes: false },
          errors: { ...get().errors, courseTypes: null },
          cacheTimestamp: { ...get().cacheTimestamp, courseTypes: Date.now() },
        });
        return courseTypes;
      } else {
        throw new Error(response.error || 'Failed to fetch course types');
      }
    } catch (error) {
      // Silently handle access denied errors (expected when superadmin restricts access)
      const isAccessDenied = error.message?.includes('Access denied') || error.message?.includes("don't have read permission");
      if (!isAccessDenied) {
        console.error('Error fetching course types:', error);
      }
      set((prev) => ({
        courseTypes: isAccessDenied ? [] : prev.courseTypes, // Clear data if access denied
        loading: { ...prev.loading, courseTypes: false },
        errors: { ...prev.errors, courseTypes: isAccessDenied ? null : (error.message || 'Failed to fetch course types') },
      }));
      if (!isAccessDenied) {
        throw error;
      }
      return []; // Return empty array for access denied
    }
  },

  createCourseType: async (data) => {
    set((prev) => ({
      loading: { ...prev.loading, courseTypes: true },
      errors: { ...prev.errors, courseTypes: null },
    }));

    try {
      const response = await apiClient.post('/course-settings/types', data);

      if (response.success) {
        const newCourseType = response.data;
        set((prev) => ({
          courseTypes: [...prev.courseTypes, newCourseType],
          loading: { ...prev.loading, courseTypes: false },
          errors: { ...prev.errors, courseTypes: null },
        }));
        get().clearCache('courseTypes');
        return newCourseType;
      } else {
        throw new Error(response.error || 'Failed to create course type');
      }
    } catch (error) {
      console.error('Error creating course type:', error);
      set((prev) => ({
        loading: { ...prev.loading, courseTypes: false },
        errors: { ...prev.errors, courseTypes: error.message || 'Failed to create course type' },
      }));
      throw error;
    }
  },

  updateCourseType: async (id, data) => {
    set((prev) => ({
      loading: { ...prev.loading, courseTypes: true },
      errors: { ...prev.errors, courseTypes: null },
    }));

    try {
      const response = await apiClient.put(`/course-settings/types/${id}`, data);

      if (response.success) {
        const updatedCourseType = response.data;
        set((prev) => ({
          courseTypes: prev.courseTypes.map((type) => (type.id === id ? updatedCourseType : type)),
          loading: { ...prev.loading, courseTypes: false },
          errors: { ...prev.errors, courseTypes: null },
        }));
        get().clearCache('courseTypes');
        return updatedCourseType;
      } else {
        throw new Error(response.error || 'Failed to update course type');
      }
    } catch (error) {
      console.error('Error updating course type:', error);
      set((prev) => ({
        loading: { ...prev.loading, courseTypes: false },
        errors: { ...prev.errors, courseTypes: error.message || 'Failed to update course type' },
      }));
      throw error;
    }
  },

  deleteCourseType: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, courseTypes: true },
      errors: { ...prev.errors, courseTypes: null },
    }));

    try {
      const response = await apiClient.delete(`/course-settings/types/${id}`);

      if (response.success) {
        set((prev) => ({
          courseTypes: prev.courseTypes.filter((type) => type.id !== id),
          loading: { ...prev.loading, courseTypes: false },
          errors: { ...prev.errors, courseTypes: null },
        }));
        get().clearCache('courseTypes');
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete course type');
      }
    } catch (error) {
      console.error('Error deleting course type:', error);
      set((prev) => ({
        loading: { ...prev.loading, courseTypes: false },
        errors: { ...prev.errors, courseTypes: error.message || 'Failed to delete course type' },
      }));
      throw error;
    }
  },

  toggleCourseTypeStatus: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, courseTypes: true },
      errors: { ...prev.errors, courseTypes: null },
    }));

    try {
      const response = await apiClient.patch(`/course-settings/types/${id}/toggle`);

      if (response.success) {
        const updatedCourseType = response.data;
        set((prev) => ({
          courseTypes: prev.courseTypes.map((type) => (type.id === id ? updatedCourseType : type)),
          loading: { ...prev.loading, courseTypes: false },
          errors: { ...prev.errors, courseTypes: null },
        }));
        get().clearCache('courseTypes');
        return updatedCourseType;
      } else {
        throw new Error(response.error || 'Failed to toggle course type status');
      }
    } catch (error) {
      console.error('Error toggling course type status:', error);
      set((prev) => ({
        loading: { ...prev.loading, courseTypes: false },
        errors: { ...prev.errors, courseTypes: error.message || 'Failed to toggle course type status' },
      }));
      throw error;
    }
  },

  // ==================== PROGRAM TYPES ====================

  fetchProgramTypes: async (forceRefresh = false, filters = {}) => {
    const state = get();
    
    if (!forceRefresh && state.isCacheValid('programTypes') && state.programTypes.length > 0) {
      return state.programTypes;
    }

    set((prev) => ({
      loading: { ...prev.loading, programTypes: true },
      errors: { ...prev.errors, programTypes: null },
    }));

    try {
      const queryParams = new URLSearchParams();
      if (filters.org_id) queryParams.append('org_id', filters.org_id);
      if (filters.status !== undefined) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);

      const endpoint = `/course-settings/program-types${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get(endpoint);

      if (response.success) {
        const programTypes = response.data || [];
        set({
          programTypes,
          loading: { ...get().loading, programTypes: false },
          errors: { ...get().errors, programTypes: null },
          cacheTimestamp: { ...get().cacheTimestamp, programTypes: Date.now() },
        });
        return programTypes;
      } else {
        throw new Error(response.error || 'Failed to fetch program types');
      }
    } catch (error) {
      // Silently handle access denied errors (expected when superadmin restricts access)
      const isAccessDenied = error.message?.includes('Access denied') || error.message?.includes("don't have read permission");
      if (!isAccessDenied) {
        console.error('Error fetching program types:', error);
      }
      set((prev) => ({
        programTypes: isAccessDenied ? [] : prev.programTypes, // Clear data if access denied
        loading: { ...prev.loading, programTypes: false },
        errors: { ...prev.errors, programTypes: isAccessDenied ? null : (error.message || 'Failed to fetch program types') },
      }));
      if (!isAccessDenied) {
        throw error;
      }
      return []; // Return empty array for access denied
    }
  },

  createProgramType: async (data) => {
    set((prev) => ({
      loading: { ...prev.loading, programTypes: true },
      errors: { ...prev.errors, programTypes: null },
    }));

    try {
      const response = await apiClient.post('/course-settings/program-types', data);

      if (response.success) {
        const newProgramType = response.data;
        set((prev) => ({
          programTypes: [...prev.programTypes, newProgramType],
          loading: { ...prev.loading, programTypes: false },
          errors: { ...prev.errors, programTypes: null },
        }));
        get().clearCache('programTypes');
        return newProgramType;
      } else {
        throw new Error(response.error || 'Failed to create program type');
      }
    } catch (error) {
      console.error('Error creating program type:', error);
      set((prev) => ({
        loading: { ...prev.loading, programTypes: false },
        errors: { ...prev.errors, programTypes: error.message || 'Failed to create program type' },
      }));
      throw error;
    }
  },

  updateProgramType: async (id, data) => {
    set((prev) => ({
      loading: { ...prev.loading, programTypes: true },
      errors: { ...prev.errors, programTypes: null },
    }));

    try {
      const response = await apiClient.put(`/course-settings/program-types/${id}`, data);

      if (response.success) {
        const updatedProgramType = response.data;
        set((prev) => ({
          programTypes: prev.programTypes.map((type) => (type.id === id ? updatedProgramType : type)),
          loading: { ...prev.loading, programTypes: false },
          errors: { ...prev.errors, programTypes: null },
        }));
        get().clearCache('programTypes');
        return updatedProgramType;
      } else {
        throw new Error(response.error || 'Failed to update program type');
      }
    } catch (error) {
      console.error('Error updating program type:', error);
      set((prev) => ({
        loading: { ...prev.loading, programTypes: false },
        errors: { ...prev.errors, programTypes: error.message || 'Failed to update program type' },
      }));
      throw error;
    }
  },

  deleteProgramType: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, programTypes: true },
      errors: { ...prev.errors, programTypes: null },
    }));

    try {
      const response = await apiClient.delete(`/course-settings/program-types/${id}`);

      if (response.success) {
        set((prev) => ({
          programTypes: prev.programTypes.filter((type) => type.id !== id),
          loading: { ...prev.loading, programTypes: false },
          errors: { ...prev.errors, programTypes: null },
        }));
        get().clearCache('programTypes');
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete program type');
      }
    } catch (error) {
      console.error('Error deleting program type:', error);
      set((prev) => ({
        loading: { ...prev.loading, programTypes: false },
        errors: { ...prev.errors, programTypes: error.message || 'Failed to delete program type' },
      }));
      throw error;
    }
  },

  toggleProgramTypeStatus: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, programTypes: true },
      errors: { ...prev.errors, programTypes: null },
    }));

    try {
      const response = await apiClient.patch(`/course-settings/program-types/${id}/toggle`);

      if (response.success) {
        const updatedProgramType = response.data;
        set((prev) => ({
          programTypes: prev.programTypes.map((type) => (type.id === id ? updatedProgramType : type)),
          loading: { ...prev.loading, programTypes: false },
          errors: { ...prev.errors, programTypes: null },
        }));
        get().clearCache('programTypes');
        return updatedProgramType;
      } else {
        throw new Error(response.error || 'Failed to toggle program type status');
      }
    } catch (error) {
      console.error('Error toggling program type status:', error);
      set((prev) => ({
        loading: { ...prev.loading, programTypes: false },
        errors: { ...prev.errors, programTypes: error.message || 'Failed to toggle program type status' },
      }));
      throw error;
    }
  },

  // ==================== COURSE LEVELS ====================

  fetchCourseLevels: async (forceRefresh = false, filters = {}) => {
    const state = get();
    
    if (!forceRefresh && state.isCacheValid('courseLevels') && state.courseLevels.length > 0) {
      return state.courseLevels;
    }

    set((prev) => ({
      loading: { ...prev.loading, courseLevels: true },
      errors: { ...prev.errors, courseLevels: null },
    }));

    try {
      const queryParams = new URLSearchParams();
      if (filters.org_id) queryParams.append('org_id', filters.org_id);
      if (filters.status !== undefined) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);

      const endpoint = `/course-settings/levels${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get(endpoint);

      if (response.success) {
        const courseLevels = response.data || [];
        set({
          courseLevels,
          loading: { ...get().loading, courseLevels: false },
          errors: { ...get().errors, courseLevels: null },
          cacheTimestamp: { ...get().cacheTimestamp, courseLevels: Date.now() },
        });
        return courseLevels;
      } else {
        throw new Error(response.error || 'Failed to fetch course levels');
      }
    } catch (error) {
      // Silently handle access denied errors (expected when superadmin restricts access)
      const isAccessDenied = error.message?.includes('Access denied') || error.message?.includes("don't have read permission");
      if (!isAccessDenied) {
        console.error('Error fetching course levels:', error);
      }
      set((prev) => ({
        courseLevels: isAccessDenied ? [] : prev.courseLevels, // Clear data if access denied
        loading: { ...prev.loading, courseLevels: false },
        errors: { ...prev.errors, courseLevels: isAccessDenied ? null : (error.message || 'Failed to fetch course levels') },
      }));
      if (!isAccessDenied) {
        throw error;
      }
      return []; // Return empty array for access denied
    }
  },

  createCourseLevel: async (data) => {
    set((prev) => ({
      loading: { ...prev.loading, courseLevels: true },
      errors: { ...prev.errors, courseLevels: null },
    }));

    try {
      const response = await apiClient.post('/course-settings/levels', data);

      if (response.success) {
        const newCourseLevel = response.data;
        set((prev) => ({
          courseLevels: [...prev.courseLevels, newCourseLevel],
          loading: { ...prev.loading, courseLevels: false },
          errors: { ...prev.errors, courseLevels: null },
        }));
        get().clearCache('courseLevels');
        return newCourseLevel;
      } else {
        throw new Error(response.error || 'Failed to create course level');
      }
    } catch (error) {
      console.error('Error creating course level:', error);
      set((prev) => ({
        loading: { ...prev.loading, courseLevels: false },
        errors: { ...prev.errors, courseLevels: error.message || 'Failed to create course level' },
      }));
      throw error;
    }
  },

  updateCourseLevel: async (id, data) => {
    set((prev) => ({
      loading: { ...prev.loading, courseLevels: true },
      errors: { ...prev.errors, courseLevels: null },
    }));

    try {
      const response = await apiClient.put(`/course-settings/levels/${id}`, data);

      if (response.success) {
        const updatedCourseLevel = response.data;
        set((prev) => ({
          courseLevels: prev.courseLevels.map((level) => (level.id === id ? updatedCourseLevel : level)),
          loading: { ...prev.loading, courseLevels: false },
          errors: { ...prev.errors, courseLevels: null },
        }));
        get().clearCache('courseLevels');
        return updatedCourseLevel;
      } else {
        throw new Error(response.error || 'Failed to update course level');
      }
    } catch (error) {
      console.error('Error updating course level:', error);
      set((prev) => ({
        loading: { ...prev.loading, courseLevels: false },
        errors: { ...prev.errors, courseLevels: error.message || 'Failed to update course level' },
      }));
      throw error;
    }
  },

  deleteCourseLevel: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, courseLevels: true },
      errors: { ...prev.errors, courseLevels: null },
    }));

    try {
      const response = await apiClient.delete(`/course-settings/levels/${id}`);

      if (response.success) {
        set((prev) => ({
          courseLevels: prev.courseLevels.filter((level) => level.id !== id),
          loading: { ...prev.loading, courseLevels: false },
          errors: { ...prev.errors, courseLevels: null },
        }));
        get().clearCache('courseLevels');
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete course level');
      }
    } catch (error) {
      console.error('Error deleting course level:', error);
      set((prev) => ({
        loading: { ...prev.loading, courseLevels: false },
        errors: { ...prev.errors, courseLevels: error.message || 'Failed to delete course level' },
      }));
      throw error;
    }
  },

  toggleCourseLevelStatus: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, courseLevels: true },
      errors: { ...prev.errors, courseLevels: null },
    }));

    try {
      const response = await apiClient.patch(`/course-settings/levels/${id}/toggle`);

      if (response.success) {
        const updatedCourseLevel = response.data;
        set((prev) => ({
          courseLevels: prev.courseLevels.map((level) => (level.id === id ? updatedCourseLevel : level)),
          loading: { ...prev.loading, courseLevels: false },
          errors: { ...prev.errors, courseLevels: null },
        }));
        get().clearCache('courseLevels');
        return updatedCourseLevel;
      } else {
        throw new Error(response.error || 'Failed to toggle course level status');
      }
    } catch (error) {
      console.error('Error toggling course level status:', error);
      set((prev) => ({
        loading: { ...prev.loading, courseLevels: false },
        errors: { ...prev.errors, courseLevels: error.message || 'Failed to toggle course level status' },
      }));
      throw error;
    }
  },

  // ==================== COURSE SKILLS ====================

  fetchCourseSkills: async (forceRefresh = false, filters = {}) => {
    const state = get();
    
    if (!forceRefresh && state.isCacheValid('courseSkills') && state.courseSkills.length > 0) {
      return state.courseSkills;
    }

    set((prev) => ({
      loading: { ...prev.loading, courseSkills: true },
      errors: { ...prev.errors, courseSkills: null },
    }));

    try {
      const queryParams = new URLSearchParams();
      if (filters.org_id) queryParams.append('org_id', filters.org_id);
      if (filters.category_id) queryParams.append('category_id', filters.category_id);
      if (filters.subcategory_id) queryParams.append('subcategory_id', filters.subcategory_id);
      if (filters.status !== undefined) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);

      const endpoint = `/course-settings/skills${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get(endpoint);

      if (response.success) {
        const courseSkills = response.data || [];
        set({
          courseSkills,
          loading: { ...get().loading, courseSkills: false },
          errors: { ...get().errors, courseSkills: null },
          cacheTimestamp: { ...get().cacheTimestamp, courseSkills: Date.now() },
        });
        return courseSkills;
      } else {
        throw new Error(response.error || 'Failed to fetch course skills');
      }
    } catch (error) {
      // Silently handle access denied errors (expected when superadmin restricts access)
      const isAccessDenied = error.message?.includes('Access denied') || error.message?.includes("don't have read permission");
      if (!isAccessDenied) {
        console.error('Error fetching course skills:', error);
      }
      set((prev) => ({
        courseSkills: isAccessDenied ? [] : prev.courseSkills, // Clear data if access denied
        loading: { ...prev.loading, courseSkills: false },
        errors: { ...prev.errors, courseSkills: isAccessDenied ? null : (error.message || 'Failed to fetch course skills') },
      }));
      if (!isAccessDenied) {
        throw error;
      }
      return []; // Return empty array for access denied
    }
  },

  createCourseSkill: async (data) => {
    set((prev) => ({
      loading: { ...prev.loading, courseSkills: true },
      errors: { ...prev.errors, courseSkills: null },
    }));

    try {
      const response = await apiClient.post('/course-settings/skills', data);

      if (response.success) {
        const newCourseSkill = response.data;
        set((prev) => ({
          courseSkills: [...prev.courseSkills, newCourseSkill],
          loading: { ...prev.loading, courseSkills: false },
          errors: { ...prev.errors, courseSkills: null },
        }));
        get().clearCache('courseSkills');
        return newCourseSkill;
      } else {
        throw new Error(response.error || 'Failed to create course skill');
      }
    } catch (error) {
      console.error('Error creating course skill:', error);
      set((prev) => ({
        loading: { ...prev.loading, courseSkills: false },
        errors: { ...prev.errors, courseSkills: error.message || 'Failed to create course skill' },
      }));
      throw error;
    }
  },

  updateCourseSkill: async (id, data) => {
    set((prev) => ({
      loading: { ...prev.loading, courseSkills: true },
      errors: { ...prev.errors, courseSkills: null },
    }));

    try {
      const response = await apiClient.put(`/course-settings/skills/${id}`, data);

      if (response.success) {
        const updatedCourseSkill = response.data;
        set((prev) => ({
          courseSkills: prev.courseSkills.map((skill) => (skill.id === id ? updatedCourseSkill : skill)),
          loading: { ...prev.loading, courseSkills: false },
          errors: { ...prev.errors, courseSkills: null },
        }));
        get().clearCache('courseSkills');
        return updatedCourseSkill;
      } else {
        throw new Error(response.error || 'Failed to update course skill');
      }
    } catch (error) {
      console.error('Error updating course skill:', error);
      set((prev) => ({
        loading: { ...prev.loading, courseSkills: false },
        errors: { ...prev.errors, courseSkills: error.message || 'Failed to update course skill' },
      }));
      throw error;
    }
  },

  deleteCourseSkill: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, courseSkills: true },
      errors: { ...prev.errors, courseSkills: null },
    }));

    try {
      const response = await apiClient.delete(`/course-settings/skills/${id}`);

      if (response.success) {
        set((prev) => ({
          courseSkills: prev.courseSkills.filter((skill) => skill.id !== id),
          loading: { ...prev.loading, courseSkills: false },
          errors: { ...prev.errors, courseSkills: null },
        }));
        get().clearCache('courseSkills');
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete course skill');
      }
    } catch (error) {
      console.error('Error deleting course skill:', error);
      set((prev) => ({
        loading: { ...prev.loading, courseSkills: false },
        errors: { ...prev.errors, courseSkills: error.message || 'Failed to delete course skill' },
      }));
      throw error;
    }
  },

  toggleCourseSkillStatus: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, courseSkills: true },
      errors: { ...prev.errors, courseSkills: null },
    }));

    try {
      const response = await apiClient.patch(`/course-settings/skills/${id}/toggle`);

      if (response.success) {
        const updatedCourseSkill = response.data;
        set((prev) => ({
          courseSkills: prev.courseSkills.map((skill) => (skill.id === id ? updatedCourseSkill : skill)),
          loading: { ...prev.loading, courseSkills: false },
          errors: { ...prev.errors, courseSkills: null },
        }));
        get().clearCache('courseSkills');
        return updatedCourseSkill;
      } else {
        throw new Error(response.error || 'Failed to toggle course skill status');
      }
    } catch (error) {
      console.error('Error toggling course skill status:', error);
      set((prev) => ({
        loading: { ...prev.loading, courseSkills: false },
        errors: { ...prev.errors, courseSkills: error.message || 'Failed to toggle course skill status' },
      }));
      throw error;
    }
  },

  // ==================== TESTIMONIALS ====================

  fetchTestimonials: async (forceRefresh = false, filters = {}) => {
    const state = get();
    
    if (!forceRefresh && state.isCacheValid('testimonials') && state.testimonials.length > 0) {
      return state.testimonials;
    }

    set((prev) => ({
      loading: { ...prev.loading, testimonials: true },
      errors: { ...prev.errors, testimonials: null },
    }));

    try {
      const queryParams = new URLSearchParams();
      if (filters.org_id) queryParams.append('org_id', filters.org_id);
      if (filters.course_id) queryParams.append('course_id', filters.course_id);
      if (filters.status !== undefined) queryParams.append('status', filters.status);
      if (filters.rating) queryParams.append('rating', filters.rating);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.page) queryParams.append('page', filters.page);
      if (filters.limit) queryParams.append('limit', filters.limit);

      const endpoint = `/course-settings/testimonials${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiClient.get(endpoint);

      if (response.success) {
        const testimonials = response.data || [];
        set({
          testimonials,
          loading: { ...get().loading, testimonials: false },
          errors: { ...get().errors, testimonials: null },
          cacheTimestamp: { ...get().cacheTimestamp, testimonials: Date.now() },
        });
        return testimonials;
      } else {
        throw new Error(response.error || 'Failed to fetch testimonials');
      }
    } catch (error) {
      // Silently handle access denied errors (expected when superadmin restricts access)
      const isAccessDenied = error.message?.includes('Access denied') || error.message?.includes("don't have read permission");
      if (!isAccessDenied) {
        console.error('Error fetching testimonials:', error);
      }
      set((prev) => ({
        testimonials: isAccessDenied ? [] : prev.testimonials, // Clear data if access denied
        loading: { ...prev.loading, testimonials: false },
        errors: { ...prev.errors, testimonials: isAccessDenied ? null : (error.message || 'Failed to fetch testimonials') },
      }));
      if (!isAccessDenied) {
        throw error;
      }
      return []; // Return empty array for access denied
    }
  },

  createTestimonial: async (data) => {
    set((prev) => ({
      loading: { ...prev.loading, testimonials: true },
      errors: { ...prev.errors, testimonials: null },
    }));

    try {
      const response = await apiClient.post('/course-settings/testimonials', data);

      if (response.success) {
        const newTestimonial = response.data;
        set((prev) => ({
          testimonials: [...prev.testimonials, newTestimonial],
          loading: { ...prev.loading, testimonials: false },
          errors: { ...prev.errors, testimonials: null },
        }));
        get().clearCache('testimonials');
        return newTestimonial;
      } else {
        throw new Error(response.error || 'Failed to create testimonial');
      }
    } catch (error) {
      console.error('Error creating testimonial:', error);
      set((prev) => ({
        loading: { ...prev.loading, testimonials: false },
        errors: { ...prev.errors, testimonials: error.message || 'Failed to create testimonial' },
      }));
      throw error;
    }
  },

  updateTestimonial: async (id, data) => {
    set((prev) => ({
      loading: { ...prev.loading, testimonials: true },
      errors: { ...prev.errors, testimonials: null },
    }));

    try {
      const response = await apiClient.put(`/course-settings/testimonials/${id}`, data);

      if (response.success) {
        const updatedTestimonial = response.data;
        set((prev) => ({
          testimonials: prev.testimonials.map((test) => (test.id === id ? updatedTestimonial : test)),
          loading: { ...prev.loading, testimonials: false },
          errors: { ...prev.errors, testimonials: null },
        }));
        get().clearCache('testimonials');
        return updatedTestimonial;
      } else {
        throw new Error(response.error || 'Failed to update testimonial');
      }
    } catch (error) {
      console.error('Error updating testimonial:', error);
      set((prev) => ({
        loading: { ...prev.loading, testimonials: false },
        errors: { ...prev.errors, testimonials: error.message || 'Failed to update testimonial' },
      }));
      throw error;
    }
  },

  deleteTestimonial: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, testimonials: true },
      errors: { ...prev.errors, testimonials: null },
    }));

    try {
      const response = await apiClient.delete(`/course-settings/testimonials/${id}`);

      if (response.success) {
        set((prev) => ({
          testimonials: prev.testimonials.filter((test) => test.id !== id),
          loading: { ...prev.loading, testimonials: false },
          errors: { ...prev.errors, testimonials: null },
        }));
        get().clearCache('testimonials');
        return true;
      } else {
        throw new Error(response.error || 'Failed to delete testimonial');
      }
    } catch (error) {
      console.error('Error deleting testimonial:', error);
      set((prev) => ({
        loading: { ...prev.loading, testimonials: false },
        errors: { ...prev.errors, testimonials: error.message || 'Failed to delete testimonial' },
      }));
      throw error;
    }
  },

  toggleTestimonialStatus: async (id) => {
    set((prev) => ({
      loading: { ...prev.loading, testimonials: true },
      errors: { ...prev.errors, testimonials: null },
    }));

    try {
      const response = await apiClient.patch(`/course-settings/testimonials/${id}/toggle`);

      if (response.success) {
        const updatedTestimonial = response.data;
        set((prev) => ({
          testimonials: prev.testimonials.map((test) => (test.id === id ? updatedTestimonial : test)),
          loading: { ...prev.loading, testimonials: false },
          errors: { ...prev.errors, testimonials: null },
        }));
        get().clearCache('testimonials');
        return updatedTestimonial;
      } else {
        throw new Error(response.error || 'Failed to toggle testimonial status');
      }
    } catch (error) {
      console.error('Error toggling testimonial status:', error);
      set((prev) => ({
        loading: { ...prev.loading, testimonials: false },
        errors: { ...prev.errors, testimonials: error.message || 'Failed to toggle testimonial status' },
      }));
      throw error;
    }
  },

  // ==================== ACCESS CONTROL ====================

  /**
   * Fetch access control settings (superadmin only)
   */
  fetchAccessControl: async (forceRefresh = false, role = 'admin') => {
    const state = get();
    
    if (!forceRefresh && state.isCacheValid('accessControl') && Object.keys(state.accessControl).length > 0) {
      return state.accessControl;
    }

    set((prev) => ({
      loading: { ...prev.loading, accessControl: true },
      errors: { ...prev.errors, accessControl: null },
    }));

    try {
      const endpoint = `/course-settings/access-control?role=${role}`;
      const response = await apiClient.get(endpoint);

      if (response.success) {
        // Safety check: ensure data is a valid object, not an Error
        const data = response.data || {};
        const accessControl = (data && typeof data === 'object' && !(data instanceof Error) && data.constructor === Object)
          ? data
          : {};
        
        set({
          accessControl,
          loading: { ...get().loading, accessControl: false },
          errors: { ...get().errors, accessControl: null },
          cacheTimestamp: { ...get().cacheTimestamp, accessControl: Date.now() },
        });
        return accessControl;
      } else {
        throw new Error(response.error || 'Failed to fetch access control settings');
      }
    } catch (error) {
      // Silently handle access denied errors (expected when superadmin restricts access)
      const isAccessDenied = error.message?.includes('Access denied') || error.message?.includes("don't have read permission");
      if (!isAccessDenied) {
        console.error('Error fetching access control:', error);
      }
      set((prev) => ({
        accessControl: isAccessDenied ? {} : prev.accessControl, // Clear data if access denied
        loading: { ...prev.loading, accessControl: false },
        errors: { ...prev.errors, accessControl: isAccessDenied ? null : (error.message || 'Failed to fetch access control settings') },
      }));
      if (!isAccessDenied) {
        throw error;
      }
      return {}; // Return empty object for access denied
    }
  },

  /**
   * Update access control settings (superadmin only)
   */
  updateAccessControl: async (settings, role = 'admin') => {
    set((prev) => ({
      loading: { ...prev.loading, accessControl: true },
      errors: { ...prev.errors, accessControl: null },
    }));

    try {
      const response = await apiClient.put('/course-settings/access-control', {
        role,
        settings,
      });

      if (response.success) {
        // Safety check: ensure data is a valid object, not an Error
        const data = response.data || {};
        const updatedAccessControl = (data && typeof data === 'object' && !(data instanceof Error) && data.constructor === Object)
          ? data
          : {};
        
        // Clear all course settings caches when access control is updated
        // This ensures admin users will refetch data when permissions change
        get().clearAllCache();
        
        set({
          accessControl: updatedAccessControl,
          loading: { ...get().loading, accessControl: false },
          errors: { ...get().errors, accessControl: null },
        });
        
        return updatedAccessControl;
      } else {
        throw new Error(response.error || 'Failed to update access control settings');
      }
    } catch (error) {
      console.error('Error updating access control:', error);
      set((prev) => ({
        loading: { ...prev.loading, accessControl: false },
        errors: { ...prev.errors, accessControl: error.message || 'Failed to update access control settings' },
      }));
      throw error;
    }
  },

  /**
   * Check if user has access to a feature
   * @param {string} featureName - Feature name
   * @param {string} action - 'read' or 'write'
   * @returns {boolean} True if access is allowed
   */
  checkAccess: (featureName, action) => {
    const accessControl = get().accessControl;
    if (!accessControl || !accessControl[featureName]) {
      return false;
    }
    return accessControl[featureName][`${action}_access`] === true;
  },
}));

export default useCourseSettingsStore;

