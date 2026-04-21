/**
 * Multi-Select Component
 * 
 * Multi-select dropdown component for selecting multiple options.
 * 
 * @module forms/FormMultiSelect
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import ValidationError from '@/components/shared/errors/ValidationError.js';

/**
 * Multi-Select Component
 * 
 * @param {Object} props - Component props
 * @param {Array} props.value - Selected values array
 * @param {Function} props.onChange - Change handler (receives array)
 * @param {string} props.label - Field label
 * @param {string} props.name - Field name
 * @param {Array} props.options - Options array [{ value, label }]
 * @param {string|Object} props.error - Error message
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.className - Additional CSS classes
 */
export default function FormMultiSelect({
  value = [],
  onChange,
  label,
  name,
  options = [],
  error = null,
  placeholder = 'Select options...',
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValues, setSelectedValues] = useState(value || []);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setSelectedValues(value || []);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (optionValue) => {
    if (disabled) return;

    const newValues = selectedValues.includes(optionValue)
      ? selectedValues.filter((v) => v !== optionValue)
      : [...selectedValues, optionValue];

    setSelectedValues(newValues);
    if (onChange) {
      onChange(newValues);
    }
  };

  const handleRemove = (optionValue, e) => {
    e.stopPropagation();
    const newValues = selectedValues.filter((v) => v !== optionValue);
    setSelectedValues(newValues);
    if (onChange) {
      onChange(newValues);
    }
  };

  const selectedOptions = options.filter((opt) => selectedValues.includes(opt.value));
  const displayText =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length === 1
      ? selectedOptions[0].label
      : `${selectedOptions.length} selected`;

  return (
    <div className={`mb-25px ${className}`} ref={wrapperRef}>
      {label && (
        <label
          className="text-contentColor dark:text-contentColor-dark mb-10px block text-sm font-medium"
          htmlFor={name}
        >
          {label}
        </label>
      )}

      <div className="relative">
        <div
          className={`min-h-52px bg-transparent text-sm text-contentColor dark:text-contentColor-dark border ${
            error
              ? 'border-red-500 dark:border-red-500'
              : 'border-borderColor dark:border-borderColor-dark'
          } rounded cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          {/* Selected Tags */}
          {selectedOptions.length > 0 && (
            <div className="p-10px flex flex-wrap gap-5px">
              {selectedOptions.map((option) => (
                <span
                  key={option.value}
                  className="inline-flex items-center gap-5px px-10px py-5px bg-primaryColor/10 dark:bg-primaryColor/20 text-primaryColor dark:text-primaryColor rounded text-xs"
                >
                  {option.label}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => handleRemove(option.value, e)}
                      className="hover:text-red-500 transition-colors"
                      aria-label={`Remove ${option.label}`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}

          {/* Placeholder or Display */}
          <div className="p-10px flex items-center justify-between">
            <span className={selectedOptions.length === 0 ? 'text-placeholder opacity-80' : ''}>
              {displayText}
            </span>
            <svg
              className={`h-5 w-5 text-contentColor dark:text-contentColor-dark transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-5px bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded shadow-lg max-h-60 overflow-auto">
            {options.length === 0 ? (
              <div className="p-15px text-center text-contentColor dark:text-contentColor-dark text-sm">
                No options available
              </div>
            ) : (
              options.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleToggle(option.value)}
                    className={`p-10px cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center gap-10px ${
                      isSelected ? 'bg-primaryColor/10 dark:bg-primaryColor/20' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(option.value)}
                      className="w-4 h-4 text-primaryColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor"
                    />
                    <span>{option.label}</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {error && <ValidationError error={error} field={name} className="mt-5px" />}
    </div>
  );
}

