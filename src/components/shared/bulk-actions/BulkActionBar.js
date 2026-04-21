"use client";

import React from "react";

/**
 * BulkActionBar Component
 * 
 * Toolbar that appears when items are selected for bulk operations
 * 
 * @param {Object} props
 * @param {number} props.selectedCount - Number of selected items
 * @param {number} props.totalCount - Total number of items
 * @param {Function} props.onSelectAll - Callback when "Select All" is clicked
 * @param {Function} props.onDeselectAll - Callback when "Deselect All" is clicked
 * @param {Array<Object>} props.actions - Array of action objects { label, onClick, icon?, variant?, disabled? }
 * @param {string} props.className - Additional CSS classes
 */
export default function BulkActionBar({
  selectedCount = 0,
  totalCount = 0,
  onSelectAll,
  onDeselectAll,
  actions = [],
  className = "",
}) {
  if (selectedCount === 0) return null;

  const allSelected = selectedCount === totalCount;

  const variantClasses = {
    primary: "bg-primaryColor text-whiteColor hover:bg-primaryColor/90",
    secondary: "bg-gray-600 text-whiteColor hover:bg-gray-700",
    danger: "bg-red-600 text-whiteColor hover:bg-red-700",
    outline: "border-2 border-primaryColor text-primaryColor hover:bg-primaryColor/10",
  };

  return (
    <div
      className={`sticky top-0 z-40 p-4 bg-primaryColor/10 dark:bg-primaryColor/20 border-2 border-primaryColor dark:border-primaryColor rounded-md shadow-md ${className}`}
    >
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-blackColor dark:text-whiteColor">
            {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
          </span>
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-sm text-primaryColor hover:text-primaryColor/70 font-medium transition-colors"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              disabled={action.disabled || selectedCount === 0}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                variantClasses[action.variant || "primary"]
              }`}
            >
              {action.icon && <span>{action.icon}</span>}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
