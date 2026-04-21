/**
 * Filter Utilities
 * 
 * Utility functions for building, parsing, and validating filter parameters.
 * Used across vendor dashboard components for consistent filtering.
 * 
 * @module api/filters
 */

/**
 * Build filter query parameters from filter object
 * @param {Object} filters - Filter object with various filter properties
 * @returns {Object} Query parameters object
 */
export function buildFilterParams(filters = {}) {
  const params = {};

  // Search
  if (filters.search && filters.search.trim()) {
    params.search = filters.search.trim();
  }

  // Status filters
  if (filters.status) {
    params.status = filters.status;
  }

  // Payment status
  if (filters.paymentStatus) {
    params.paymentStatus = filters.paymentStatus;
  }

  // Date range
  if (filters.fromDate) {
    params.from_date = filters.fromDate instanceof Date 
      ? filters.fromDate.toISOString() 
      : filters.fromDate;
  }
  if (filters.toDate) {
    params.to_date = filters.toDate instanceof Date 
      ? filters.toDate.toISOString() 
      : filters.toDate;
  }

  // Numeric ranges
  if (filters.minEnrollments !== undefined && filters.minEnrollments !== null) {
    params.min_enrollments = filters.minEnrollments;
  }
  if (filters.maxEnrollments !== undefined && filters.maxEnrollments !== null) {
    params.max_enrollments = filters.maxEnrollments;
  }

  if (filters.minProgress !== undefined && filters.minProgress !== null) {
    params.min_progress = filters.minProgress;
  }
  if (filters.maxProgress !== undefined && filters.maxProgress !== null) {
    params.max_progress = filters.maxProgress;
  }

  if (filters.minSlot !== undefined && filters.minSlot !== null) {
    params.min_slot = filters.minSlot;
  }
  if (filters.maxSlot !== undefined && filters.maxSlot !== null) {
    params.max_slot = filters.maxSlot;
  }

  if (filters.minMarks !== undefined && filters.minMarks !== null) {
    params.min_marks = filters.minMarks;
  }
  if (filters.maxMarks !== undefined && filters.maxMarks !== null) {
    params.max_marks = filters.maxMarks;
  }

  // Multi-select filters (arrays)
  if (filters.courseIds && Array.isArray(filters.courseIds) && filters.courseIds.length > 0) {
    params.course_ids = filters.courseIds.join(',');
  }

  if (filters.categoryIds && Array.isArray(filters.categoryIds) && filters.categoryIds.length > 0) {
    params.category_ids = filters.categoryIds.join(',');
  }

  // Sorting
  if (filters.sortBy) {
    params.sort_by = filters.sortBy;
  }
  if (filters.sortOrder) {
    params.sort_order = filters.sortOrder;
  }

  // Page and limit
  if (filters.page) {
    params.page = filters.page;
  }
  if (filters.limit) {
    params.limit = filters.limit;
  }

  return params;
}

/**
 * Parse URL search params to filter object
 * @param {URLSearchParams} searchParams - URL search parameters
 * @returns {Object} Filter object
 */
export function parseFilterParams(searchParams) {
  const filters = {};

  // Search
  const search = searchParams.get('search');
  if (search) {
    filters.search = search;
  }

  // Status
  const status = searchParams.get('status');
  if (status) {
    filters.status = status;
  }

  // Payment status
  const paymentStatus = searchParams.get('paymentStatus');
  if (paymentStatus) {
    filters.paymentStatus = paymentStatus;
  }

  // Date range
  const fromDate = searchParams.get('from_date');
  if (fromDate) {
    filters.fromDate = new Date(fromDate);
  }
  const toDate = searchParams.get('to_date');
  if (toDate) {
    filters.toDate = new Date(toDate);
  }

  // Numeric ranges
  const minEnrollments = searchParams.get('min_enrollments');
  if (minEnrollments) {
    filters.minEnrollments = parseInt(minEnrollments, 10);
  }
  const maxEnrollments = searchParams.get('max_enrollments');
  if (maxEnrollments) {
    filters.maxEnrollments = parseInt(maxEnrollments, 10);
  }

  const minProgress = searchParams.get('min_progress');
  if (minProgress) {
    filters.minProgress = parseFloat(minProgress);
  }
  const maxProgress = searchParams.get('max_progress');
  if (maxProgress) {
    filters.maxProgress = parseFloat(maxProgress);
  }

  const minSlot = searchParams.get('min_slot');
  if (minSlot) {
    filters.minSlot = parseInt(minSlot, 10);
  }
  const maxSlot = searchParams.get('max_slot');
  if (maxSlot) {
    filters.maxSlot = parseInt(maxSlot, 10);
  }

  const minMarks = searchParams.get('min_marks');
  if (minMarks) {
    filters.minMarks = parseFloat(minMarks);
  }
  const maxMarks = searchParams.get('max_marks');
  if (maxMarks) {
    filters.maxMarks = parseFloat(maxMarks);
  }

  // Multi-select filters
  const courseIds = searchParams.get('course_ids');
  if (courseIds) {
    filters.courseIds = courseIds.split(',').filter(id => id.trim());
  }

  const categoryIds = searchParams.get('category_ids');
  if (categoryIds) {
    filters.categoryIds = categoryIds.split(',').filter(id => id.trim());
  }

  // Sorting
  const sortBy = searchParams.get('sort_by');
  if (sortBy) {
    filters.sortBy = sortBy;
  }
  const sortOrder = searchParams.get('sort_order');
  if (sortOrder) {
    filters.sortOrder = sortOrder;
  }

  // Page and limit
  const page = searchParams.get('page');
  if (page) {
    filters.page = parseInt(page, 10);
  }
  const limit = searchParams.get('limit');
  if (limit) {
    filters.limit = parseInt(limit, 10);
  }

  return filters;
}

