"use client";

import { useEffect } from "react";

/**
 * Logout Confirmation Modal
 * 
 * Modern, responsive confirmation modal for logout action.
 * Uses React state and Tailwind CSS for styling.
 * 
 * @param {boolean} isOpen - Whether modal is open
 * @param {Function} onClose - Function to close modal
 * @param {Function} onConfirm - Function to confirm logout
 * @param {boolean} isLoading - Whether logout is in progress
 */
const LogoutConfirmModal = ({ isOpen, onClose, onConfirm, isLoading = false }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = "17px";
    } else {
      document.body.style.overflow = "auto";
      document.body.style.paddingRight = "0";
    }

    return () => {
      document.body.style.overflow = "auto";
      document.body.style.paddingRight = "0";
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        // Close on backdrop click
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      aria-describedby="logout-modal-description"
    >
      <div
        className="w-full max-w-md transform overflow-hidden rounded-2xl bg-whiteColor dark:bg-whiteColor-dark p-6 shadow-xl transition-all duration-300 animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <svg
            className="h-6 w-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </div>

        {/* Title */}
        <h3
          id="logout-modal-title"
          className="text-lg font-semibold leading-6 text-blackColor dark:text-blackColor-dark text-center mb-2"
        >
          Confirm Logout
        </h3>

        {/* Description */}
        <div className="mt-2">
          <p
            id="logout-modal-description"
            className="text-sm text-contentColor dark:text-contentColor-dark text-center"
          >
            Are you sure you want to log out? You will need to sign in again to access your account.
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:gap-3">
          <button
            type="button"
            className="inline-flex justify-center rounded-lg border border-borderColor dark:border-borderColor-dark bg-whiteColor dark:bg-whiteColor-dark px-4 py-2.5 text-sm font-medium text-contentColor dark:text-contentColor-dark hover:bg-lightGrey10 dark:hover:bg-lightGrey10-dark focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center rounded-lg border border-transparent bg-red-600 dark:bg-red-600 px-4 py-2.5 text-sm font-medium text-whiteColor hover:bg-red-700 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-1"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-whiteColor"
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
                Logging out...
              </span>
            ) : (
              "Logout"
            )}
          </button>
        </div>
      </div>

    </div>
  );
};

export default LogoutConfirmModal;

