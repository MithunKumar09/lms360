"use client";

import React from "react";

/**
 * FilterChips Component
 * 
 * Displays active filters as removable chips
 * 
 * @param {Object} props
 * @param {Array<Object>} props.filters - Array of active filters { key, label, value }
 * @param {Function} props.onRemove - Callback when a filter is removed
 * @param {Function} props.onClearAll - Callback when all filters are cleared
 * @param {string} props.className - Additional CSS classes
 */
export default function FilterChips({
  filters = [],
  onRemove,
  onClearAll,
  className = "",
}) {
  if (filters.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-sm text-contentColor dark:text-contentColor-dark">
        Active filters:
      </span>
      {filters.map((filter, index) => (
        <div
          key={`${filter.key}-${index}`}
          className="inline-flex items-center gap-2 px-3 py-1 bg-primaryColor/10 text-primaryColor rounded-full text-sm font-medium"
        >
          <span>
            {filter.label}: {filter.value}
          </span>
          <button
            onClick={() => onRemove?.(filter.key)}
            className="hover:text-primaryColor/70 transition-colors"
            aria-label={`Remove ${filter.label} filter`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </button>
        </div>
      ))}
      {onClearAll && (
        <button
          onClick={onClearAll}
          className="text-sm text-primaryColor hover:text-primaryColor/70 font-medium transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
