//src/components/shared/roadmap/MilestoneCelebrationManager.js
"use client";

import { useEffect } from "react";
import { useMilestoneCelebration } from "@/hooks/useMilestoneCelebration";
import MilestoneAnimationToast from "./MilestoneAnimationToast";

/**
 * MilestoneCelebrationManager Component
 * 
 * Manages and displays milestone celebration animations
 * Handles multiple celebrations in sequence
 */
const MilestoneCelebrationManager = () => {
  const { activeCelebration, dismissCelebration } = useMilestoneCelebration();

  // Auto-dismiss after animation completes
  useEffect(() => {
    if (activeCelebration) {
      // Animation typically takes 3-5 seconds
      // Toast stays visible for additional 2 seconds
      const timer = setTimeout(() => {
        dismissCelebration();
      }, 7000); // Total 7 seconds

      return () => clearTimeout(timer);
    }
  }, [activeCelebration, dismissCelebration]);

  if (!activeCelebration) {
    return null;
  }

  return (
    <MilestoneAnimationToast
      stampType={activeCelebration.stampType}
      milestoneNumber={activeCelebration.milestoneNumber}
      courseId={activeCelebration.courseId}
      onClose={dismissCelebration}
    />
  );
};

export default MilestoneCelebrationManager;
