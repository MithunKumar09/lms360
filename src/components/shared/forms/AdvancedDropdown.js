/**
 * Advanced Dropdown Component
 * 
 * A professional, reusable dropdown component with:
 * - Search functionality with debouncing
 * - Pagination support
 * - Single and multi-select modes
 * - Checkbox support for multi-select
 * - Loading states
 * - Error handling
 * - Keyboard navigation
 * - Accessibility support
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

/**
 * AdvancedDropdown Component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.options - Array of options { id, label, value?, ... }
 * @param {string|string[]|null} props.value - Selected value(s)
 * @param {Function} props.onChange - Change handler (value) => void
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.label - Label text
 * @param {boolean} props.multiple - Enable multi-select mode
 * @param {boolean} props.searchable - Enable search
 * @param {boolean} props.paginated - Enable pagination
 * @param {Object} props.pagination - Pagination object { page, limit, total, pages }
 * @param {Function} props.onPageChange - Page change handler (page) => void
 * @param {Function} props.onSearch - Search handler (searchTerm) => void
 * @param {boolean} props.loading - Loading state
 * @param {Error|null} props.error - Error state
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.errorMessage - Error message to display
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.id - Input ID for accessibility
 * @param {Function} props.renderOption - Custom option renderer
 * @param {number} props.maxHeight - Max height for dropdown menu
 * @returns {JSX.Element} AdvancedDropdown component
 */
