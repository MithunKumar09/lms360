"use client";

import { useState, useEffect, useRef } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue.js";

/**
 * AdvancedSearch Component
 * 
 * Enhanced search component with debouncing, suggestions, and history
 * 
 * @param {Object} props
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Callback when search changes
 * @param {Function} props.onSearch - Callback when search is executed (debounced)
 * @param {string} props.placeholder - Placeholder text
 * @param {number} props.debounceDelay - Debounce delay in ms (default: 300)
 * @param {Array<string>} props.suggestions - Search suggestions
 * @param {boolean} props.showHistory - Show search history (default: true)
 * @param {number} props.maxHistoryItems - Maximum history items to show (default: 5)
 * @param {string} props.className - Additional CSS classes
 */
export default function AdvancedSearch({
  value = "",
  onChange,
  onSearch,
  placeholder = "Search...",
  debounceDelay = 300,
  suggestions = [],
  showHistory = true,
  maxHistoryItems = 5,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const searchInputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Debounce search value
  const debouncedValue = useDebouncedValue(value, debounceDelay);

  // Load search history from localStorage
  useEffect(() => {
    if (showHistory && typeof window !== "undefined") {
      const history = localStorage.getItem("searchHistory");
      if (history) {
        try {
          setSearchHistory(JSON.parse(history).slice(0, maxHistoryItems));
        } catch (e) {
          console.error("Failed to parse search history:", e);
        }
      }
    }
  }, [showHistory, maxHistoryItems]);

  // Save to search history
  const saveToHistory = (searchTerm) => {
    if (!searchTerm || !showHistory || typeof window === "undefined") return;

    const history = JSON.parse(localStorage.getItem("searchHistory") || "[]");
    const updatedHistory = [
      searchTerm,
      ...history.filter((item) => item !== searchTerm),
    ].slice(0, 10); // Keep last 10 searches

    localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
    setSearchHistory(updatedHistory.slice(0, maxHistoryItems));
  };

  // Handle input change
  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange?.(newValue);
    setIsOpen(newValue.length > 0 || (showHistory && searchHistory.length > 0));
  };

  // Handle search execution
  useEffect(() => {
    if (debouncedValue !== value && onSearch) {
      onSearch(debouncedValue);
    }
  }, [debouncedValue, onSearch]);

  // Handle suggestion/history click
  const handleSuggestionClick = (suggestion) => {
    onChange?.(suggestion);
    saveToHistory(suggestion);
    setIsOpen(false);
    if (onSearch) {
      onSearch(suggestion);
    }
  };

  // Handle clear
  const handleClear = () => {
    onChange?.("");
    setIsOpen(false);
    searchInputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Filter suggestions based on current value
  const filteredSuggestions = suggestions.filter((suggestion) =>
    suggestion.toLowerCase().includes(value.toLowerCase())
  );

  // Show history when input is empty
  const showHistoryItems = value.length === 0 && showHistory && searchHistory.length > 0;
  const showSuggestions = value.length > 0 && filteredSuggestions.length > 0;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={searchInputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full py-2 px-4 pl-10 pr-10 text-sm focus:outline-none text-contentColor dark:text-contentColor-dark bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md focus:border-primaryColor transition-colors"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
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
        </div>
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-contentColor dark:text-contentColor-dark hover:text-primaryColor transition-colors"
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

      {/* Dropdown */}
      {isOpen && (showHistoryItems || showSuggestions) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {showSuggestions && (
            <div className="p-2">
              <div className="text-xs font-semibold text-contentColor dark:text-contentColor-dark mb-2 px-2">
                Suggestions
              </div>
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm text-blackColor dark:text-whiteColor hover:bg-lightGrey5 dark:hover:bg-whiteColor-dark rounded-md transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {showHistoryItems && (
            <div className="p-2 border-t border-borderColor dark:border-borderColor-dark">
              <div className="text-xs font-semibold text-contentColor dark:text-contentColor-dark mb-2 px-2">
                Recent Searches
              </div>
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(item)}
                  className="w-full text-left px-3 py-2 text-sm text-blackColor dark:text-whiteColor hover:bg-lightGrey5 dark:hover:bg-whiteColor-dark rounded-md transition-colors flex items-center gap-2"
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
                    className="text-contentColor dark:text-contentColor-dark"
                  >
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                  </svg>
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
