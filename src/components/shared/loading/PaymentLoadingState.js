/**
 * Payment Loading State Component
 * 
 * Reusable loading state for payment operations
 */

"use client";

const PaymentLoadingState = ({ message = "Processing payment..." }) => {
  return (
    <div className="flex flex-col items-center justify-center py-30px">
      <div className="relative w-48px h-48px mb-15px">
        <div className="absolute inset-0 border-4 border-primaryColor/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-primaryColor border-t-transparent rounded-full animate-spin"></div>
      </div>
      <p className="text-14px text-contentColor dark:text-contentColor-dark">{message}</p>
    </div>
  );
};

export default PaymentLoadingState;

