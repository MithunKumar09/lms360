/**
 * Global Error Handler
 * 
 * Global error handling for unhandled errors, API errors, and window errors.
 */

import { handleError, logError } from './errorHandler.js';

/**
 * Setup global error handlers
 */
export const setupGlobalErrorHandlers = () => {
  if (typeof window === 'undefined') {
    return; // Server-side, skip
  }

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const errorHandling = handleError(error, {
      log: true,
      context: {
        type: 'unhandledrejection',
        timestamp: new Date().toISOString(),
      },
    });

    // Prevent default browser error handling
    event.preventDefault();

    // You can show a toast notification or log to external service
    console.error('Unhandled promise rejection:', errorHandling);
  });

  // Handle window errors
  window.addEventListener('error', (event) => {
    const error = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    };

    const errorHandling = handleError(error, {
      log: true,
      context: {
        type: 'windowError',
        timestamp: new Date().toISOString(),
      },
    });

    // Prevent default browser error handling
    event.preventDefault();

    // You can show a toast notification or log to external service
    console.error('Window error:', errorHandling);
  });

  // Handle console errors (optional, for development)
  if (process.env.NODE_ENV === 'development') {
    const originalError = console.error;
    console.error = (...args) => {
      // Log original error
      originalError.apply(console, args);

      // Check if it's an error object
      const error = args.find((arg) => arg instanceof Error);
      if (error) {
        logError(error, {
          type: 'consoleError',
          timestamp: new Date().toISOString(),
        });
      }
    };
  }
};

/**
 * API Error Interceptor
 * 
 * Intercepts API errors and handles them globally
 * 
 * @param {Error|Object} error - API error
 * @param {Object} context - Additional context
 * @returns {Object} Error handling result
 */
export const handleApiError = (error, context = {}) => {
  // Network errors are recoverable — never classify as auth failures.
  // A TypeError from fetch() means the request never reached the server.
  const isNetworkError =
    error instanceof TypeError ||
    (typeof error.message === 'string' && (
      error.message.toLowerCase().includes('networkerror') ||
      error.message.toLowerCase().includes('failed to fetch') ||
      error.message.toLowerCase().includes('network request failed')
    ));

  if (isNetworkError) {
    console.warn('🌐 [GLOBAL ERROR HANDLER] Network error (recoverable, no login redirect):', error.message);
    return {
      type: 'NETWORK',
      severity: 'medium',
      category: 'network',
      message: 'Connection failed. Please check your internet connection.',
      isNetworkError: true,
      recoverable: true,
      originalError: error,
    };
  }

  return handleError(error, {
    log: true,
    context: {
      type: 'apiError',
      ...context,
    },
  });
};

/**
 * Setup error handlers on mount
 */
export const initGlobalErrorHandlers = () => {
  if (typeof window !== 'undefined') {
    setupGlobalErrorHandlers();
  }
};

export default {
  setupGlobalErrorHandlers,
  handleApiError,
  initGlobalErrorHandlers,
};


