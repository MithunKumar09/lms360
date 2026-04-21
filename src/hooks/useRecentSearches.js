/**
 * useRecentSearches Hook
 * 
 * Custom hook for managing recent searches in localStorage.
 * Provides functionality to save, retrieve, and clear recent searches.
 */

import { useState, useEffect, useCallback } from 'react';

const RECENT_SEARCHES_KEY = 'course_recent_searches';
const MAX_RECENT_SEARCHES = 10;

/**
 * Get recent searches from localStorage
 * @returns {Array<string>} Array of recent search terms
 */
const getRecentSearches = () => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading recent searches:', error);
    return [];
  }
};

/**
 * Save recent searches to localStorage
 * @param {Array<string>} searches - Array of search terms to save
 */
const saveRecentSearches = (searches) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch (error) {
    console.error('Error saving recent searches:', error);
  }
};

/**
 * useRecentSearches Hook
 * 
 * @returns {Object} Recent searches state and methods
 */
export const useRecentSearches = () => {
  const [recentSearches, setRecentSearches] = useState([]);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  /**
   * Add a search term to recent searches
   * @param {string} searchTerm - Search term to add
   */
  const addRecentSearch = useCallback((searchTerm) => {
    if (!searchTerm || searchTerm.trim().length === 0) return;

    setRecentSearches((prev) => {
      // Remove duplicate and trim
      const trimmed = searchTerm.trim();
      const filtered = prev.filter((term) => term.toLowerCase() !== trimmed.toLowerCase());
      
      // Add to beginning and limit to MAX_RECENT_SEARCHES
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      
      // Save to localStorage
      saveRecentSearches(updated);
      
      return updated;
    });
  }, []);

  /**
   * Remove a specific search term from recent searches
   * @param {string} searchTerm - Search term to remove
   */
  const removeRecentSearch = useCallback((searchTerm) => {
    setRecentSearches((prev) => {
      const updated = prev.filter((term) => term !== searchTerm);
      saveRecentSearches(updated);
      return updated;
    });
  }, []);

  /**
   * Clear all recent searches
   */
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    saveRecentSearches([]);
  }, []);

  return {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  };
};

export default useRecentSearches;



