/**
 * Placement Error Boundary Component
 * 
 * Catches errors in placement feature components and displays a fallback UI
 */

'use client';

import { Component } from 'react';

export default class PlacementErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Placement Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h2 className="text-red-800 font-semibold text-lg mb-2">
                  Something went wrong
                </h2>
                <p className="text-red-700 mb-4">
                  {this.state.error?.message || 'An unexpected error occurred in the placement feature.'}
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={this.handleReset}
                    className="px-4 py-2 bg-secondaryColor3 text-whiteColor rounded-lg hover:bg-secondaryColor3/90"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={this.handleReload}
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-100"
                  >
                    Reload Page
                  </button>
                  <a
                    href="/dashboards/student-placement"
                    className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 inline-block"
                  >
                    Go to Dashboard
                  </a>
                </div>
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="text-sm text-red-600 cursor-pointer">Error Details</summary>
                    <pre className="mt-2 text-xs bg-red-100 p-3 rounded overflow-auto max-h-64">
                      {this.state.error?.stack}
                      {'\n\n'}
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
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
