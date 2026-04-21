/**
 * Reviews Store
 * 
 * Zustand store for managing reviews UI state (expand/collapse)
 */

import { create } from 'zustand';

const useReviewsStore = create((set) => ({
  // Expanded review IDs
  expandedReviews: new Set(),

  // Toggle expand/collapse for a review
  toggleReview: (reviewId) => {
    set((state) => {
      const newExpanded = new Set(state.expandedReviews);
      if (newExpanded.has(reviewId)) {
        newExpanded.delete(reviewId);
      } else {
        newExpanded.add(reviewId);
      }
      return { expandedReviews: newExpanded };
    });
  },

  // Check if a review is expanded
  isExpanded: (reviewId) => {
    return useReviewsStore.getState().expandedReviews.has(reviewId);
  },

  // Expand all reviews
  expandAll: (reviewIds) => {
    set({ expandedReviews: new Set(reviewIds) });
  },

  // Collapse all reviews
  collapseAll: () => {
    set({ expandedReviews: new Set() });
  },
}));

export default useReviewsStore;
