"use client";

import React from "react";

/**
 * ActivityFilter Component
 * 
 * Filter controls for activity feed.
 * 
 * @param {Object} props
 * @param {string} props.activityTypeFilter - Current activity type filter
 * @param {Function} props.onActivityTypeChange - Handler for activity type filter change
 * @param {string} props.userRole - Current user role ('mentor' | 'student')
 */
export default function ActivityFilter({
  activityTypeFilter,
  onActivityTypeChange,
  userRole = 'student',
}) {
  const activityTypes = [
    { value: 'all', label: 'All Activities' },
    { value: 'task_created', label: 'Tasks Created' },
    { value: 'task_in_progress', label: 'Tasks Started' },
    { value: 'task_completed', label: 'Tasks Completed' },
    { value: 'task_updated', label: 'Tasks Updated' },
    { value: 'task_cancelled', label: 'Tasks Cancelled' },
    // Future activity types (commented out until implemented)
    // { value: 'session_scheduled', label: 'Sessions' },
    // { value: 'material_shared', label: 'Materials' },
    // { value: 'note_added', label: 'Notes' },
    // { value: 'feedback_submitted', label: 'Feedback' },
  ];

  return (
    <div className="mb-4 flex items-center gap-2 flex-wrap">
      <label className="text-sm font-medium text-blackColor dark:text-blackColor-dark">
        Filter by type:
      </label>
      <select
        value={activityTypeFilter}
        onChange={(e) => onActivityTypeChange(e.target.value)}
        className="px-3 py-1 border border-borderColor dark:border-borderColor-dark rounded-md bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark text-sm focus:outline-none focus:ring-2 focus:ring-primaryColor"
      >
        {activityTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      {activityTypeFilter !== 'all' && (
        <button
          onClick={() => onActivityTypeChange('all')}
          className="px-3 py-1 text-xs font-medium text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}
