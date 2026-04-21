"use client";

import { useState, useEffect } from "react";

/**
 * AdvancedFilterPanel Component
 * 
 * Collapsible advanced filter panel with multiple filter types
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether panel is open
 * @param {Function} props.onToggle - Callback to toggle panel
 * @param {Array<Object>} props.filters - Filter configuration array
 * @param {Object} props.values - Current filter values
 * @param {Function} props.onChange - Callback when filter values change
 * @param {Function} props.onApply - Callback when Apply button is clicked
 * @param {Function} props.onClear - Callback when Clear button is clicked
 * @param {string} props.className - Additional CSS classes
 */
export default function AdvancedFilterPanel({
  isOpen = false,
  onToggle,
  filters = [],
  values = {},
  onChange,
  onApply,
  onClear,
  className = "",
}) {
  const [localValues, setLocalValues] = useState(values);

  // Update local values when props change
  useEffect(() => {
    setLocalValues(values);
  }, [values]);

  const handleFilterChange = (key, value) => {
    const newValues = { ...localValues, [key]: value };
    setLocalValues(newValues);
    onChange?.(newValues);
  };

  const handleApply = () => {
    onApply?.(localValues);
  };

  const handleClear = () => {
    const clearedValues = {};
    filters.forEach((filter) => {
      clearedValues[filter.key] = filter.defaultValue || null;
    });
    setLocalValues(clearedValues);
    onChange?.(clearedValues);
    onClear?.();
  };

  const hasActiveFilters = filters.some(
    (filter) =>
      localValues[filter.key] !== undefined &&
      localValues[filter.key] !== null &&
      localValues[filter.key] !== "" &&
      localValues[filter.key] !== filter.defaultValue
  );

  return (
    <div className={`border-2 border-borderColor dark:border-borderColor-dark rounded-md ${className}`}>
      {/* Header */}
      <button
        onClick={() => onToggle?.()}
        className="w-full flex items-center justify-between p-4 bg-lightGrey5 dark:bg-whiteColor-dark hover:bg-opacity-80 transition-colors rounded-t-md"
      >
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primaryColor"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          <span className="font-semibold text-blackColor dark:text-whiteColor">
            Advanced Filters
          </span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 bg-primaryColor text-whiteColor text-xs font-semibold rounded-full">
              {filters.filter(
                (f) =>
                  localValues[f.key] !== undefined &&
                  localValues[f.key] !== null &&
                  localValues[f.key] !== "" &&
                  localValues[f.key] !== f.defaultValue
              ).length}
            </span>
          )}
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-contentColor dark:text-contentColor-dark transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {/* Content */}
      {isOpen && (
        <div className="p-4 bg-whiteColor dark:bg-whiteColor-dark border-t border-borderColor dark:border-borderColor-dark">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filters.map((filter) => (
              <div key={filter.key}>
                <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                  {filter.label}
                </label>
                {renderFilterInput(filter, localValues[filter.key] ?? filter.defaultValue, handleFilterChange)}
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-borderColor dark:border-borderColor-dark">
            <button
              onClick={handleClear}
              disabled={!hasActiveFilters}
              className="px-4 py-2 text-sm font-semibold text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-whiteColor transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm font-semibold text-whiteColor bg-primaryColor rounded-md hover:bg-primaryColor/90 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Render filter input based on type
 */
function renderFilterInput(filter, value, onChange) {
  const handleChange = (newValue) => {
    onChange(filter.key, newValue);
  };

  switch (filter.type) {
    case "select":
      return (
        <select
          value={value || ""}
          onChange={(e) => handleChange(e.target.value || null)}
          className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
        >
          <option value="">All</option>
          {filter.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case "multiselect":
      const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
      return (
        <div className="space-y-2">
          {filter.options?.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedValues.includes(option.value)}
                onChange={(e) => {
                  const newValues = e.target.checked
                    ? [...selectedValues, option.value]
                    : selectedValues.filter((v) => v !== option.value);
                  handleChange(newValues.length > 0 ? newValues : null);
                }}
                className="w-4 h-4 text-primaryColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
              />
              <span className="text-sm text-contentColor dark:text-contentColor-dark">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      );

    case "daterange":
      return (
        <div className="flex gap-2">
          <input
            type="date"
            value={value?.from ? new Date(value.from).toISOString().split("T")[0] : ""}
            onChange={(e) =>
              handleChange({
                from: e.target.value ? new Date(e.target.value).toISOString() : null,
                to: value?.to || null,
              })
            }
            className="flex-1 py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          />
          <input
            type="date"
            value={value?.to ? new Date(value.to).toISOString().split("T")[0] : ""}
            onChange={(e) =>
              handleChange({
                from: value?.from || null,
                to: e.target.value ? new Date(e.target.value).toISOString() : null,
              })
            }
            className="flex-1 py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          />
        </div>
      );

    case "range":
      return (
        <div className="flex gap-2 items-center">
          <input
            type="number"
            placeholder="Min"
            value={value?.min || ""}
            onChange={(e) =>
              handleChange({
                min: e.target.value ? parseFloat(e.target.value) : null,
                max: value?.max || null,
              })
            }
            className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          />
          <span className="text-contentColor dark:text-contentColor-dark">-</span>
          <input
            type="number"
            placeholder="Max"
            value={value?.max || ""}
            onChange={(e) =>
              handleChange({
                min: value?.min || null,
                max: e.target.value ? parseFloat(e.target.value) : null,
              })
            }
            className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
          />
        </div>
      );

    case "checkbox":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleChange(e.target.checked)}
            className="w-4 h-4 text-primaryColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
          />
          <span className="text-sm text-contentColor dark:text-contentColor-dark">
            {filter.checkboxLabel || "Enable"}
          </span>
        </label>
      );

    default:
      return (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => handleChange(e.target.value || null)}
          placeholder={filter.placeholder}
          className="w-full py-2 px-4 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md"
        />
      );
  }
}
