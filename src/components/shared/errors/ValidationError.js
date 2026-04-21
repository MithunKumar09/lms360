/**
 * Validation Error Component
 * 
 * Field-level validation error display component.
 * Provides inline error messages with accessibility support.
 */

'use client';

import React from 'react';

/**
 * Validation Error Component
 * 
 * @param {Object} props - Component props
 * @param {string|Object} props.error - Error message or error object
 * @param {string} props.field - Field name (for accessibility)
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showIcon - Whether to show error icon
 * @returns {JSX.Element|null} Validation error component
 */
const ValidationError = ({
  error,
  field = null,
  className = '',
  showIcon = true,
}) => {
  if (!error) {
    return null;
  }

  // Get error message
  const errorMessage = typeof error === 'string' ? error : error.message || 'Invalid value';

  return (
    <div
      className={`text-red-600 dark:text-red-400 text-xs mt-5px flex items-start ${className}`}
      role="alert"
      aria-live="polite"
      id={field ? `${field}-error` : undefined}
      aria-describedby={field ? `${field}-error` : undefined}
    >
      {showIcon && (
        <svg
          className="h-4 w-4 mr-5px flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span className="flex-1">{errorMessage}</span>
    </div>
  );
};

/**
 * Field Error Wrapper
 * 
 * Wraps a form field with error display
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Form field
 * @param {string|Object} props.error - Error message
 * @param {string} props.field - Field name
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Field with error display
 */
export const FieldErrorWrapper = ({
  children,
  error,
  field,
  className = '',
}) => {
  return (
    <div className={className}>
      {children}
      <ValidationError error={error} field={field} />
    </div>
  );
};

export default ValidationError;


