/**
 * Users Count Store
 * 
 * Manages count state for verified and unverified users.
 * Uses Zustand for state management to avoid unnecessary DB calls.
 */

import { create } from 'zustand';

/**
 * Users Count Store
 */
const useUsersCountStore = create((set, get) => ({
  // Verified users count
  verifiedCount: 0,
  verifiedCountLastFetched: null,
  verifiedCountFetching: false,
  
  // Unverified users count
  unverifiedCount: 0,
  unverifiedCountLastFetched: null,
  unverifiedCountFetching: false,
  
  // Set verified count
  setVerifiedCount: (count) => set({ 
    verifiedCount: count,
    verifiedCountLastFetched: Date.now()
  }),
  
  // Set unverified count
  setUnverifiedCount: (count) => set({ 
    unverifiedCount: count,
    unverifiedCountLastFetched: Date.now()
  }),
  
  // Set fetching states
  setVerifiedCountFetching: (fetching) => set({ verifiedCountFetching: fetching }),
  setUnverifiedCountFetching: (fetching) => set({ unverifiedCountFetching: fetching }),
  
  // Check if counts need refresh (older than 2 minutes)
  shouldRefreshVerifiedCount: () => {
    const lastFetched = get().verifiedCountLastFetched;
    if (!lastFetched) return true;
    return Date.now() - lastFetched > 2 * 60 * 1000; // 2 minutes
  },
  
  shouldRefreshUnverifiedCount: () => {
    const lastFetched = get().unverifiedCountLastFetched;
    if (!lastFetched) return true;
    return Date.now() - lastFetched > 2 * 60 * 1000; // 2 minutes
  },
}));

export default useUsersCountStore;

