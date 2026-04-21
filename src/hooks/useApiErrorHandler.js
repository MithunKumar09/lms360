/**
 * API Error Handler Hook
 * 
 * Provides centralized error handling for API calls with user-friendly messages.
 */

'use client';

import { useCallback } from 'react';
import { useToast } from './useToast.js';
import { handleError } from '@/lib/errors/errorHandler.js';
import { ErrorCategories } from '@/lib/errors/errorMessages.js';

/**
 * Hook for handling API errors
 */
export const useApiErrorHandler = () => {
  const { error: showError, warning: showWarning, info: showInfo } = useToast();

  /**
   * Handle API error
   * @param {Error} error - Error object
   * @param {Object} options - Options
   * @param {boolean} options.showToast - Whether to show toast notification
   * @param {string} options.customMessage - Custom error message
   * @param {Function} options.onError - Callback on error
   * @returns {Object} Error handling result
   */
  const handleApiError = useCallback(
    (error, options = {}) => {
      const { showToast = true, customMessage = null, onError = null } = options;

      // Handle error using error handler
      const errorResult = handleError(error, {
        log: true,
        context: {
          source: 'api',
          ...options.context,
        },
      });

      // Show toast notification if requested
      if (showToast) {
        const message = customMessage || errorResult.message;

        switch (errorResult.category) {
          case ErrorCategories.VALIDATION:
            showWarning(message, 5000);
            break;
          case ErrorCategories.AUTHORIZATION:
            showError(message, 7000);
            break;
          case ErrorCategories.NETWORK:
            showError(message, 8000);
            break;
          case ErrorCategories.SERVER:
            showError(message, 8000);
            break;
          default:
            showError(message, 6000);
        }
      }

      // Call custom error handler if provided
      if (onError) {
        onError(errorResult);
      }

      return errorResult;
    },
    [showError, showWarning, showInfo]
  );

  /**
   * Handle network error specifically
   * @param {Error} error - Network error
   * @returns {Object} Error handling result
   */
  const handleNetworkError = useCallback(
    (error) => {
      return handleApiError(error, {
        showToast: true,
        customMessage: 'Network error. Please check your connection and try again.',
      });
    },
    [handleApiError]
  );

  /**
   * Handle validation error
   * @param {Error} error - Validation error
   * @param {Object} validationErrors - Validation errors object
   * @returns {Object} Error handling result
   */
  const handleValidationError = useCallback(
    (error, validationErrors = {}) => {
      const errorCount = Object.keys(validationErrors).length;
      const message =
        errorCount > 0
          ? `Please fix ${errorCount} validation error${errorCount !== 1 ? 's' : ''}`
          : error.message || 'Validation failed';

      return handleApiError(error, {
        showToast: true,
        customMessage: message,
      });
    },
    [handleApiError]
  );

  /**
   * Handle authentication error
   * @param {Error} error - Authentication error
   * @returns {Object} Error handling result
   */
  const handleAuthError = useCallback(
    (error) => {
      return handleApiError(error, {
        showToast: true,
        customMessage: 'Your session has expired. Please log in again.',
      });
    },
    [handleApiError]
  );

  return {
    handleApiError,
    handleNetworkError,
    handleValidationError,
    handleAuthError,
  };
};

