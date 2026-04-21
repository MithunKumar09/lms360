/**
 * Coupon Input Component
 * 
 * Input field for applying coupon codes during checkout
 */

"use client";

import { useState } from "react";

const CouponInput = ({
  onApply,
  onRemove,
  appliedCoupon = null,
  itemType,
  itemId,
  orderAmount,
  disabled = false,
  className = "",
}) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validating, setValidating] = useState(false);

  const handleValidate = async () => {
    if (!code.trim()) {
      setError("Please enter a coupon code");
      return;
    }

    setError(null);
    setValidating(true);

    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code.trim(),
          itemType,
          itemId,
          orderAmount,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Invalid coupon code");
        return;
      }

      // Coupon is valid, apply it
      if (onApply) {
        await onApply(data.coupon, data.discountAmount, data.orderAmountAfterDiscount);
      }
    } catch (err) {
      console.error("Coupon validation error:", err);
      setError("Failed to validate coupon. Please try again.");
    } finally {
      setValidating(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !disabled && !validating) {
      handleValidate();
    }
  };

  const handleRemove = () => {
    setCode("");
    setError(null);
    if (onRemove) {
      onRemove();
    }
  };

  if (appliedCoupon) {
    return (
      <div className={`coupon-applied-container ${className}`}>
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-300">
                {appliedCoupon.code} applied
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                You saved ₹{appliedCoupon.discountAmount.toFixed(2)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 disabled:opacity-50"
            aria-label="Remove coupon"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`coupon-input-container ${className}`}>
      <label className="block text-sm font-medium text-headingColor dark:text-headingColor-dark mb-2">
        Have a coupon code?
      </label>
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyPress={handleKeyPress}
            placeholder="Enter coupon code"
            disabled={disabled || validating}
            className={`
              w-full px-4 py-2
              border rounded-lg
              bg-whiteColor dark:bg-whiteColor-dark
              text-headingColor dark:text-headingColor-dark
              placeholder-contentColor dark:placeholder-contentColor-dark
              border-borderColor dark:border-borderColor-dark
              focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? "border-red-500 dark:border-red-500" : ""}
            `}
          />
          {error && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleValidate}
          disabled={disabled || validating || !code.trim()}
          className={`
            px-6 py-2
            bg-primaryColor text-white
            rounded-lg font-medium
            hover:bg-primaryColor/90
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
            flex items-center gap-2
          `}
        >
          {validating ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Validating...
            </>
          ) : (
            "Apply"
          )}
        </button>
      </div>
    </div>
  );
};

export default CouponInput;