/**
 * Validate filter values against schema
 * @param {Object} filters - Filter object to validate
 * @param {Object} schema - Validation schema
 * @returns {Object} Validation result with isValid and errors
 */
export function validateFilters(filters = {}, schema = {}) {
  const errors = {};
  let isValid = true;

  // Validate search
  if (schema.search) {
    if (filters.search && typeof filters.search !== 'string') {
      errors.search = 'Search must be a string';
      isValid = false;
    }
    if (filters.search && filters.search.length < schema.search.minLength) {
      errors.search = `Search must be at least ${schema.search.minLength} characters`;
      isValid = false;
    }
  }

  // Validate status
  if (schema.status && filters.status) {
    if (!schema.status.allowedValues.includes(filters.status)) {
      errors.status = `Status must be one of: ${schema.status.allowedValues.join(', ')}`;
      isValid = false;
    }
  }

  // Validate date range
  if (schema.dateRange) {
    if (filters.fromDate && !(filters.fromDate instanceof Date) && isNaN(Date.parse(filters.fromDate))) {
      errors.fromDate = 'From date must be a valid date';
      isValid = false;
    }
    if (filters.toDate && !(filters.toDate instanceof Date) && isNaN(Date.parse(filters.toDate))) {
      errors.toDate = 'To date must be a valid date';
      isValid = false;
    }
    if (filters.fromDate && filters.toDate) {
      const from = new Date(filters.fromDate);
      const to = new Date(filters.toDate);
      if (from > to) {
        errors.dateRange = 'From date must be before to date';
        isValid = false;
      }
    }
  }

  // Validate numeric ranges
  if (schema.numericRange) {
    const { min, max } = schema.numericRange;
    const value = filters[schema.numericRange.field];
    if (value !== undefined && value !== null) {
      if (typeof value !== 'number' || isNaN(value)) {
        errors[schema.numericRange.field] = 'Must be a number';
        isValid = false;
      } else if (min !== undefined && value < min) {
        errors[schema.numericRange.field] = `Must be at least ${min}`;
        isValid = false;
      } else if (max !== undefined && value > max) {
        errors[schema.numericRange.field] = `Must be at most ${max}`;
        isValid = false;
      }
    }
  }

  return {
    isValid,
    errors,
  };
}

/**
 * Clear all filters (return empty filter object)
 * @returns {Object} Empty filter object
 */
export function clearFilters() {
  return {};
}

/**
 * Get active filter count
 * @param {Object} filters - Filter object
 * @returns {number} Number of active filters
 */
export function getActiveFilterCount(filters = {}) {
  let count = 0;

  if (filters.search) count++;
  if (filters.status) count++;
  if (filters.paymentStatus) count++;
  if (filters.fromDate || filters.toDate) count++;
  if (filters.minEnrollments !== undefined || filters.maxEnrollments !== undefined) count++;
  if (filters.minProgress !== undefined || filters.maxProgress !== undefined) count++;
  if (filters.minSlot !== undefined || filters.maxSlot !== undefined) count++;
  if (filters.minMarks !== undefined || filters.maxMarks !== undefined) count++;
  if (filters.courseIds && filters.courseIds.length > 0) count++;
  if (filters.categoryIds && filters.categoryIds.length > 0) count++;
  if (filters.sortBy) count++;

  return count;
}

export default {
  buildFilterParams,
  parseFilterParams,
  validateFilters,
  clearFilters,
  getActiveFilterCount,
};
