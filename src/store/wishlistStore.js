/**
 * Wishlist Store
 * 
 * Manages wishlist state for courses using Zustand.
 * Provides optimistic updates and local state management.
 * 
 * @typedef {Object} WishlistItem
 * @property {string} id - Course ID
 * @property {string} title - Course title
 * @property {number} price - Course price
 * @property {string} thumbnailUrl - Course thumbnail URL
 * @property {string} categoryName - Category name
 * @property {boolean} isFree - Whether course is free
 * @property {Date} addedAt - When item was added to wishlist
 * 
 * @typedef {Object} WishlistState
 * @property {WishlistItem[]} items - Wishlist items
 * @property {Set<string>} itemIds - Set of course IDs in wishlist (for quick lookup)
 * @property {boolean} isLoading - Whether wishlist is loading
 * @property {boolean} isSyncing - Whether wishlist is syncing with server
 * 
 * @typedef {Object} WishlistActions
 * @property {Function} setItems - Set wishlist items
 * @property {Function} addItem - Add item to wishlist
 * @property {Function} removeItem - Remove item from wishlist
 * @property {Function} clearWishlist - Clear all items
 * @property {Function} setLoading - Set loading state
 * @property {Function} setSyncing - Set syncing state
 * @property {Function} isInWishlist - Check if course is in wishlist
 * @property {Function} toggleItem - Toggle item in wishlist
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * Wishlist Store
 * 
 * Uses Zustand for state management with devtools support.
 * Does NOT persist to localStorage - wishlist is fetched from server.
 */
const useWishlistStore = create(
  devtools(
    (set, get) => ({
      // State
      items: [],
      itemIds: new Set(), // For O(1) lookup
      isLoading: false,
      isSyncing: false,

      /**
       * Set wishlist items
       * @param {WishlistItem[]} items - Wishlist items
       */
      setItems: (items) => {
        const itemIds = new Set(items.map((item) => item.id || item.courseId));
        set({ items, itemIds }, false, 'wishlist/setItems');
      },

      /**
       * Add item to wishlist (optimistic update)
       * @param {WishlistItem} item - Item to add
       */
      addItem: (item) => {
        const { items, itemIds } = get();
        const itemId = item.id || item.courseId;
        
        // Check if already exists
        if (itemIds.has(itemId)) {
          return false; // Already in wishlist
        }

        // Add to items and itemIds
        const newItems = [
          ...items,
          {
            ...item,
            addedAt: new Date(),
          },
        ];
        const newItemIds = new Set([...itemIds, itemId]);

        set({ items: newItems, itemIds: newItemIds }, false, 'wishlist/addItem');
        return true;
      },

      /**
       * Remove item from wishlist (optimistic update)
       * @param {string} itemId - Course ID to remove
       */
      removeItem: (itemId) => {
        const { items, itemIds } = get();
        
        // Check if exists
        if (!itemIds.has(itemId)) {
          return false; // Not in wishlist
        }

        // Remove from items and itemIds
        const newItems = items.filter((item) => (item.id || item.courseId) !== itemId);
        const newItemIds = new Set(itemIds);
        newItemIds.delete(itemId);

        set({ items: newItems, itemIds: newItemIds }, false, 'wishlist/removeItem');
        return true;
      },

      /**
       * Clear wishlist
       */
      clearWishlist: () => {
        set({ items: [], itemIds: new Set() }, false, 'wishlist/clearWishlist');
      },

      /**
       * Set loading state
       * @param {boolean} isLoading - Loading state
       */
      setLoading: (isLoading) => {
        set({ isLoading }, false, 'wishlist/setLoading');
      },

      /**
       * Set syncing state
       * @param {boolean} isSyncing - Syncing state
       */
      setSyncing: (isSyncing) => {
        set({ isSyncing }, false, 'wishlist/setSyncing');
      },

      /**
       * Check if course is in wishlist
       * @param {string} courseId - Course ID
       * @returns {boolean} True if in wishlist
       */
      isInWishlist: (courseId) => {
        return get().itemIds.has(courseId);
      },

      /**
       * Toggle item in wishlist
       * @param {WishlistItem} item - Item to toggle
       * @returns {boolean} True if added, false if removed
       */
      toggleItem: (item) => {
        const { items, itemIds } = get();
        const itemId = item.id || item.courseId;
        
        if (itemIds.has(itemId)) {
          get().removeItem(itemId);
          return false; // Removed
        } else {
          get().addItem(item);
          return true; // Added
        }
      },

      /**
       * Get wishlist count
       * @returns {number} Number of items in wishlist
       */
      getCount: () => {
        return get().items.length;
      },
    }),
    {
      name: 'wishlist-store', // For devtools
    }
  )
);

export default useWishlistStore;



