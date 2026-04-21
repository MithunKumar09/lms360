/**
 * useWishlist API Hooks
 * 
 * React Query hooks for wishlist operations.
 * Provides queries and mutations for wishlist management with optimistic updates.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import { getEndpoint, buildEndpoint } from '@/lib/api/endpoints.js';
import { useAuthStore, useWishlistStore } from '@/store/index.js';
import useSweetAlert from '@/hooks/useSweetAlert';

/**
 * useWishlist Query Hook
 * 
 * Fetches user's wishlist from the server.
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled
 * @returns {Object} Wishlist query
 */
export const useWishlist = (options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { setItems, setLoading } = useWishlistStore();

  return useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(getEndpoint('wishlist.list'));

        // Handle 404 or empty responses gracefully
        if (response.status === 404 || !response.success) {
          // Return empty wishlist instead of throwing error
          const emptyItems = [];
          setItems(emptyItems);
          return {
            items: emptyItems,
            count: 0,
            success: true,
            ...response,
          };
        }

        // Transform API response to wishlist items
        const items = response.wishlistItems || response.items || [];
        
        // Update Zustand store
        setItems(items);
        
        return {
          items,
          count: items.length,
          ...response,
        };
      } catch (error) {
        // Handle network errors or other issues
        console.error('Wishlist fetch error:', error);
        const emptyItems = [];
        setItems(emptyItems);
        return {
          items: emptyItems,
          count: 0,
          success: false,
          error: error.message || 'Failed to fetch wishlist',
        };
      } finally {
        setLoading(false);
      }
    },
    enabled: isAuthenticated && (options.enabled !== false),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Prevent excessive refetches for wishlist
    refetchOnReconnect: true,
    // Keep previous data while refetching
    placeholderData: (previousData) => previousData,
  });
};

/**
 * useAddToWishlist Mutation Hook
 * 
 * Adds a course to the wishlist with optimistic updates.
 * 
 * @returns {Object} Add to wishlist mutation
 */
export const useAddToWishlist = () => {
  const queryClient = useQueryClient();
  const { addItem, removeItem, isInWishlist } = useWishlistStore();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (course) => {
      const courseId = course.id || course.courseId;
      
      const response = await apiClient.post(getEndpoint('wishlist.add'), {
        courseId,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to add to wishlist');
      }

      return { course, ...response };
    },
    // Optimistic update
    onMutate: async (course) => {
      const courseId = course.id || course.courseId;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['wishlist'] });

      // Snapshot previous value
      const previousWishlist = queryClient.getQueryData(['wishlist']);

      // Optimistically update Zustand store
      const wasAdded = addItem(course);

      // Optimistically update React Query cache
      queryClient.setQueryData(['wishlist'], (old) => {
        if (!old) return { items: [course], count: 1 };
        if (old.items?.some((item) => (item.id || item.courseId) === courseId)) {
          return old; // Already exists
        }
        return {
          ...old,
          items: [...(old.items || []), { ...course, addedAt: new Date() }],
          count: (old.count || 0) + 1,
        };
      });

      // Return context for rollback
      return { previousWishlist, courseId, wasAdded };
    },
    // On error, rollback
    onError: (error, course, context) => {
      // Rollback Zustand store
      if (context?.wasAdded) {
        removeItem(context.courseId);
      }

      // Rollback React Query cache
      if (context?.previousWishlist) {
        queryClient.setQueryData(['wishlist'], context.previousWishlist);
      }

      // Handle specific error cases
      const errorMessage = error?.message || error?.error || 'Failed to add to wishlist';
      
      // Check if user is not authenticated
      if (error?.status === 401 || errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
        createAlert('error', 'Please login to add courses to your wishlist.');
      } else {
        createAlert('error', errorMessage);
      }
    },
    // On success
    onSuccess: (data, course) => {
      // Invalidate and refetch wishlist
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      
      // Show success message
      createAlert('success', 'Success! Added to wishlist.');
    },
    // On settle (always runs)
    onSettled: () => {
      // Ensure wishlist is in sync
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
};

/**
 * useRemoveFromWishlist Mutation Hook
 * 
 * Removes a course from the wishlist with optimistic updates.
 * 
 * @returns {Object} Remove from wishlist mutation
 */
