/**
 * PreloaderProvider Component
 * 
 * Global provider that manages preloader visibility based on:
 * - Navigation state (with delay to avoid flickering)
 * - Critical React Query data loading states
 * 
 * Shows preloader when:
 * - Navigation takes longer than threshold (250ms default)
 * - Critical queries are fetching
 */

'use client';

import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { useNavigationLoader } from '@/hooks/useNavigationLoader';
import Preloader from '@/components/shared/others/Preloader';

// Create context for preloader state
const PreloaderContext = createContext({
  isNavigating: false,
  isDataLoading: false,
  showPreloader: false,
  setShowPreloader: () => {},
});

/**
 * Hook to access preloader context
 */
export const usePreloaderContext = () => {
  const context = useContext(PreloaderContext);
  if (!context) {
    throw new Error('usePreloaderContext must be used within PreloaderProvider');
  }
  return context;
};

/**
 * PreloaderProvider Component
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {number} props.navigationDelay - Delay before showing preloader on navigation (default: 250ms)
 */
export const PreloaderProvider = ({ children, navigationDelay = 250 }) => {
  const { isNavigating, showPreloader: showNavPreloader } = useNavigationLoader(navigationDelay);
  const [manualShow, setManualShow] = useState(false);

  // Track critical React Query queries
  // Critical queries are those marked with meta: { isCritical: true }
  const isFetchingCritical = useIsFetching({
    predicate: (query) => {
      // Check if query has isCritical flag in meta
      return query.meta?.isCritical === true;
    },
  });

  // Also check for specific critical query keys
  const isFetchingSession = useIsFetching({ queryKey: ['session'] });
  const isFetchingUser = useIsFetching({ queryKey: ['user'] });
  const isFetchingCourses = useIsFetching({ 
    queryKey: ['courses'],
    exact: false, // Match any query starting with 'courses'
  });
  const isFetchingUsers = useIsFetching({ 
    queryKey: ['users'],
    exact: false, // Match any query starting with 'users'
  });

  // Determine if critical data is loading
  const isDataLoading = useMemo(() => {
    return (
      isFetchingCritical > 0 ||
      isFetchingSession > 0 ||
      isFetchingUser > 0 ||
      isFetchingCourses > 0 ||
      isFetchingUsers > 0
    );
  }, [isFetchingCritical, isFetchingSession, isFetchingUser, isFetchingCourses, isFetchingUsers]);

  // Show preloader if:
  // - Navigation is taking longer than threshold (showNavPreloader)
  // - Critical data is loading (isDataLoading)
  // - Manually triggered (manualShow)
  const showPreloader = useMemo(() => {
    return showNavPreloader || isDataLoading || manualShow;
  }, [showNavPreloader, isDataLoading, manualShow]);

  // Context value
  const contextValue = useMemo(
    () => ({
      isNavigating,
      isDataLoading,
      showPreloader,
      setShowPreloader: setManualShow,
    }),
    [isNavigating, isDataLoading, showPreloader]
  );

  return (
    <PreloaderContext.Provider value={contextValue}>
      {children}
      {showPreloader && <Preloader />}
    </PreloaderContext.Provider>
  );
};

export default PreloaderProvider;

