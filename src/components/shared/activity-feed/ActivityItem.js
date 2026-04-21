"use client";

import React from "react";
import { format } from "date-fns";

/**
 * ActivityItem Component
 * 
 * Displays a single activity feed item with icon, message, and timestamp.
 * 
 * @param {Object} props
 * @param {Object} props.activity - Activity object
 * @param {string} props.userRole - Current user role ('mentor' | 'student')
 * @param {Function} props.onClick - Click handler (optional)
 */
export default function ActivityItem({ activity, userRole = 'student', onClick }) {
  const isMentor = userRole === 'mentor';

  // Activity type configurations
  const activityConfig = {
    task_created: {
      icon: 'icofont-plus-circle',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      message: (data, isMentor, assignee) => {
        if (isMentor) {
          return `Created task "${data?.task_title || 'Untitled Task'}" for ${assignee || 'student'}`;
        }
        return `Assigned task "${data?.task_title || 'Untitled Task'}"`;
      },
    },
    task_completed: {
      icon: 'icofont-check-circled',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      message: (data, isMentor) => {
        if (isMentor) {
          return `Task "${data?.task_title || 'Untitled Task'}" marked as completed`;
        }
        return `Completed task "${data?.task_title || 'Untitled Task'}"`;
      },
    },
    task_in_progress: {
      icon: 'icofont-clock-time',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      message: (data, isMentor) => {
        if (isMentor) {
          return `Task "${data?.task_title || 'Untitled Task'}" started`;
        }
        return `Started working on task "${data?.task_title || 'Untitled Task'}"`;
      },
    },
    task_updated: {
      icon: 'icofont-edit',
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      message: (data, isMentor) => {
        if (isMentor) {
          return `Updated task "${data?.task_title || 'Untitled Task'}"`;
        }
        return `Task "${data?.task_title || 'Untitled Task'}" was updated`;
      },
    },
    task_cancelled: {
      icon: 'icofont-close-circled',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      message: (data, isMentor) => {
        if (isMentor) {
          return `Cancelled task "${data?.task_title || 'Untitled Task'}"`;
        }
        return `Task "${data?.task_title || 'Untitled Task'}" was cancelled`;
      },
    },
    session_scheduled: {
      icon: 'icofont-calendar',
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      message: (data, isMentor, assignee) => {
        if (isMentor) {
          return `Scheduled session "${data?.session_title || 'Untitled Session'}"${assignee ? ` with ${assignee}` : ''}`;
        }
        return `Session "${data?.session_title || 'Untitled Session'}" scheduled`;
      },
    },
    material_shared: {
      icon: 'icofont-file-alt',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      message: (data, isMentor) => {
        if (isMentor) {
          return `Shared material "${data?.material_title || 'Untitled Material'}"`;
        }
        return `Shared material "${data?.material_title || 'Untitled Material'}"`;
      },
    },
    note_added: {
      icon: 'icofont-note',
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-100 dark:bg-teal-900/30',
      message: (data, isMentor) => {
        if (data?.task_title) {
          return `Added a comment on task "${data.task_title}"`;
        }
        return 'Note added';
      },
    },
    feedback_submitted: {
      icon: 'icofont-star',
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30',
      message: (data, isMentor, assignee) => {
        const rating = data?.rating ? '⭐'.repeat(data.rating) : '';
        if (isMentor) {
          return `Received ${rating} feedback from ${assignee || 'student'}`;
        }
        return `Submitted ${rating} feedback`;
      },
    },
  };

  const config = activityConfig[activity.activityType] || {
    icon: 'icofont-info-circle',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    message: () => 'Activity',
  };

  // Get assignee info
  const assignee = isMentor ? activity.student : activity.mentor;
  const assigneeName = assignee
    ? `${assignee.firstName || assignee.first_name || ''} ${assignee.lastName || assignee.last_name || ''}`.trim() || assignee.email
    : null;

  // Format timestamp
  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);

      // Less than 1 minute
      if (diffInSeconds < 60) {
        return 'Just now';
      }
      // Less than 1 hour
      if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
      }
      // Less than 24 hours
      if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
      }
      // Less than 7 days
      if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
      }
      // Older - show formatted date
      return format(date, 'MMM dd, yyyy h:mm a');
    } catch (e) {
      return '';
    }
  };

  const message = config.message(activity.activityData, isMentor, assigneeName);

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md transition-colors ${
        onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''
      }`}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
        <i className={`${config.icon} ${config.color} text-lg`}></i>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-blackColor dark:text-blackColor-dark">
          {message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-contentColor dark:text-contentColor-dark">
            {formatTimestamp(activity.createdAt)}
          </p>
          {activity.cohort && (
            <>
              <span className="text-xs text-contentColor dark:text-contentColor-dark">•</span>
              <p className="text-xs text-contentColor dark:text-contentColor-dark">
                {activity.cohort.code}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
