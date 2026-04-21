/**
 * Error Handler
 * 
 * Centralized error handling utility.
 * Provides error classification, logging, and user-friendly message mapping.
 */

import { ErrorCategories, mapErrorToMessage } from './errorMessages.js';

/**
 * Error Types
 */
export const ErrorType = {
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  NETWORK: 'NETWORK',
  SERVER: 'SERVER',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT: 'RATE_LIMIT',
  MFA: 'MFA',
  UNKNOWN: 'UNKNOWN',
};

/**
 * Error Severity Levels
 */
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

/**
 * Classify error type
 * @param {Error|Object} error - Error object
 * @returns {string} Error type
 */
export const classifyError = (error) => {
  if (!error) {
    return ErrorType.UNKNOWN;
  }

  // Check error status code
  if (error.status) {
    if (error.status === 401) {
      return ErrorType.AUTHENTICATION;
    }
    if (error.status === 403) {
      return ErrorType.AUTHORIZATION;
    }
    if (error.status === 404) {
      return ErrorType.NOT_FOUND;
    }
    if (error.status === 423) {
      return ErrorType.RATE_LIMIT;
    }
    if (error.status === 429) {
      return ErrorType.RATE_LIMIT;
    }
    if (error.status >= 500) {
      return ErrorType.SERVER;
    }
    if (error.status >= 400) {
      return ErrorType.VALIDATION;
    }
  }

  // Check error message patterns
  const message = (error.message || '').toLowerCase();

  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return ErrorType.NETWORK;
  }

  if (message.includes('validation') || message.includes('required') || message.includes('invalid format')) {
    return ErrorType.VALIDATION;
  }

  if (message.includes('authentication') || message.includes('login') || message.includes('password') || message.includes('token')) {
    return ErrorType.AUTHENTICATION;
  }

  if (message.includes('permission') || message.includes('forbidden') || message.includes('unauthorized')) {
    return ErrorType.AUTHORIZATION;
  }

  if (message.includes('mfa') || message.includes('totp') || message.includes('2fa')) {
    return ErrorType.MFA;
  }

  if (message.includes('rate limit') || message.includes('too many')) {
    return ErrorType.RATE_LIMIT;
  }

  return ErrorType.UNKNOWN;
};

/**
 * Get error severity
 * @param {Error|Object} error - Error object
 * @returns {string} Error severity
 */
export const getErrorSeverity = (error) => {
  const errorType = classifyError(error);

  switch (errorType) {
    case ErrorType.CRITICAL:
    case ErrorType.SERVER:
      return ErrorSeverity.CRITICAL;
    case ErrorType.AUTHENTICATION:
    case ErrorType.AUTHORIZATION:
      return ErrorSeverity.HIGH;
    case ErrorType.NETWORK:
    case ErrorType.RATE_LIMIT:
      return ErrorSeverity.MEDIUM;
    case ErrorType.VALIDATION:
    case ErrorType.MFA:
      return ErrorSeverity.LOW;
    default:
      return ErrorSeverity.MEDIUM;
  }
};

/**
 * Format error for logging
 * @param {Error|Object} error - Error object
 * @param {Object} context - Additional context
 * @returns {Object} Formatted error
 */
export const formatErrorForLogging = (error, context = {}) => {
  const errorType = classifyError(error);
  const severity = getErrorSeverity(error);

  return {
    type: errorType,
    severity,
    message: error.message || 'Unknown error',
    stack: error.stack || null,
    status: error.status || null,
    code: error.code || null,
    data: error.data || null,
    timestamp: new Date().toISOString(),
    context,
  };
};

/**
 * Log error
 * @param {Error|Object} error - Error object
 * @param {Object} context - Additional context
 */
export const logError = (error, context = {}) => {
  const formattedError = formatErrorForLogging(error, context);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', formattedError);
  }

  // In production, you can send to external logging service
  // Example: sendToLoggingService(formattedError);

  // Optional: Send to external logging service in production
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    // Example: Send to Sentry, LogRocket, etc.
    // You can integrate with your preferred logging service here
    // if (window.Sentry) {
    //   window.Sentry.captureException(error, { extra: context });
    // }
  }
};

/**
 * Handle error and return user-friendly message
 * @param {Error|Object} error - Error object
 * @param {Object} options - Options
 * @param {boolean} options.log - Whether to log the error
 * @param {Object} options.context - Additional context for logging
 * @returns {Object} Error handling result
 */
export const handleError = (error, options = {}) => {
  const { log = true, context = {} } = options;

  // Log error if requested
  if (log) {
    logError(error, context);
  }

  // Classify error
  const errorType = classifyError(error);
  const severity = getErrorSeverity(error);

  // Map to user-friendly message
  const userMessage = mapErrorToMessage(error, errorType);

  // Determine error category for UI
  let category = ErrorCategories.UNKNOWN;
  switch (errorType) {
    case ErrorType.VALIDATION:
      category = ErrorCategories.VALIDATION;
      break;
    case ErrorType.AUTHENTICATION:
      category = ErrorCategories.AUTHENTICATION;
      break;
    case ErrorType.AUTHORIZATION:
      category = ErrorCategories.AUTHORIZATION;
      break;
    case ErrorType.NETWORK:
      category = ErrorCategories.NETWORK;
      break;
    case ErrorType.SERVER:
      category = ErrorCategories.SERVER;
      break;
    case ErrorType.NOT_FOUND:
      category = ErrorCategories.NOT_FOUND;
      break;
    case ErrorType.RATE_LIMIT:
      category = ErrorCategories.RATE_LIMIT;
      break;
    case ErrorType.MFA:
      category = ErrorCategories.MFA;
      break;
    default:
      category = ErrorCategories.UNKNOWN;
  }

  return {
    type: errorType,
    severity,
    category,
    message: userMessage,
    originalError: error,
    recoverable: severity !== ErrorSeverity.CRITICAL,
  };
};

/**
 * Create error object
 * @param {string} message - Error message
 * @param {string} type - Error type
 * @param {Object} data - Additional error data
 * @returns {Error} Error object
 */
export const createError = (message, type = ErrorType.UNKNOWN, data = {}) => {
  const error = new Error(message);
  error.type = type;
  error.data = data;
  return error;
};

/**
 * Check if error is recoverable
 * @param {Error|Object} error - Error object
 * @returns {boolean} Whether error is recoverable
 */
export const isRecoverableError = (error) => {
  const severity = getErrorSeverity(error);
  return severity !== ErrorSeverity.CRITICAL;
};

/**
 * Get retry delay for error
 * @param {Error|Object} error - Error object
 * @param {number} attempt - Current attempt number
 * @returns {number} Retry delay in milliseconds
 */
export const getRetryDelay = (error, attempt = 1) => {
  const errorType = classifyError(error);

  // Don't retry certain error types
  if (errorType === ErrorType.VALIDATION || errorType === ErrorType.AUTHORIZATION) {
    return null; // Don't retry
  }

  // Exponential backoff
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

  return delay;
};

export default {
  ErrorType,
  ErrorSeverity,
  classifyError,
  getErrorSeverity,
  formatErrorForLogging,
  logError,
  handleError,
  createError,
  isRecoverableError,
  getRetryDelay,
};


