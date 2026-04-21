//src/hooks/useMilestoneCelebration.js
/**
 * Milestone Celebration Hook
 * 
 * Manages milestone celebration animations and UI updates
 */

import { useState, useCallback } from 'react';

export function useMilestoneCelebration() {
  const [activeCelebration, setActiveCelebration] = useState(null);

  /**
   * Trigger celebration for a completed milestone
   */
  const triggerCelebration = useCallback((celebrationData) => {
    const { courseId, milestoneNumber, stampType } = celebrationData;
    
    setActiveCelebration({
      id: `${courseId}-${milestoneNumber}-${Date.now()}`,
      courseId,
      milestoneNumber,
      stampType,
      timestamp: Date.now(),
    });
  }, []);

  /**
   * Dismiss celebration
   */
  const dismissCelebration = useCallback(() => {
    setActiveCelebration(null);
  }, []);

  return {
    activeCelebration,
    triggerCelebration,
    dismissCelebration,
  };
}
