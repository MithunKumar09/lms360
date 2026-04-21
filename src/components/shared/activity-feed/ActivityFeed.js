"use client";

import React, { useState } from "react";
import { useActivityFeed } from "@/hooks/api/useActivityFeed";
import ActivityItem from "./ActivityItem";
import ActivityFilter from "./ActivityFilter";
import { useAuthStore } from "@/store/index.js";

/**
 * ActivityFeed Component
 * 
 * Displays activity feed with filtering and polling support.
 * 
 * @param {Object} props
 * @param {string} props.userRole - User role ('mentor' | 'student')
 * @param {Object} props.filters - Initial filters (cohort_id, student_id, mentor_id)
 * @param {Function} props.onActivityClick - Handler when activity is clicked (optional)
 * @param {number} props.pollInterval - Polling interval in milliseconds (default: 30000, 0 to disable)
 */
export default function ActivityFeed({
  userRole = 'student',
  filters = {},
  onActivityClick,
  pollInterval = 30000,
}) {
  const user = useAuthStore((state) => state.user);
  const actualRole = userRole || user?.role;
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');

  // Build query filters - only include activity_type if filter is not 'all'
  const queryFilters = {
    ...filters,
    page: 1,
    limit: 50,
  };
  
  // Only add activity_type filter if it's not 'all'
  if (activityTypeFilter !== 'all') {
    queryFilters.activity_type = activityTypeFilter;
  }

  const { data, isLoading, error } = useActivityFeed({
    userRole: actualRole,
    filters: queryFilters,
    pollInterval,
  });

  const activities = data?.activities || [];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-contentColor dark:text-contentColor-dark">Loading activity feed...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error loading activity feed: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Filter */}
      <ActivityFilter
        activityTypeFilter={activityTypeFilter}
        onActivityTypeChange={setActivityTypeFilter}
        userRole={actualRole}
      />

      {/* Activities List */}
      {activities.length === 0 ? (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            No activities found.
          </p>
        </div>
      ) : (
        <div className="space-y-2 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark p-4 max-h-[600px] overflow-y-auto">
          {activities.map((activity) => (
            <ActivityItem
              key={activity.id}
              activity={activity}
              userRole={actualRole}
              onClick={onActivityClick ? () => onActivityClick(activity) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
