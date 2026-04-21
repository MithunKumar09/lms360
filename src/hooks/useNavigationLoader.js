/**
 * useNavigationLoader Hook
 * 
 * Tracks navigation state with a delay to avoid flickering on fast navigations.
 * Shows preloader only if navigation takes longer than the threshold.
 * 
 * @param {number} delay - Delay in milliseconds before showing preloader (default: 250ms)
 * @returns {Object} Navigation state and controls
 */

'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export const useNavigationLoader = (delay = 250) => {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [showPreloader, setShowPreloader] = useState(false);
  const preloaderTimeoutRef = useRef(null);
  const completionTimeoutRef = useRef(null);
  const previousPathnameRef = useRef(pathname);
  const isInitialMountRef = useRef(true);

  useEffect(() => {
    // Skip on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousPathnameRef.current = pathname;
      return;
    }

    // Check if pathname actually changed
    if (pathname !== previousPathnameRef.current) {
      // Navigation started
      setIsNavigating(true);
      
      // Clear any existing timeouts
      if (preloaderTimeoutRef.current) {
        clearTimeout(preloaderTimeoutRef.current);
      }
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }

      // Set timeout to show preloader after delay
      preloaderTimeoutRef.current = setTimeout(() => {
        setShowPreloader(true);
      }, delay);

      // Update previous pathname
      previousPathnameRef.current = pathname;
    }

    // Set timeout to complete navigation when pathname stabilizes
    // This handles the case where navigation completes quickly
    if (completionTimeoutRef.current) {
      clearTimeout(completionTimeoutRef.current);
    }

    completionTimeoutRef.current = setTimeout(() => {
      if (isNavigating) {
        setIsNavigating(false);
        setShowPreloader(false);
      }
    }, 300); // Complete navigation after pathname stabilizes for 300ms

    // Cleanup on unmount
    return () => {
      if (preloaderTimeoutRef.current) {
        clearTimeout(preloaderTimeoutRef.current);
      }
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
      }
    };
  }, [pathname, delay, isNavigating]);

  // Function to manually start navigation (for programmatic navigation)
  const startNavigation = () => {
    setIsNavigating(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setShowPreloader(true);
    }, delay);
  };

  // Function to complete navigation (call when navigation completes)
  const completeNavigation = () => {
    setIsNavigating(false);
    setShowPreloader(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  return {
    isNavigating,
    showPreloader,
    startNavigation,
    completeNavigation,
  };
};

export default useNavigationLoader;

