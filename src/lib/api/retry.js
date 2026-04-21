/**
 * API Retry Utility
 * 
 * Provides retry logic for failed API requests with exponential backoff.
 */

/**
 * Retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['NetworkError', 'TimeoutError'],
};

/**
 * Check if error is retryable
 * @param {Error} error - Error object
 * @param {number} status - HTTP status code
 * @returns {boolean} Whether error is retryable
 */
const isRetryable = (error, status) => {
  // Check status codes
  if (status && DEFAULT_RETRY_CONFIG.retryableStatusCodes.includes(status)) {
    return true;
  }

  // Check error types
  if (error && DEFAULT_RETRY_CONFIG.retryableErrors.includes(error.name)) {
    return true;
  }

  // Network errors are retryable
  if (error && error.message && error.message.includes('network')) {
    return true;
  }

  return false;
};

/**
 * Calculate delay for retry
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {Object} config - Retry configuration
 * @returns {number} Delay in milliseconds
 */
const calculateDelay = (attempt, config = {}) => {
  const {
    initialDelay = DEFAULT_RETRY_CONFIG.initialDelay,
    maxDelay = DEFAULT_RETRY_CONFIG.maxDelay,
    backoffMultiplier = DEFAULT_RETRY_CONFIG.backoffMultiplier,
  } = config;

  const delay = initialDelay * Math.pow(backoffMultiplier, attempt);
  return Math.min(delay, maxDelay);
};

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} config - Retry configuration
 * @returns {Promise} Result of function
 */
export const retry = async (fn, config = {}) => {
  const {
    maxRetries = DEFAULT_RETRY_CONFIG.maxRetries,
    onRetry = null,
  } = { ...DEFAULT_RETRY_CONFIG, ...config };

  let lastError;
  let lastStatus;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;
      lastStatus = error.status || error.response?.status;

      // Don't retry if not retryable
      if (!isRetryable(error, lastStatus)) {
        throw error;
      }

      // Don't retry if max retries reached
      if (attempt >= maxRetries) {
        throw error;
      }

      // Calculate delay
      const delay = calculateDelay(attempt, config);

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, delay, error);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Retry configuration for different scenarios
 */
export const RETRY_CONFIGS = {
  // Quick retry for transient errors
  QUICK: {
    maxRetries: 2,
    initialDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
  },

  // Standard retry
  STANDARD: DEFAULT_RETRY_CONFIG,

  // Aggressive retry for critical operations
  AGGRESSIVE: {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },

  // No retry
  NONE: {
    maxRetries: 0,
  },
};

