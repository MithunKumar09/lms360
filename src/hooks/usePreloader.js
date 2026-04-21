/**
 * usePreloader Hook
 * 
 * Exposes preloader state and controls for components.
 * Allows components to manually trigger or check preloader state.
 * 
 * @returns {Object} Preloader state and controls
 */

'use client';

import { usePreloaderContext } from '@/components/providers/PreloaderProvider';

/**
 * usePreloader Hook
 * 
 * @returns {Object} Preloader state and controls
 * @property {boolean} isNavigating - Whether navigation is in progress
 * @property {boolean} isDataLoading - Whether critical data is loading
 * @property {boolean} showPreloader - Whether preloader should be shown
 * @property {Function} setShowPreloader - Function to manually show/hide preloader
 */
export const usePreloader = () => {
  try {
    const context = usePreloaderContext();
    return context;
  } catch (error) {
    // If PreloaderProvider is not in the tree, return safe defaults
    // This allows the hook to be used even if provider is not available
    console.warn('usePreloader: PreloaderProvider not found, returning defaults');
    return {
      isNavigating: false,
      isDataLoading: false,
      showPreloader: false,
      setShowPreloader: () => {},
    };
  }
};

export default usePreloader;

