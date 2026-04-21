/**
 * Validation Summary Component
 * 
 * Displays a summary of all validation errors in the form.
 * Shows errors grouped by section for better UX.
 */

'use client';

import { useCourseStore } from '@/store/index.js';
import FieldError from '@/components/shared/errors/FieldError.js';

const ValidationSummary = ({ className = '' }) => {
  const { validationErrors, errors, validationAttempted } = useCourseStore();

  // Only show errors if validation has been attempted
  if (!validationAttempted) {
    return null;
  }

  // Combine validation errors and general errors
  const allErrors = { ...validationErrors, ...errors };
  const errorKeys = Object.keys(allErrors).filter((key) => allErrors[key]);

  if (errorKeys.length === 0) {
    return null;
  }

  // Group errors by section
  const groupedErrors = {
    basic: [],
    selections: [],
    video: [],
    builder: [],
    additional: [],
    other: [],
  };

  // Helper function to safely extract error message
  const getErrorMessage = (error) => {
    if (typeof error === 'string') {
      return error;
    } else if (error && typeof error === 'object') {
      if (error.message) {
        return typeof error.message === 'string' ? error.message : String(error.message);
      } else if (error.toString && typeof error.toString === 'function') {
        return error.toString();
      } else {
        return 'An error occurred';
      }
    } else {
      return String(error || 'An error occurred');
    }
  };

  errorKeys.forEach((key) => {
    const error = allErrors[key];
    if (!error) return;

    const errorMessage = getErrorMessage(error);

    if (
      key.includes('title') ||
      key.includes('slug') ||
      key.includes('Price') ||
      key.includes('aboutCourse')
    ) {
      groupedErrors.basic.push({ field: key, message: errorMessage });
    } else if (
      key.includes('category') ||
      key.includes('subcategory') ||
      key.includes('Type') ||
      key.includes('Level') ||
      key.includes('Skill') ||
      key.includes('instructor') ||
      key.includes('class') ||
      key.includes('subject') ||
      key.includes('organization')
    ) {
      groupedErrors.selections.push({ field: key, message: errorMessage });
    } else if (key.includes('Video') || key.includes('video')) {
      groupedErrors.video.push({ field: key, message: errorMessage });
    } else if (key.includes('module') || key.includes('chapter') || key.includes('lesson')) {
      groupedErrors.builder.push({ field: key, message: errorMessage });
    } else if (
      key.includes('requirement') ||
      key.includes('description') ||
      key.includes('tag') ||
      key.includes('language') ||
      key.includes('startDate')
    ) {
      groupedErrors.additional.push({ field: key, message: errorMessage });
    } else {
      groupedErrors.other.push({ field: key, message: errorMessage });
    }
  });

  const sectionLabels = {
    basic: 'Basic Information',
    selections: 'Course Selections',
    video: 'Intro Video',
    builder: 'Course Builder',
    additional: 'Additional Information',
    other: 'Other',
  };

  const hasErrors = Object.values(groupedErrors).some((errors) => errors.length > 0);

  if (!hasErrors) {
    return null;
  }

  return (
    <div
      className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
            Please fix the following errors:
          </h3>
          <p className="text-xs text-red-700 dark:text-red-300">
            {errorKeys.length} error{errorKeys.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedErrors).map(([section, sectionErrors]) => {
          if (sectionErrors.length === 0) return null;

          return (
            <div key={section} className="border-l-2 border-red-300 dark:border-red-700 pl-3">
              <h4 className="text-xs font-medium text-red-800 dark:text-red-200 mb-2 uppercase tracking-wide">
                {sectionLabels[section]}
              </h4>
              <ul className="space-y-1">
                {sectionErrors.map((error, index) => {
                  // Safely extract error message
                  let errorMessage = 'An error occurred';
                  if (error && typeof error === 'object') {
                    if (typeof error.message === 'string') {
                      errorMessage = error.message;
                    } else if (error.message && typeof error.message === 'object') {
                      // If error.message is an Error object, extract its message
                      errorMessage = error.message?.message || String(error.message);
                    } else {
                      errorMessage = String(error.message || error || 'An error occurred');
                    }
                  } else if (typeof error === 'string') {
                    errorMessage = error;
                  } else {
                    errorMessage = String(error || 'An error occurred');
                  }
                  
                  return (
                    <li key={index} className="text-sm text-red-700 dark:text-red-300">
                      <span className="mr-2">•</span>
                      {errorMessage}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ValidationSummary;

