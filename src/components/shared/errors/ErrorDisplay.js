/**
 * Error Display Component
 * 
 * Reusable error display component with different display types.
 * Supports inline, toast, and modal error displays.
 */

'use client';

import React from 'react';
import { ErrorCategories } from '@/lib/errors/errorMessages.js';

/**
 * Error Display Component
 * 
 * @param {Object} props - Component props
 * @param {Error|string} props.error - Error object or message
 * @param {string} props.type - Display type ('inline', 'toast', 'modal')
 * @param {string} props.variant - Error variant ('error', 'warning', 'info')
 * @param {Function} props.onDismiss - Dismiss handler
 * @param {boolean} props.dismissible - Whether error can be dismissed
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element|null} Error display component
 */
const ErrorDisplay = ({
  error,
  type = 'inline',
  variant = 'error',
  onDismiss,
  dismissible = false,
  className = '',
}) => {
  if (!error) {
    return null;
  }

  // Get error message - safely handle error objects
  let errorMessage = 'An error occurred';
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    // Check if error.message is a string (not an Error object)
    if (error.message && typeof error.message === 'string') {
      errorMessage = error.message;
    } else if (error.message && error.message instanceof Error) {
      // If error.message is an Error object, extract its message
      errorMessage = error.message.message || String(error.message);
    } else if (error.originalError?.message) {
      errorMessage = typeof error.originalError.message === 'string' 
        ? error.originalError.message 
        : String(error.originalError.message);
    } else {
      // Try to stringify the error object safely
      try {
        errorMessage = JSON.stringify(error);
      } catch (e) {
        // Last resort: convert to string
        try {
          errorMessage = String(error);
        } catch (e2) {
          errorMessage = 'An error occurred';
        }
      }
    }
  } else if (error) {
    // If error is not string or object, convert to string
    try {
      errorMessage = String(error);
    } catch (e) {
      errorMessage = 'An error occurred';
    }
  }

  // Get error category for styling
  const category = error.category || ErrorCategories.UNKNOWN;

  // Base classes
  const baseClasses = 'rounded transition-all duration-200';
  
  // Variant classes
  const variantClasses = {
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
  };

  // Type-specific rendering
  if (type === 'inline') {
    return (
      <div
        className={`${baseClasses} ${variantClasses[variant]} border p-15px ${className}`}
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {variant === 'error' && (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {variant === 'warning' && (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {variant === 'info' && (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
          {dismissible && onDismiss && (
            <div className="ml-auto pl-3">
              <button
                type="button"
                onClick={onDismiss}
                className={`${variantClasses[variant]} inline-flex rounded-md p-1.5 hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2`}
                aria-label="Dismiss error"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === 'toast') {
    // Toast display (can be integrated with toast library)
    return (
      <div
        className={`${baseClasses} ${variantClasses[variant]} border p-15px shadow-lg ${className}`}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center">
          <p className="text-sm font-medium">{errorMessage}</p>
          {dismissible && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="ml-4 inline-flex text-current opacity-50 hover:opacity-75"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (type === 'modal') {
    // Modal display (simplified, can be enhanced with modal library)
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="error-title"
      >
        <div className={`${baseClasses} ${variantClasses[variant]} border p-25px max-w-md w-full mx-4 shadow-xl`}>
          <h3 id="error-title" className="text-lg font-bold mb-10px">
            {variant === 'error' ? 'Error' : variant === 'warning' ? 'Warning' : 'Information'}
          </h3>
          <p className="text-sm mb-15px">{errorMessage}</p>
          {dismissible && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded"
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default ErrorDisplay;


