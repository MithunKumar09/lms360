/**
 * Error Boundary Component
 * 
 * React Error Boundary for catching and handling component errors.
 * Provides error recovery mechanisms and user-friendly error display.
 */

'use client';

import React from 'react';
import ErrorDisplay from './ErrorDisplay.js';
import { handleError } from '@/lib/errors/errorHandler.js';

/**
 * Error Boundary Class Component
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      originalError: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to error reporting service
    const errorHandling = handleError(error, {
      log: true,
      context: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      },
    });

    // Store both the original error and the handled error for debugging
    this.setState({
      error: errorHandling, // This is an object from handleError
      originalError: error, // Keep original for stack traces
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      originalError: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Safely extract error message
      // this.state.error is the result of handleError(), which is an object with .message property
      let errorMessage = 'An unexpected error occurred';
      try {
        if (this.state.error) {
          if (typeof this.state.error === 'string') {
            errorMessage = this.state.error;
          } else if (this.state.error instanceof Error) {
            // If error is an Error object, extract message
            errorMessage = this.state.error.message || String(this.state.error);
          } else if (this.state.error?.message && typeof this.state.error.message === 'string') {
            // handleError() returns an object with .message property
            errorMessage = this.state.error.message;
          } else if (this.state.error?.originalError?.message) {
            const origMsg = this.state.error.originalError.message;
            errorMessage = typeof origMsg === 'string' ? origMsg : String(origMsg);
          } else if (this.state.originalError?.message) {
            const origMsg = this.state.originalError.message;
            errorMessage = typeof origMsg === 'string' ? origMsg : String(origMsg);
          } else {
            // Last resort: try to stringify safely
            try {
              errorMessage = String(this.state.error.message || this.state.error || 'An unexpected error occurred');
            } catch (e) {
              errorMessage = 'An unexpected error occurred';
            }
          }
        }
      } catch (e) {
        // If anything goes wrong extracting the error message, use default
        console.error('[ErrorBoundary] Error extracting error message:', e);
        errorMessage = 'An unexpected error occurred';
      }

      // Safely extract stack trace
      let stackTrace = '';
      if (this.state.originalError?.stack) {
        stackTrace = this.state.originalError.stack;
      } else if (this.state.error?.originalError?.stack) {
        stackTrace = this.state.error.originalError.stack;
      } else if (this.state.errorInfo?.componentStack) {
        stackTrace = this.state.errorInfo.componentStack;
      } else if (this.state.error?.stack) {
        stackTrace = this.state.error.stack;
      }

      // Custom fallback UI
      if (this.props.fallback) {
        // Safely extract error message before passing to fallback
        let safeError = errorMessage;
        if (this.state.error && typeof this.state.error === 'object') {
          // If error is an object, pass the message string instead
          safeError = this.state.error.message || 
                     this.state.error.originalError?.message || 
                     errorMessage;
        }
        return this.props.fallback(safeError, this.handleReset);
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                Something went wrong
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                We&apos;re sorry, but something unexpected happened.
              </p>
            </div>
            <div className="mt-8">
              <ErrorDisplay
                error={errorMessage}
                type="inline"
                variant="error"
                dismissible={false}
              />
              {this.props.showDetails && process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto">
                    {stackTrace}
                  </pre>
                </details>
              )}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="text-size-15 text-whiteColor bg-primaryColor px-25px py-10px border border-primaryColor hover:text-primaryColor hover:bg-whiteColor inline-block rounded"
                >
                  Try Again
                </button>
                {this.props.onReset && (
                  <button
                    type="button"
                    onClick={() => {
                      this.handleReset();
                      this.props.onReset();
                    }}
                    className="ml-4 text-size-15 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    {this.props.resetLabel || 'Go Home'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;


