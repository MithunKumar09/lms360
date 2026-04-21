"use client";

import { useState, useEffect, useRef } from "react";

/**
 * SearchInput Component
 * 
 * Enhanced search input with debounce, clear button, and loading indicator.
 * 
 * @param {Object} props
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Callback when search changes
 * @param {string} props.placeholder - Placeholder text
 * @param {number} props.debounceMs - Debounce delay in milliseconds (default: 500)
 * @param {number} props.minLength - Minimum characters before triggering (default: 0)
 * @param {boolean} props.isLoading - Show loading indicator
 * @param {string} props.className - Additional CSS classes
 */
export default function SearchInput({
  value = "",
  onChange,
  placeholder = "Search...",
  debounceMs = 500,
  minLength = 0,
  isLoading = false,
  className = "",
}) {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimer = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // If value is too short, don't trigger yet
    if (newValue.length < minLength && newValue.length > 0) {
      return;
    }

    // Debounce the onChange callback
    debounceTimer.current = setTimeout(() => {
      if (onChange) {
        onChange(newValue);
      }
    }, debounceMs);
  };

  const handleClear = () => {
    setLocalValue("");
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    if (onChange) {
      onChange("");
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-15px top-1/2 transform -translate-y-1/2 pointer-events-none">
        {isLoading ? (
          <svg
            className="animate-spin h-16px w-16px text-contentColor dark:text-contentColor-dark"
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
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-contentColor dark:text-contentColor-dark"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        )}
      </div>
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full pl-40px pr-40px py-12px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark placeholder:text-contentColor dark:placeholder:text-contentColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor ${className}`}
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-15px top-1/2 transform -translate-y-1/2 text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark transition-colors"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
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
      )}
    </div>
  );
}
