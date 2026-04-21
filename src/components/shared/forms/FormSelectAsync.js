/**
 * Async Select Component
 * 
 * Searchable async select component for loading options dynamically.
 * Supports both direct loadOptions function and React Query hooks for caching.
 * 
 * @module forms/FormSelectAsync
 */

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ValidationError from '@/components/shared/errors/ValidationError.js';

/**
 * Async Select Component
 * 
 * @param {Object} props - Component props
 * @param {string} props.value - Selected value
 * @param {Function} props.onChange - Change handler
 * @param {string} props.label - Field label
 * @param {string} props.name - Field name
 * @param {string|Object} props.error - Error message
 * @param {Function} props.loadOptions - Async function to load options (returns Promise<Array>) - DEPRECATED: use queryHook instead
 * @param {Object} props.queryHook - React Query hook result (e.g., from useOrganizations, useTerms, etc.)
 * @param {Function} props.mapData - Function to map query data to options format [{value, label}]
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.disabled - Disabled state
 * @param {string} props.className - Additional CSS classes
 */
export default function FormSelectAsync({
  value = '',
  onChange,
  label,
  name,
  error = null,
  loadOptions, // Legacy support
  queryHook, // New: React Query hook result
  mapData, // New: Function to map query data to options
  placeholder = 'Type to search...',
  disabled = false,
  className = '',
}) {
  // Use React Query hook if provided (new cached approach)
  const queryData = queryHook?.data;
  const queryLoading = queryHook?.isLoading || queryHook?.isFetching;
  const queryError = queryHook?.error;

  // Map query data to options format - this is the source of truth
  // Use this directly instead of state to ensure instant updates
  const mappedOptions = useMemo(() => {
    if (queryData && mapData) {
      return mapData(queryData);
    }
    return [];
  }, [queryData, mapData]);

  // Use mappedOptions directly as the source of truth - no state needed for options
  // This ensures data is always available immediately when query data is available
  // For legacy loadOptions, we still need state
  const [legacyOptions, setLegacyOptions] = useState([]);
  const options = queryHook && mapData ? mappedOptions : legacyOptions;

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const lastProcessedValueRef = useRef(value);
  const lastProcessedOptionsKeyRef = useRef(null);

  // Note: React Query automatically fetches enabled queries on mount
  // No need to manually trigger refetch - it causes infinite loops

  // Update selected option when value or options change - prevent infinite loops
  // Use a serialized version of options to detect actual changes
  const optionsKey = useMemo(() => {
    if (options.length === 0) return '';
    return options.map(o => `${o.value}:${o.label}`).join('|');
  }, [options]);
  
  useEffect(() => {
    // Check if we need to update selectedOption
    const valueChanged = value !== lastProcessedValueRef.current;
    const optionsKeyChanged = optionsKey !== lastProcessedOptionsKeyRef.current;
    
    // Only process if value or options actually changed
    if (valueChanged || optionsKeyChanged) {
      lastProcessedValueRef.current = value;
      lastProcessedOptionsKeyRef.current = optionsKey;
      
      if (value && options.length > 0) {
        const selected = options.find((opt) => opt.value === value);
        if (selected) {
          // Only update if the selected option actually changed
          const currentValue = selectedOption?.value;
          const currentLabel = selectedOption?.label;
          if (currentValue !== selected.value || currentLabel !== selected.label) {
            setSelectedOption(selected);
          }
        } else if (selectedOption && selectedOption.value !== value) {
          // Value changed but no matching option found - clear selection
          setSelectedOption(null);
        }
        // If value matches selectedOption but option not in current options, keep selectedOption
        // This handles the case where options are still loading or filtered
      } else if (!value && selectedOption !== null) {
        setSelectedOption(null);
      }
    }
  }, [value, optionsKey, options.length]); // Don't include selectedOption to prevent loops

  // Update loading state from query
  useEffect(() => {
    if (queryHook) {
      setLoading(queryLoading);
    }
  }, [queryLoading]); // Only depend on queryLoading, not queryHook object

  // Legacy: Load initial options using loadOptions function
  useEffect(() => {
    if (loadOptions && !queryHook) {
      setLoading(true);
      loadOptions('')
        .then((data) => {
          setLegacyOptions(data || []);
          // Find selected option if value exists
          if (value) {
            const selected = data?.find((opt) => opt.value === value);
            setSelectedOption(selected || null);
          }
        })
        .catch((error) => {
          console.error('Error loading options:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [loadOptions, queryHook, value]);

  // Legacy: Search options using loadOptions function
  useEffect(() => {
    if (loadOptions && !queryHook && searchTerm !== null) {
      const timeoutId = setTimeout(() => {
        setLoading(true);
        loadOptions(searchTerm)
          .then((data) => {
            setLegacyOptions(data || []);
          })
          .catch((error) => {
            console.error('Error searching options:', error);
          })
          .finally(() => {
            setLoading(false);
          });
      }, 300); // Debounce 300ms

      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, loadOptions, queryHook]);

  // Close dropdown when clicking outside (but keep open if loading)
  const isLoading = loading || (queryHook && (queryHook.isLoading || queryHook.isFetching));
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        // Don't close if we're loading data (user might be waiting for options)
        if (!isLoading) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLoading]); // Only depend on loading state

  const handleSelect = (option) => {
    setSelectedOption(option);
    setSearchTerm('');
    setIsOpen(false);
    if (onChange) {
      onChange(option.value);
    }
  };

  // Filter options based on search term (client-side filtering for cached data)
  const filteredOptions = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      return options;
    }
    const searchLower = searchTerm.toLowerCase();
    return options.filter((option) =>
      option.label?.toLowerCase().includes(searchLower)
    );
  }, [options, searchTerm]);

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
          className={`relative h-52px leading-52px bg-transparent text-sm text-contentColor dark:text-contentColor-dark border ${
            error
              ? 'border-red-500 dark:border-red-500'
              : 'border-borderColor dark:border-borderColor-dark'
          } rounded cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchTerm || '' : selectedOption?.label || value || ''}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedOption ? selectedOption.label : placeholder}
            disabled={disabled}
            readOnly={!isOpen}
            className="w-full h-full pl-5 pr-30px bg-transparent focus:outline-none placeholder:text-placeholder placeholder:opacity-80 font-medium"
            aria-invalid={!!error}
            aria-describedby={error ? `${name}-error` : undefined}
          />
          <div className="absolute right-5 top-1/2 transform -translate-y-1/2 pointer-events-none">
            {loading ? (
              <span className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-contentColor dark:border-contentColor-dark"></span>
            ) : (
              <svg
                className={`h-5 w-5 text-contentColor dark:text-contentColor-dark transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </div>
        </div>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-5px bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded shadow-lg max-h-60 overflow-auto">
            {/* Show loading if query is loading OR if we're using queryHook and have no data yet */}
            {(loading || (queryHook && (queryHook.isLoading || queryHook.isFetching))) && options.length === 0 ? (
              <div className="p-15px text-center text-contentColor dark:text-contentColor-dark text-sm">
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-15px text-center text-contentColor dark:text-contentColor-dark text-sm">
                {queryHook && (queryHook.isLoading || queryHook.isFetching) ? 'Loading...' : 'No options found'}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={`p-10px cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                    value === option.value ? 'bg-primaryColor/10 dark:bg-primaryColor/20' : ''
                  }`}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {error && <ValidationError error={error} field={name} className="mt-5px" />}
    </div>
  );
}

