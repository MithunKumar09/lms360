"use client";

import React from 'react';
import { FiAlertCircle, FiRefreshCw } from 'react-icons/fi';

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors in child components and displays a fallback UI.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
    
    // Log to error tracking service (e.g., Sentry)
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
      });
    }
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      // Safely extract error message
      let errorMessage = 'An unexpected error occurred';
      if (this.state.error) {
        if (typeof this.state.error === 'string') {
          errorMessage = this.state.error;
        } else if (this.state.error?.message) {
          errorMessage = this.state.error.message;
        } else if (this.state.error?.originalError?.message) {
          errorMessage = this.state.error.originalError.message;
        } else {
          try {
            errorMessage = String(this.state.error);
          } catch (e) {
            errorMessage = 'An unexpected error occurred';
          }
        }
      }
      
      if (this.props.fallback) {
        // Pass the error message string, not the error object
        return this.props.fallback(errorMessage, this.handleReset);
      }

      return (
        <div className="d-flex flex-column align-items-center justify-content-center p-5" style={{ minHeight: '400px' }}>
          <div className="card border-0 shadow-sm" style={{ maxWidth: '600px', width: '100%' }}>
            <div className="card-body p-4 text-center">
              <FiAlertCircle size={48} className="text-danger mb-3" />
              <h4 className="mb-3">Something went wrong</h4>
              <p className="text-muted mb-4">
                {this.props.message || 'An unexpected error occurred. Please try again.'}
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-start mb-4">
                  <summary className="text-danger cursor-pointer mb-2">Error Details (Development Only)</summary>
                  <pre className="bg-light p-3 rounded small" style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: '200px' }}>
                    {(() => {
                      try {
                        if (typeof this.state.error === 'string') {
                          return this.state.error;
                        } else if (this.state.error?.message) {
                          return this.state.error.message;
                        } else if (this.state.error?.toString) {
                          return this.state.error.toString();
                        } else {
                          return JSON.stringify(this.state.error, null, 2);
                        }
                      } catch (e) {
                        return 'Error details unavailable';
                      }
                    })()}
                    {this.state.errorInfo?.componentStack ? `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}` : ''}
                  </pre>
                </details>
              )}
              
              <div className="d-flex gap-2 justify-content-center">
                <button
                  className="btn btn-primary"
                  onClick={this.handleReset}
                >
                  <FiRefreshCw size={16} className="me-2" />
                  Try Again
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => window.location.href = '/'}
                >
                  Go Home
                </button>
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

