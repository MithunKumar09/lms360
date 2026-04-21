/**
 * Global Error Handler Component
 * 
 * Handles unhandled promise rejections and global errors.
 * Prevents console spam and provides better error handling.
 */

'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/index.js';

/**
 * Global Error Handler Component
 * 
 * Sets up global error handlers for unhandled promise rejections
 * and JavaScript errors.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Component with error handling
 */
export const GlobalErrorHandler = ({ children }) => {
  const addNotification = useAppStore((state) => state.addNotification);

  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      // Prevent default browser error logging (we'll handle it ourselves)
      event.preventDefault();
      
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || 'An unexpected error occurred';
      
      // Log to console for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error('[GlobalErrorHandler] Unhandled promise rejection:', error);
        console.error('[GlobalErrorHandler] Error details:', {
          message: errorMessage,
          stack: error?.stack,
          error: error,
        });
      }
      
      // Show user-friendly notification
      // Only show if it's not a network error, expected error, or validation error
      const isNetworkError = errorMessage.includes('fetch') || 
                            errorMessage.includes('network') || 
                            errorMessage.includes('NetworkError');
      
      const isExpectedError = errorMessage.includes('AbortError') || 
                             errorMessage.includes('timeout') ||
                             errorMessage.includes('cancelled');
      
      // Check if it's a Zod validation error (these are handled by react-hook-form)
      const isValidationError = error?.name === 'ZodError' || 
                               error?.type === 'ZodError' ||
                               errorMessage.includes('invalid_format') ||
                               errorMessage.includes('too_small') ||
                               errorMessage.includes('Too small') ||
                               errorMessage.includes('Invalid URL') ||
                               errorMessage.includes('Password is too weak');
      
      // Don't show notifications for validation errors - they're handled by the form
      if (!isNetworkError && !isExpectedError && !isValidationError) {
        addNotification('error', `Error: ${errorMessage}`, 5000);
      } else if (isValidationError && process.env.NODE_ENV === 'development') {
        // Only log validation errors in development, don't show to user
        console.debug('[GlobalErrorHandler] Validation error (handled by form):', errorMessage);
      }
      
      // Mark error as handled
      return true;
    };

    // Handle unhandled JavaScript errors
    const handleError = (event) => {
      // Prevent default browser error logging
      event.preventDefault();
      
      const error = event.error;
      const errorMessage = error?.message || event.message || 'An unexpected error occurred';
      
      // Log to console for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.error('[GlobalErrorHandler] Unhandled error:', error);
        console.error('[GlobalErrorHandler] Error details:', {
          message: errorMessage,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: error?.stack,
        });
      }
      
      // Show user-friendly notification for critical errors
      // Skip React error boundaries and expected errors
      const isReactError = errorMessage.includes('React') || 
                          errorMessage.includes('Minified React error');
      
      if (!isReactError) {
        addNotification('error', `Unexpected error: ${errorMessage}`, 5000);
      }
      
      // Mark error as handled
      return true;
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [addNotification]);

  return <>{children}</>;
};

export default GlobalErrorHandler;

