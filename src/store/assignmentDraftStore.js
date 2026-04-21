/**
 * Assignment Draft Store
 * 
 * Manages assignment draft data with IndexedDB persistence for large files.
 * Stores File objects in IndexedDB instead of base64 to avoid localStorage quota issues.
 */

import { create } from 'zustand';
import { get, set, del, keys } from 'idb-keyval';

// Helper to store File objects in IndexedDB
const storeFile = async (key, file) => {
  if (!file || !(file instanceof File)) return;
  await set(`assignment-draft-file-${key}`, file);
};

// Helper to retrieve File objects from IndexedDB
const getFile = async (key) => {
  try {
    return await get(`assignment-draft-file-${key}`);
  } catch (e) {
    console.error('[AssignmentDraftStore] Error getting file:', e);
    return null;
  }
};

// Helper to delete File objects from IndexedDB
const deleteFile = async (key) => {
  try {
    await del(`assignment-draft-file-${key}`);
  } catch (e) {
    console.error('[AssignmentDraftStore] Error deleting file:', e);
  }
};

const useAssignmentDraftStore = create((set, get) => ({
  // State
  drafts: {}, // { [assignmentId]: { sliders: [...], timestamp: number } }

  // Actions

  /**
   * Load draft from IndexedDB
   * @param {string} assignmentId - Assignment ID
   * @returns {Promise<Object|null>} Draft data with File objects restored
   */
  loadDraft: async (assignmentId) => {
    try {
      const draftData = await get(`assignment-draft-${assignmentId}`);
      if (!draftData) return null;

      // Check if draft is expired (24 hours)
      const now = new Date().getTime();
      if (draftData.timestamp && now - draftData.timestamp > 24 * 60 * 60 * 1000) {
        // Draft expired, delete it
        await get().deleteDraft(assignmentId);
        return null;
      }

      // Restore File objects from IndexedDB
      // Priority: R2 public URL (HTTPS) > File object (create blob URL) > stored fileUrl
      const restoredSliders = await Promise.all(
        (draftData.sliders || []).map(async (slider) => {
          // If we have an R2 URL (HTTPS), use it directly (CSP-compatible, like create-course)
          if (slider.fileUrl && slider.fileUrl.startsWith('https://')) {
            // R2 URL exists - use it, but also restore File object if available for submission
            if (slider.fileKey) {
              const file = await getFile(slider.fileKey);
              return {
                ...slider,
                file: file || null,
                fileUrl: slider.fileUrl, // Keep R2 URL (CSP-compatible)
              };
            }
            return {
              ...slider,
              file: null,
              fileUrl: slider.fileUrl, // Keep R2 URL
            };
          }
          
          // No R2 URL - try to restore File object for submission
          // But don't create blob URL - only use R2 URLs for preview
          if (slider.fileKey) {
            const file = await getFile(slider.fileKey);
            if (file) {
              return {
                ...slider,
                file,
                fileUrl: slider.fileUrl || '', // Keep R2 URL if available, otherwise empty
              };
            }
          }
          
          // If no file or file not found, return slider with stored R2 URL
          return {
            ...slider,
            file: null,
            fileUrl: (slider.fileUrl && slider.fileUrl.startsWith('https://')) ? slider.fileUrl : '', // Only R2 HTTPS URLs
          };
        })
      );

      return {
        ...draftData,
        sliders: restoredSliders,
      };
    } catch (error) {
      console.error('[AssignmentDraftStore] Error loading draft:', error);
      return null;
    }
  },

  /**
   * Save draft to IndexedDB
   * @param {string} assignmentId - Assignment ID
   * @param {Array} sliders - Slider data with File objects
   */
  saveDraft: async (assignmentId, sliders) => {
    try {
      // Prepare sliders for storage (extract File objects)
      const slidersForStorage = await Promise.all(
        sliders.map(async (slider) => {
          const storageItem = {
            id: slider.id,
            title: slider.title || '',
            fileType: slider.fileType || 'docx',
            description: slider.description || '',
            fileUrl: '', // Will be recreated from File object on load
            fileName: slider.file?.name || '',
            fileSize: slider.file?.size || 0,
            fileKey: null, // Key for IndexedDB file storage
          };

          // Store File object in IndexedDB if present (for final submission)
          // But prioritize storing R2 public URL (HTTPS) for previews (CSP-compatible)
          if (slider.file && slider.file instanceof File) {
            const fileKey = `${assignmentId}-${slider.id}`;
            await storeFile(fileKey, slider.file);
            storageItem.fileKey = fileKey;
          }
          
          // If we have an R2 URL (HTTPS), store it (CSP-compatible, like create-course)
          // This takes priority over blob URLs
          if (slider.fileUrl && slider.fileUrl.startsWith('https://')) {
            storageItem.fileUrl = slider.fileUrl; // Store R2 public URL
          }

          return storageItem;
        })
      );

      const draftData = {
        sliders: slidersForStorage,
        timestamp: new Date().getTime(),
      };

      // Save to IndexedDB
      await set(`assignment-draft-${assignmentId}`, draftData);

      // Update in-memory state
      set((state) => ({
        drafts: {
          ...state.drafts,
          [assignmentId]: draftData,
        },
      }));
    } catch (error) {
      console.error('[AssignmentDraftStore] Error saving draft:', error);
      throw error;
    }
  },

  /**
   * Delete draft and associated files
   * @param {string} assignmentId - Assignment ID
   */
  deleteDraft: async (assignmentId) => {
    try {
      // Get draft to find file keys
      const draftData = await get(`assignment-draft-${assignmentId}`);
      if (draftData && draftData.sliders) {
        // Delete all associated files
        await Promise.all(
          draftData.sliders.map((slider) => {
            if (slider.fileKey) {
              return deleteFile(slider.fileKey);
            }
          })
        );
      }

      // Delete draft data
      await del(`assignment-draft-${assignmentId}`);

      // Update in-memory state
      set((state) => {
        const newDrafts = { ...state.drafts };
        delete newDrafts[assignmentId];
        return { drafts: newDrafts };
      });
    } catch (error) {
      console.error('[AssignmentDraftStore] Error deleting draft:', error);
    }
  },

  /**
   * Clear all expired drafts
   */
  clearExpiredDrafts: async () => {
    try {
      const allKeys = await keys();
      const draftKeys = allKeys.filter((key) =>
        typeof key === 'string' && key.startsWith('assignment-draft-')
      );

      const now = new Date().getTime();
      const expiredKeys = [];

      for (const key of draftKeys) {
        try {
          const draftData = await get(key);
          if (
            draftData &&
            draftData.timestamp &&
            now - draftData.timestamp > 24 * 60 * 60 * 1000
          ) {
            expiredKeys.push(key);
          }
        } catch (e) {
          // If we can't read it, consider it expired
          expiredKeys.push(key);
        }
      }

      // Delete expired drafts
      for (const key of expiredKeys) {
        const assignmentId = key.replace('assignment-draft-', '');
        await get().deleteDraft(assignmentId);
      }

      return expiredKeys.length;
    } catch (error) {
      console.error('[AssignmentDraftStore] Error clearing expired drafts:', error);
      return 0;
    }
  },
}));

export default useAssignmentDraftStore;

