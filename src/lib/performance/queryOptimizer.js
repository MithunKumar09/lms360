/**
 * Query Optimizer
 * 
 * Provides utilities for optimizing database queries and React Query caching.
 */

/**
 * Get optimized query options for React Query
 * @param {Object} options - Query options
 * @param {number} options.staleTime - Stale time in ms
 * @param {number} options.gcTime - Garbage collection time in ms
 * @param {boolean} options.refetchOnWindowFocus - Refetch on window focus
 * @returns {Object} Optimized query options
 */
export function getOptimizedQueryOptions({
  staleTime = 2 * 60 * 1000, // 2 minutes default
  gcTime = 10 * 60 * 1000, // 10 minutes default
  refetchOnWindowFocus = false,
  refetchOnReconnect = true,
  retry = 2,
} = {}) {
  return {
    staleTime,
    gcTime,
    refetchOnWindowFocus,
    refetchOnReconnect,
    retry,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  };
}

/**
 * Debounce function for search inputs
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for scroll/resize events
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 100) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Memoize expensive computations
 * @param {Function} fn - Function to memoize
 * @param {Function} keyFn - Key function for cache
 * @returns {Function} Memoized function
 */
export function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  return function(...args) {
    const key = keyFn(...args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

