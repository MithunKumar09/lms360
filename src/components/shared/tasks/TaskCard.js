"use client";

import React from "react";
import { format } from "date-fns";

/**
 * TaskCard Component
 * 
 * Displays an individual task card with status, priority, due date, and actions.
 * 
 * @param {Object} props
 * @param {Object} props.task - Task object
 * @param {Function} props.onClick - Click handler to view task details
 * @param {Function} props.onEdit - Edit handler (mentor only)
 * @param {Function} props.onDelete - Delete handler (mentor only)
 * @param {string} props.userRole - Current user role ('mentor' | 'student')
 */
export default function TaskCard({ task, onClick, onEdit, onDelete, userRole = 'student' }) {
  const isMentor = userRole === 'mentor';

  // Priority colors
  const priorityColors = {
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  // Status colors
  const statusColors = {
    pending: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };

  // Check if task is overdue
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed' && task.status !== 'cancelled';

  // Format due date
  const formatDueDate = (dateString) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (e) {
      return null;
    }
  };

  // Get assignee info based on role
  const assignee = isMentor ? task.student : task.mentor;
  const assigneeName = assignee 
    ? `${assignee.firstName || assignee.first_name || ''} ${assignee.lastName || assignee.last_name || ''}`.trim() || assignee.email
    : 'N/A';

  return (
    <div
      className="bg-whiteColor dark:bg-whiteColor-dark border-2 border-borderColor dark:border-borderColor-dark rounded-md p-4 hover:shadow-lg transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-1 line-clamp-2">
            {task.title}
          </h3>
          {assignee && (
            <p className="text-sm text-contentColor dark:text-contentColor-dark">
              {isMentor ? 'Assigned to' : 'From'}: <span className="font-medium">{assigneeName}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          {/* Priority Badge */}
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${priorityColors[task.priority] || priorityColors.medium}`}
          >
            {task.priority}
          </span>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-contentColor dark:text-contentColor-dark mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-borderColor dark:border-borderColor-dark">
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[task.status] || statusColors.pending}`}
          >
            {task.status.replace('_', ' ')}
          </span>

          {/* Due Date */}
          {task.dueDate && (
            <span className={`text-xs ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-contentColor dark:text-contentColor-dark'}`}>
              Due: {formatDueDate(task.dueDate)}
              {isOverdue && ' (Overdue)'}
            </span>
          )}
        </div>

        {/* Actions (Mentor only) */}
        {isMentor && (onEdit || onDelete) && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                className="p-1 text-primaryColor hover:bg-primaryColor/10 rounded transition-colors"
                aria-label="Edit task"
              >
                <i className="icofont-edit text-sm"></i>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task);
                }}
                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                aria-label="Delete task"
              >
                <i className="icofont-trash text-sm"></i>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
