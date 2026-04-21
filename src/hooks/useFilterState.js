"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { buildFilterParams, parseFilterParams, getActiveFilterCount } from "@/lib/api/filters";

/**
 * Custom hook for managing filter state with URL synchronization
 * 
 * @param {Object} options - Hook options
 * @param {boolean} options.persistInStorage - Whether to persist filters in sessionStorage
 * @param {string} options.storageKey - Key for sessionStorage
 * @param {Object} options.defaultFilters - Default filter values
 * @returns {Object} Filter state and methods
 */
export function useFilterState(options = {}) {
  const {
    persistInStorage = false,
    storageKey = "vendor-filters",
    defaultFilters = {},
  } = options;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize filters from URL or storage
  const getInitialFilters = useCallback(() => {
    // First, try to get from URL
    const urlFilters = parseFilterParams(searchParams);
    if (Object.keys(urlFilters).length > 0) {
      return urlFilters;
    }

    // Then, try to get from sessionStorage
    if (persistInStorage && typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(storageKey);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.warn("Failed to parse stored filters:", error);
      }
    }

    // Finally, use defaults
    return { ...defaultFilters };
  }, [searchParams, persistInStorage, storageKey, defaultFilters]);

  const [filters, setFilters] = useState(getInitialFilters);

  // Update filters when URL changes
  useEffect(() => {
    const urlFilters = parseFilterParams(searchParams);
    if (Object.keys(urlFilters).length > 0) {
      setFilters((prev) => ({ ...prev, ...urlFilters }));
    }
  }, [searchParams]);

  // Persist filters to sessionStorage
  useEffect(() => {
    if (persistInStorage && typeof window !== "undefined") {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(filters));
      } catch (error) {
        console.warn("Failed to persist filters:", error);
      }
    }
  }, [filters, persistInStorage, storageKey]);

  // Update URL with current filters
  const updateURL = useCallback(
    (newFilters) => {
      const params = buildFilterParams(newFilters);
      const newSearchParams = new URLSearchParams();

      // Add all filter params
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
          newSearchParams.set(key, params[key]);
        }
      });

      // Update URL without causing a full page reload
      const newURL = `${pathname}?${newSearchParams.toString()}`;
      router.push(newURL, { scroll: false });
    },
    [pathname, router]
  );

  // Update a single filter
  const updateFilter = useCallback(
    (key, value) => {
      setFilters((prev) => {
        const newFilters = { ...prev, [key]: value };
        updateURL(newFilters);
        return newFilters;
      });
    },
    [updateURL]
  );

  // Update multiple filters at once
  const updateFilters = useCallback(
    (newFilters) => {
      setFilters((prev) => {
        const updated = { ...prev, ...newFilters };
        updateURL(updated);
        return updated;
      });
    },
    [updateURL]
  );

  // Clear a specific filter
  const clearFilter = useCallback(
    (key) => {
      setFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters[key];
        updateURL(newFilters);
        return newFilters;
      });
    },
    [updateURL]
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    const reset = { ...defaultFilters };
    setFilters(reset);
    updateURL(reset);

    // Clear from storage
    if (persistInStorage && typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(storageKey);
      } catch (error) {
        console.warn("Failed to clear stored filters:", error);
      }
    }
  }, [defaultFilters, updateURL, persistInStorage, storageKey]);

  // Get active filter count
  const activeFilterCount = getActiveFilterCount(filters);

  return {
    filters,
    updateFilter,
    updateFilters,
    clearFilter,
    resetFilters,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}

export default useFilterState;
