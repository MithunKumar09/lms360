"use client";

import React from "react";

/**
 * BulkActionModal Component
 * 
 * Confirmation modal for bulk actions
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Callback to close modal
 * @param {Function} props.onConfirm - Callback when action is confirmed
 * @param {string} props.action - Action type (delete, update, export, etc.)
 * @param {string} props.title - Modal title
 * @param {string} props.message - Modal message
 * @param {number} props.itemCount - Number of items affected
 * @param {Array<string>} props.itemNames - Names of items (optional, for display)
 * @param {string} props.confirmLabel - Confirm button label
 * @param {string} props.cancelLabel - Cancel button label
 * @param {string} props.variant - Action variant (danger, warning, info)
 * @param {boolean} props.isLoading - Show loading state
 */
export default function BulkActionModal({
  isOpen = false,
  onClose,
  onConfirm,
  action = "delete",
  title,
  message,
  itemCount = 0,
  itemNames = [],
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
}) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-red-600"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      ),
      confirmButton: "bg-red-600 text-whiteColor hover:bg-red-700",
    },
    warning: {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-yellow-600"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      ),
      confirmButton: "bg-yellow-600 text-whiteColor hover:bg-yellow-700",
    },
    info: {
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-blue-600"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      ),
      confirmButton: "bg-blue-600 text-whiteColor hover:bg-blue-700",
    },
  };

  const style = variantStyles[variant] || variantStyles.danger;
  const defaultTitle = title || `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`;
  const defaultMessage =
    message ||
    `Are you sure you want to ${action} ${itemCount} ${itemCount === 1 ? "item" : "items"}?`;
  const defaultConfirmLabel = confirmLabel || action.charAt(0).toUpperCase() + action.slice(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-xl max-w-md w-full mx-4 border-2 border-borderColor dark:border-borderColor-dark">
        <div className="p-6">
          {/* Icon */}
          <div className="flex justify-center mb-4">{style.icon}</div>

          {/* Title */}
          <h3 className="text-xl font-bold text-blackColor dark:text-whiteColor text-center mb-2">
            {defaultTitle}
          </h3>

          {/* Message */}
          <p className="text-sm text-contentColor dark:text-contentColor-dark text-center mb-4">
            {defaultMessage}
          </p>

          {/* Item List (if provided and not too many) */}
          {itemNames.length > 0 && itemNames.length <= 5 && (
            <div className="mb-4 p-3 bg-lightGrey5 dark:bg-whiteColor-dark rounded-md max-h-32 overflow-y-auto">
              <ul className="text-sm text-contentColor dark:text-contentColor-dark space-y-1">
                {itemNames.map((name, index) => (
                  <li key={index}>• {name}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark bg-lightGrey5 dark:bg-whiteColor-dark rounded-md hover:bg-opacity-80 transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${style.confirmButton}`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
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
                  Processing...
                </span>
              ) : (
                defaultConfirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
