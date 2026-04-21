/**
 * Auto-Save Hook
 * 
 * Automatically saves course draft every 30 seconds when form data changes.
 */

import { useEffect, useRef } from 'react';
import { useCourseStore } from '@/store/index.js';

/**
 * Auto-save hook
 * @param {Object} options - Options
 * @param {number} options.interval - Auto-save interval in milliseconds (default: 30000)
 * @param {boolean} options.enabled - Whether auto-save is enabled (default: true)
 */
export const useAutoSave = (options = {}) => {
  const { interval = 30000, enabled = true } = options;
  const intervalRef = useRef(null);
  const lastSaveRef = useRef(null);

  const { courseData, draftId, isDraft, isPublished, savingDraft, saveDraft, isEditMode } =
    useCourseStore();

  useEffect(() => {
    // Don't auto-save if:
    // - Auto-save is disabled
    // - Course is published
    // - Currently saving
    // - In edit mode (drafts should not be saved when editing existing courses)
    if (!enabled || isPublished || savingDraft || isEditMode) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Only auto-save if there's actual data
    const hasData = 
      courseData.title ||
      courseData.aboutCourse ||
      courseData.modules?.length > 0 ||
      courseData.categoryId ||
      courseData.instructorIds?.length > 0;

    if (!hasData) {
      return;
    }

    // Set up auto-save interval
    intervalRef.current = setInterval(async () => {
      try {
        // Prevent multiple simultaneous saves
        if (savingDraft) {
          return;
        }

        // Save draft
        await saveDraft();
        lastSaveRef.current = new Date();
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Don't clear interval on error, will retry next interval
      }
    }, interval);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    enabled,
    interval,
    courseData,
    isDraft,
    isPublished,
    savingDraft,
    saveDraft,
    isEditMode,
  ]);

  // Return last save time
  return {
    lastSaved: lastSaveRef.current,
  };
};

