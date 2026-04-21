/**
 * Field Error Component
 * 
 * Displays field-level validation errors.
 */

'use client';

import { useCourseStore } from '@/store/index.js';

const FieldError = ({ error, className = '', showAlways = false }) => {
  const { validationAttempted } = useCourseStore();
  
  // Only show error if validation has been attempted or showAlways is true
  if (!showAlways && !validationAttempted) {
    return null;
  }

  if (!error) return null;

  // Safely extract error message
  let errorMessage = 'An error occurred';
  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error && typeof error === 'object') {
    if (error.message) {
      errorMessage = typeof error.message === 'string' ? error.message : String(error.message);
    } else if (error.toString && typeof error.toString === 'function') {
      errorMessage = error.toString();
    } else {
      errorMessage = String(error);
    }
  } else {
    errorMessage = String(error);
  }

  return (
    <p
      className={`text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1 ${className}`}
      role="alert"
    >
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{errorMessage}</span>
    </p>
  );
};

export default FieldError;

