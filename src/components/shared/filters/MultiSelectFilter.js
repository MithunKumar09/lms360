"use client";

import { useState, useRef, useEffect } from "react";

/**
 * MultiSelectFilter Component
 * 
 * Multi-select dropdown with search functionality.
 * 
 * @param {Object} props
 * @param {Array} props.options - Array of { id, label, value } objects
 * @param {Array} props.value - Selected values array
 * @param {Function} props.onChange - Callback when selection changes
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.searchable - Enable search within options
 * @param {string} props.className - Additional CSS classes
 */
export default function MultiSelectFilter({
  options = [],
  value = [],
  onChange,
  placeholder = "Select options...",
  searchable = true,
  className = "",
}) {
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

  const filteredOptions = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  const handleToggle = (optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];

    if (onChange) {
      onChange(newValue);
    }
  };

  const handleSelectAll = () => {
    const allValues = options.map((opt) => opt.value);
    if (onChange) {
      onChange(allValues);
    }
  };

  const handleDeselectAll = () => {
    if (onChange) {
      onChange([]);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-15px py-12px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark text-14px text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primaryColor"
      >
        <span className="truncate">
          {selectedOptions.length === 0
            ? placeholder
            : selectedOptions.length === 1
            ? selectedOptions[0].label
            : `${selectedOptions.length} selected`}
        </span>
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
          className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-5px bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-5 shadow-lg max-h-300px overflow-hidden">
          {searchable && (
            <div className="p-10px border-b border-borderColor dark:border-borderColor-dark">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search options..."
                className="w-full px-10px py-8px border border-borderColor dark:border-borderColor-dark rounded-5 bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark text-14px focus:outline-none focus:ring-2 focus:ring-primaryColor"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <div className="p-5px border-b border-borderColor dark:border-borderColor-dark flex gap-5px">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex-1 px-10px py-5px text-12px text-primaryColor hover:bg-lightGrey5 dark:hover:bg-darkdeep1 rounded-3 transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="flex-1 px-10px py-5px text-12px text-contentColor dark:text-contentColor-dark hover:bg-lightGrey5 dark:hover:bg-darkdeep1 rounded-3 transition-colors"
            >
              Deselect All
            </button>
          </div>

          <div className="max-h-200px overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-15px text-14px text-contentColor dark:text-contentColor-dark text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <label
                    key={option.id || option.value}
                    className="flex items-center p-10px hover:bg-lightGrey5 dark:hover:bg-darkdeep1 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(option.value)}
                      className="mr-10px w-16px h-16px text-primaryColor focus:ring-primaryColor rounded-3"
                    />
                    <span className="text-14px text-blackColor dark:text-blackColor-dark">
                      {option.label}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
