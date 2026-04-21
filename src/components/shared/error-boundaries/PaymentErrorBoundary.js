/**
 * Payment Error Boundary Component
 * 
 * Catches errors in payment-related components and displays user-friendly messages
 */

"use client";

import React from "react";

class PaymentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Payment Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-20px bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-5">
          <div className="flex items-center gap-10px mb-10px">
            <i className="icofont-close-circled text-red-600 text-20px"></i>
            <h3 className="text-16px font-semibold text-red-800 dark:text-red-200">
              Payment Error
            </h3>
          </div>
          <p className="text-14px text-red-700 dark:text-red-300 mb-15px">
            An error occurred while processing your payment. Please try again or contact support if the problem persists.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-15px py-8px bg-red-600 text-whiteColor rounded-5 text-14px font-semibold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PaymentErrorBoundary;

