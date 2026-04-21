/**
 * MultiSelect Component
 * 
 * A multi-select dropdown component with checkbox list
 * Supports search, dark mode, and custom styling
 */

"use client";

import { useState, useRef, useEffect } from "react";

const MultiSelect = ({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select options...",
  label,
  error,
  disabled = false,
  searchable = true,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter options based on search term
  const filteredOptions = searchable
    ? options.filter((option) =>
        (option.label || option.name || String(option))
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    : options;

  // Handle option toggle
  const handleToggle = (value) => {
    if (disabled) return;

    const isSelected = selected.includes(value);
    if (isSelected) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  // Get display text for selected items
  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) {
      const option = options.find((opt) => opt.value === selected[0]);
      return option?.label || option?.name || selected[0];
    }
    return `${selected.length} selected`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {label && (
        <label className="mb-3 block font-semibold text-blackColor dark:text-blackColor-dark">
          {label}
          {error && (
            <span className="ml-2 text-red-500 text-sm font-normal">
              {error}
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full py-10px px-5 text-sm text-left focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 ${
            error
              ? "border-red-500"
              : "border-borderColor dark:border-borderColor-dark"
          } placeholder:text-placeholder placeholder:opacity-80 leading-23px rounded-md flex items-center justify-between ${
            disabled
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer hover:border-primaryColor dark:hover:border-primaryColor"
          }`}
        >
          <span
            className={`${
              selected.length === 0
                ? "text-placeholder opacity-80"
                : "text-contentColor dark:text-contentColor-dark"
            }`}
          >
            {getDisplayText()}
          </span>
          <i
            className={`icofont-simple-down transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md shadow-lg max-h-60 overflow-auto">
            {searchable && (
              <div className="p-2 border-b border-borderColor dark:border-borderColor-dark">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full py-2 px-3 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-sm text-contentColor dark:text-contentColor-dark text-center">
                  No options found
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const value = option.value || option.id || option;
                  const label = option.label || option.name || String(option);
                  const isSelected = selected.includes(value);

                  return (
                    <label
                      key={value}
                      className={`flex items-center gap-2 p-3 cursor-pointer hover:bg-darkdeep4 hover:text-whiteColor dark:hover:bg-darkdeep4 dark:hover:text-whiteColor ${
                        isSelected
                          ? "bg-primaryColor/10 text-primaryColor dark:text-primaryColor"
                          : "text-contentColor dark:text-contentColor-dark"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggle(value)}
                        className="w-4 h-4 rounded border-borderColor dark:border-borderColor-dark text-primaryColor focus:ring-primaryColor"
                      />
                      <span className="text-sm flex-1">{label}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default MultiSelect;