export const useRemoveFromWishlist = () => {
  const queryClient = useQueryClient();
  const { removeItem, addItem, isInWishlist } = useWishlistStore();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async (courseId) => {
      const response = await apiClient.delete(
        buildEndpoint(getEndpoint('wishlist.remove'), { courseId })
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to remove from wishlist');
      }

      return { courseId, ...response };
    },
    // Optimistic update
    onMutate: async (courseId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['wishlist'] });

      // Snapshot previous value
      const previousWishlist = queryClient.getQueryData(['wishlist']);

      // Get item being removed for potential rollback
      const itemToRemove = previousWishlist?.items?.find(
        (item) => (item.id || item.courseId) === courseId
      );

      // Optimistically update Zustand store
      const wasRemoved = removeItem(courseId);

      // Optimistically update React Query cache
      queryClient.setQueryData(['wishlist'], (old) => {
        if (!old) return { items: [], count: 0 };
        return {
          ...old,
          items: (old.items || []).filter(
            (item) => (item.id || item.courseId) !== courseId
          ),
          count: Math.max(0, (old.count || 0) - 1),
        };
      });

      // Return context for rollback
      return { previousWishlist, courseId, itemToRemove, wasRemoved };
    },
    // On error, rollback
    onError: (error, courseId, context) => {
      // Rollback Zustand store
      if (context?.wasRemoved && context?.itemToRemove) {
        addItem(context.itemToRemove);
      }

      // Rollback React Query cache
      if (context?.previousWishlist) {
        queryClient.setQueryData(['wishlist'], context.previousWishlist);
      }

      // Handle specific error cases
      const errorMessage = error?.message || error?.error || 'Failed to remove from wishlist';
      
      // Check if user is not authenticated
      if (error?.status === 401 || errorMessage.includes('authentication') || errorMessage.includes('unauthorized')) {
        createAlert('error', 'Please login to manage your wishlist.');
      } else {
        createAlert('error', errorMessage);
      }
    },
    // On success
    onSuccess: (data, courseId) => {
      // Invalidate and refetch wishlist
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      
      // Show success message
      createAlert('success', 'Success! Removed from wishlist.');
    },
    // On settle (always runs)
    onSettled: () => {
      // Ensure wishlist is in sync
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
};

/**
 * useToggleWishlist Mutation Hook
 * 
 * Toggles a course in the wishlist (add if not present, remove if present).
 * 
 * @returns {Object} Toggle wishlist mutation
 */
export const useToggleWishlist = () => {
  const queryClient = useQueryClient();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const addMutation = useAddToWishlist();
  const removeMutation = useRemoveFromWishlist();

  return {
    mutate: (course) => {
      const courseId = course.id || course.courseId;
      const inWishlist = isInWishlist(courseId);

      if (inWishlist) {
        removeMutation.mutate(courseId);
      } else {
        addMutation.mutate(course);
      }
    },
    isPending: addMutation.isPending || removeMutation.isPending,
    isError: addMutation.isError || removeMutation.isError,
    error: addMutation.error || removeMutation.error,
  };
};

/**
 * useClearWishlist Mutation Hook
 * 
 * Clears all items from the wishlist.
 * 
 * @returns {Object} Clear wishlist mutation
 */
export const useClearWishlist = () => {
  const queryClient = useQueryClient();
  const { clearWishlist } = useWishlistStore();
  const createAlert = useSweetAlert();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(getEndpoint('wishlist.clear'));

      if (!response.success) {
        throw new Error(response.error || 'Failed to clear wishlist');
      }

      return response;
    },
    // Optimistic update
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['wishlist'] });

      // Snapshot previous value
      const previousWishlist = queryClient.getQueryData(['wishlist']);

      // Optimistically update Zustand store
      clearWishlist();

      // Optimistically update React Query cache
      queryClient.setQueryData(['wishlist'], { items: [], count: 0 });

      // Return context for rollback
      return { previousWishlist };
    },
    // On error, rollback
    onError: (error, variables, context) => {
      // Rollback React Query cache
      if (context?.previousWishlist) {
        queryClient.setQueryData(['wishlist'], context.previousWishlist);
        // Also restore Zustand store
        useWishlistStore.getState().setItems(context.previousWishlist.items || []);
      }

      // Show error message
      createAlert('error', error.message || 'Failed to clear wishlist');
    },
    // On success
    onSuccess: () => {
      // Invalidate and refetch wishlist
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      
      // Show success message
      createAlert('success', 'Success! Wishlist cleared.');
    },
  });
};

/**
 * useCheckWishlist Query Hook
 * 
 * Checks if a course is in the wishlist.
 * 
 * @param {string} courseId - Course ID to check
 * @param {Object} options - Query options
 * @returns {Object} Wishlist check query
 */
export const useCheckWishlist = (courseId, options = {}) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { isInWishlist } = useWishlistStore();

  return useQuery({
    queryKey: ['wishlist', 'check', courseId],
    queryFn: async () => {
      const response = await apiClient.get(
        buildEndpoint(getEndpoint('wishlist.check'), { courseId })
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to check wishlist');
      }

      return {
        inWishlist: response.inWishlist || false,
        ...response,
      };
    },
    enabled: isAuthenticated && !!courseId && (options.enabled !== false),
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Use Zustand store for instant check
    initialData: () => ({
      inWishlist: isInWishlist(courseId),
    }),
  });
};

export default useWishlist;

