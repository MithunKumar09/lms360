"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import { useRouter } from "next/navigation";

/**
 * Parent Activity Summary Card Component
 * 
 * Displays a summary card of student activity and engagement.
 * Clickable to navigate to full activity tracker page.
 */
const ParentActivitySummaryCard = ({ studentId }) => {
  const router = useRouter();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['parentActivitySummary', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      
      const response = await apiClient.get(`/parent/students/${studentId}/activity?timeRange=week`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch activity');
      }
      
      return response;
    },
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (!studentId) {
    return (
      <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-borderColor dark:border-borderColor-dark">
        <div className="text-center py-8">
          <p className="text-contentColor dark:text-contentColor-dark text-sm">
            Select a child to view activity summary
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-borderColor dark:border-borderColor-dark">
        <SkeletonLoader count={3} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-borderColor dark:border-borderColor-dark">
        <div className="text-center py-8">
          <p className="text-red-500 dark:text-red-400 text-sm">
            {error?.message || 'Failed to load activity'}
          </p>
        </div>
      </div>
    );
  }

  const handleClick = () => {
    router.push(`/dashboards/parent-activity-tracker?studentId=${studentId}`);
  };

  const engagement = data.engagement || {};
  const dailyLog = data.activity?.dailyLog || [];

  return (
    <div 
      onClick={handleClick}
      className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-green-200 dark:border-green-800 cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
          Activity & Engagement
        </h3>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green-600 dark:text-green-400"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-contentColor dark:text-contentColor-dark">
            Active Days (Week)
          </span>
          <span className="text-lg font-bold text-blackColor dark:text-blackColor-dark">
            {engagement.activeDays || 0} / 7
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-contentColor dark:text-contentColor-dark">
            Current Streak
          </span>
          <span className="text-lg font-bold text-blackColor dark:text-blackColor-dark">
            {engagement.currentStreak || 0} days
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-contentColor dark:text-contentColor-dark">
            Time Spent
          </span>
          <span className="text-lg font-bold text-blackColor dark:text-blackColor-dark">
            {engagement.totalTimeSpent ? `${Math.round(engagement.totalTimeSpent / 60)}h` : '0h'}
          </span>
        </div>

        <div className="pt-2 text-xs text-contentColor dark:text-contentColor-dark">
          Click to view detailed activity →
        </div>
      </div>
    </div>
  );
};

export default ParentActivitySummaryCard;