const AdvancedDropdown = ({
  options = [],
  value = null,
  onChange,
  placeholder = 'Select...',
  label,
  multiple = false,
  searchable = true,
  paginated = false,
  pagination = { page: 1, limit: 20, total: 0, pages: 0 },
  onPageChange,
  onSearch,
  loading = false,
  error = null,
  className = '',
  errorMessage,
  disabled = false,
  id,
  renderOption,
  maxHeight = 300,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const optionsListRef = useRef(null);

  // Debounce search term
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // Handle search
  useEffect(() => {
    if (searchable && onSearch && debouncedSearchTerm !== searchTerm) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch, searchable]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, searchable]);

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && optionsListRef.current) {
      const focusedElement = optionsListRef.current.children[focusedIndex];
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex]);

  // Get selected values array (deduplicated)
  const selectedValues = multiple
    ? Array.isArray(value)
      ? [...new Set(value.filter(id => id != null))]
      : value
        ? [value]
        : []
    : value
      ? [value]
      : [];

  // Get display text
  const getDisplayText = () => {
    if (multiple) {
      if (selectedValues.length === 0) {
        return placeholder;
      }
      if (selectedValues.length === 1) {
        const option = options.find((opt) => opt.id === selectedValues[0]);
        return option?.label || placeholder;
      }
      return `${selectedValues.length} selected`;
    } else {
      const option = options.find((opt) => opt.id === value);
      return option?.label || placeholder;
    }
  };

  // Handle option click
  const handleOptionClick = (optionId) => {
    if (multiple) {
      // Remove duplicates and null values
      const currentValues = [...new Set(selectedValues.filter(id => id != null))];
      const newValues = currentValues.includes(optionId)
        ? currentValues.filter((id) => id !== optionId)
        : [...currentValues, optionId];
      // Ensure no duplicates in the final array
      const deduplicatedValues = [...new Set(newValues.filter(id => id != null))];
      onChange(deduplicatedValues);
    } else {
      onChange(optionId);
      setIsOpen(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (focusedIndex >= 0 && options[focusedIndex]) {
          handleOptionClick(options[focusedIndex].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Filter options based on search
  const filteredOptions = searchable && searchTerm
    ? options.filter((option) =>
        option.label?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Custom option renderer
  const renderOptionItem = (option, index) => {
    if (renderOption) {
      return renderOption(option, index, {
        isSelected: selectedValues.includes(option.id),
        isFocused: index === focusedIndex,
        onSelect: () => handleOptionClick(option.id),
      });
    }

    const isSelected = selectedValues.includes(option.id);
    const isFocused = index === focusedIndex;

    return (
      <div
        key={option.id}
        role="option"
        aria-selected={isSelected}
        className={`
          px-4 py-2 cursor-pointer transition-colors
          ${isFocused ? 'bg-primaryColor/10 dark:bg-primaryColor/20' : ''}
          ${isSelected ? 'bg-primaryColor/20 dark:bg-primaryColor/30 font-semibold' : ''}
          hover:bg-primaryColor/10 dark:hover:bg-primaryColor/20
          flex items-center gap-2
        `}
        onClick={(e) => {
          // Don't trigger if clicking on the checkbox
          if (e.target.type !== 'checkbox') {
            handleOptionClick(option.id);
          }
        }}
        onMouseEnter={() => setFocusedIndex(index)}
      >
        {multiple && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              handleOptionClick(option.id);
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="w-4 h-4 text-primaryColor rounded border-borderColor focus:ring-primaryColor"
          />
        )}
        <span className="flex-1 text-contentColor dark:text-contentColor-dark">
          {option.label}
        </span>
        {isSelected && !multiple && (
          <svg
            className="w-5 h-5 text-primaryColor"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className="block mb-2 text-sm font-semibold text-headingColor dark:text-headingColor-dark"
        >
          {label}
        </label>
      )}

      {/* Dropdown Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          w-full px-4 py-2.5 text-left
          bg-whiteColor dark:bg-whiteColor-dark
          border-2 rounded-md
          ${error || errorMessage
            ? 'border-red-500 dark:border-red-400'
            : 'border-borderColor dark:border-borderColor-dark'
          }
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:border-primaryColor dark:hover:border-primaryColor'
          }
          focus:outline-none focus:ring-2 focus:ring-primaryColor focus:border-primaryColor
          transition-colors
          flex items-center justify-between
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={label || placeholder}
      >
        <span
          className={`
            flex-1 truncate
            ${selectedValues.length === 0
              ? 'text-placeholder opacity-80'
              : 'text-contentColor dark:text-contentColor-dark'
            }
          `}
        >
          {getDisplayText()}
        </span>
        <svg
          className={`
            w-5 h-5 transition-transform flex-shrink-0 ml-2
            ${isOpen ? 'rotate-180' : ''}
            text-contentColor dark:text-contentColor-dark
          `}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Error Message */}
      {(error || errorMessage) && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {errorMessage || error?.message || 'An error occurred'}
        </p>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`
            absolute z-50 w-full mt-1
            bg-whiteColor dark:bg-whiteColor-dark
            border-2 border-borderColor dark:border-borderColor-dark
            rounded-md shadow-lg
            overflow-hidden
          `}
          role="listbox"
          aria-label={label || 'Options'}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-borderColor dark:border-borderColor-dark">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="
                  w-full px-3 py-2
                  bg-whiteColor dark:bg-whiteColor-dark
                  border border-borderColor dark:border-borderColor-dark
                  rounded-md
                  text-contentColor dark:text-contentColor-dark
                  placeholder:text-placeholder placeholder:opacity-80
                  focus:outline-none focus:ring-2 focus:ring-primaryColor
                "
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="p-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primaryColor border-t-transparent"></div>
              <p className="mt-2 text-sm text-contentColor dark:text-contentColor-dark">
                Loading...
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-4 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {typeof error === 'string' 
                  ? error 
                  : (error?.message && typeof error.message === 'string')
                    ? error.message
                    : String(error?.message || error || 'Failed to load options')}
              </p>
            </div>
          )}

          {/* Options List */}
          {!loading && !error && (
            <>
              <div
                ref={optionsListRef}
                className="overflow-y-auto"
                style={{ maxHeight: `${maxHeight}px` }}
              >
                {filteredOptions.length === 0 ? (
                  <div className="p-4 text-center text-sm text-contentColor dark:text-contentColor-dark">
                    {searchTerm ? 'No results found' : 'No options available'}
                  </div>
                ) : (
                  filteredOptions.map((option, index) =>
                    renderOptionItem(option, index)
                  )
                )}
              </div>

              {/* Pagination */}
              {paginated && pagination.pages > 1 && (
                <div className="p-2 border-t border-borderColor dark:border-borderColor-dark flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onPageChange?.(pagination.page - 1)}
                    disabled={pagination.page <= 1 || loading}
                    className="
                      px-3 py-1 text-sm
                      bg-whiteColor dark:bg-whiteColor-dark
                      border border-borderColor dark:border-borderColor-dark
                      rounded-md
                      text-contentColor dark:text-contentColor-dark
                      hover:bg-primaryColor hover:text-whiteColor
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors
                    "
                  >
                    Previous
                  </button>
                  <span className="text-sm text-contentColor dark:text-contentColor-dark">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    type="button"
                    onClick={() => onPageChange?.(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages || loading}
                    className="
                      px-3 py-1 text-sm
                      bg-whiteColor dark:bg-whiteColor-dark
                      border border-borderColor dark:border-borderColor-dark
                      rounded-md
                      text-contentColor dark:text-contentColor-dark
                      hover:bg-primaryColor hover:text-whiteColor
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors
                    "
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdvancedDropdown;

