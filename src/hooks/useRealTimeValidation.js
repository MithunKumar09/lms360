/**
 * Real-Time Validation Hook
 * 
 * Provides real-time validation feedback as user types.
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useCourseStore } from '@/store/index.js';
import { validateCourseData } from '@/lib/course/validation.js';
import { validateAllCrossFields } from '@/lib/course/crossFieldValidation.js';

/**
 * Hook for real-time validation
 * @param {Object} options - Options
 * @param {number} options.debounceMs - Debounce delay in milliseconds (default: 500)
 * @param {boolean} options.enabled - Whether validation is enabled (default: true)
 */
export const useRealTimeValidation = (options = {}) => {
  const { debounceMs = 500, enabled = true } = options;
  const { courseData, setValidationErrors, validationErrors } = useCourseStore();
  const timeoutRef = useRef(null);
  const previousDataRef = useRef(null);

  const validate = useCallback(() => {
    if (!enabled) return;

    // Basic field validation
    const basicValidation = validateCourseData(courseData);
    
    // Cross-field validation
    const crossFieldValidation = validateAllCrossFields(courseData);

    // Combine all errors
    const errors = {
      ...basicValidation.errors,
      ...crossFieldValidation.errors,
    };

    // Only update if errors changed
    const errorsString = JSON.stringify(errors);
    const previousErrorsString = JSON.stringify(validationErrors);
    
    if (errorsString !== previousErrorsString) {
      setValidationErrors(errors);
    }
  }, [courseData, enabled, setValidationErrors, validationErrors]);

  useEffect(() => {
    if (!enabled) return;

    // Skip validation if data hasn't changed
    const dataString = JSON.stringify(courseData);
    if (dataString === JSON.stringify(previousDataRef.current)) {
      return;
    }

    previousDataRef.current = courseData;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce validation
    timeoutRef.current = setTimeout(() => {
      validate();
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [courseData, debounceMs, enabled, validate]);

  // Validate on mount
  useEffect(() => {
    if (enabled) {
      validate();
    }
  }, [enabled]); // Only run on mount/enable change

  return {
    errors: validationErrors,
    isValid: Object.keys(validationErrors).length === 0,
  };
};

