"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";
import { useRouter } from "next/navigation";

/**
 * Parent Progress Summary Card Component
 * 
 * Displays a summary card of student progress with key metrics.
 * Clickable to navigate to full progress page.
 */
const ParentProgressSummaryCard = ({ studentId }) => {
  const router = useRouter();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['parentProgressSummary', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      
      const response = await apiClient.get(`/parent/students/${studentId}/progress`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch progress');
      }
      
      return response.progress;
    },
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (!studentId) {
    return (
      <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-borderColor dark:border-borderColor-dark">
        <div className="text-center py-8">
          <p className="text-contentColor dark:text-contentColor-dark text-sm">
            Select a child to view progress summary
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
            {error?.message || 'Failed to load progress'}
          </p>
        </div>
      </div>
    );
  }

  const handleClick = () => {
    router.push(`/dashboards/parent-student-progress?studentId=${studentId}`);
  };

  return (
    <div 
      onClick={handleClick}
      className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
          Progress Overview
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
          className="text-blue-600 dark:text-blue-400"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-contentColor dark:text-contentColor-dark">
            Courses Enrolled
          </span>
          <span className="text-lg font-bold text-blackColor dark:text-blackColor-dark">
            {data.totalEnrollments || 0}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-contentColor dark:text-contentColor-dark">
            Average Completion
          </span>
          <span className="text-lg font-bold text-blackColor dark:text-blackColor-dark">
            {Math.round(data.averageCompletion || 0)}%
          </span>
        </div>

        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-4">
          <div
            className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(data.averageCompletion || 0, 100)}%` }}
          />
        </div>

        <div className="pt-2 text-xs text-contentColor dark:text-contentColor-dark">
          Click to view detailed progress →
        </div>
      </div>
    </div>
  );
};

export default ParentProgressSummaryCard;
