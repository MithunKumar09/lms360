"use client";

"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client.js";
import SkeletonLoader from "@/components/shared/loading/SkeletonLoader";

/**
 * Parent Child Info Card Component
 * 
 * Displays selected child's basic information and quick stats.
 * Used in the main parent dashboard.
 */
const ParentChildInfoCard = ({ studentId }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['parentChildInfo', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      
      // Fetch student details
      const studentsResponse = await apiClient.get('/parent/students');
      if (!studentsResponse.success) {
        throw new Error(studentsResponse.error || 'Failed to fetch student info');
      }
      
      // API returns { success: true, students: [...] }
      const student = studentsResponse.students?.find(s => s.id === studentId);
      if (!student) {
        throw new Error('Student not found in linked children');
      }
      
      // Fetch quick stats (handle errors gracefully - don't fail the whole request if these fail)
      let progress = null;
      let activity = null;
      
      try {
        const progressResponse = await apiClient.get(`/parent/students/${studentId}/progress`);
        if (progressResponse.success) {
          progress = progressResponse.progress || null;
        }
      } catch (progressError) {
        console.warn('Failed to fetch progress:', progressError);
        // Continue without progress data
      }
      
      try {
        const activityResponse = await apiClient.get(`/parent/students/${studentId}/activity?timeRange=week`);
        if (activityResponse.success) {
          activity = activityResponse || null;
        }
      } catch (activityError) {
        console.warn('Failed to fetch activity:', activityError);
        // Continue without activity data
      }
      
      return {
        student,
        progress,
        activity,
      };
    },
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  if (!studentId) {
    return (
      <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-borderColor dark:border-borderColor-dark">
        <div className="text-center py-8">
          <p className="text-contentColor dark:text-contentColor-dark">
            Select a child to view their information
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-borderColor dark:border-borderColor-dark">
        <SkeletonLoader count={4} />
      </div>
    );
  }

  if (error || !data?.student) {
    return (
      <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-borderColor dark:border-borderColor-dark">
        <div className="text-center py-8">
          <p className="text-red-500 dark:text-red-400">
            {error?.message || 'Failed to load child information'}
          </p>
        </div>
      </div>
    );
  }

  const { student, progress, activity } = data;
  const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email;

  return (
    <div className="p-6 bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow-accordion dark:shadow-accordion-dark border-2 border-borderColor dark:border-borderColor-dark">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-4">
        <div className="flex-shrink-0">
          {student.avatarUrl ? (
            <img
              src={student.avatarUrl}
              alt={studentName}
              className="w-20 h-20 rounded-full object-cover border-2 border-borderColor dark:border-borderColor-dark"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
              {studentName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-blackColor dark:text-blackColor-dark mb-1 truncate">
            {studentName}
          </h3>
          <p className="text-sm text-contentColor dark:text-contentColor-dark truncate">
            {student.email}
          </p>
          {student.relationshipType && (
            <span className="inline-block mt-2 px-3 py-1 text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
              {student.relationshipType}
            </span>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-borderColor dark:border-borderColor-dark">
        <div className="text-center">
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {progress?.totalEnrollments || 0}
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
            Courses
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {progress ? `${Math.round(progress.averageCompletion || 0)}%` : 'N/A'}
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
            Progress
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {activity?.engagement?.activeDays || 0}
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
            Active Days
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {activity?.engagement?.currentStreak || 0}
          </p>
          <p className="text-xs text-contentColor dark:text-contentColor-dark mt-1">
            Day Streak
          </p>
        </div>
      </div>
    </div>
  );
};

export default ParentChildInfoCard;
