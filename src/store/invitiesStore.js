/**
 * Invities UI Store
 * 
 * Manages UI state for the Invities Management page.
 * Uses Zustand for state management.
 */

import { create } from 'zustand';

/**
 * Invities UI Store
 */
const useInvitiesStore = create((set, get) => ({
  // View state: 'users' or 'invities'
  currentView: 'users',
  
  // Pending invites count
  pendingCount: 0,
  countLastFetched: null,
  countFetching: false,
  
  // Set current view
  setView: (view) => set({ currentView: view }),
  
  // Reset to default view
  resetView: () => set({ currentView: 'users' }),
  
  // Set pending count
  setPendingCount: (count) => set({ 
    pendingCount: count,
    countLastFetched: Date.now()
  }),
  
  // Set fetching state
  setCountFetching: (fetching) => set({ countFetching: fetching }),
  
  // Check if count needs refresh (older than 2 minutes)
  shouldRefreshCount: () => {
    const lastFetched = get().countLastFetched;
    if (!lastFetched) return true;
    return Date.now() - lastFetched > 2 * 60 * 1000; // 2 minutes
  },
}));

export default useInvitiesStore;

