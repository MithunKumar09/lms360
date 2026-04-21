"use client";

import React, { useState } from "react";
import TaskCard from "./TaskCard";
import { useMentorTasks } from "@/hooks/api/useMentorTasks";
import { useStudentTasks } from "@/hooks/api/useStudentTasks";

/**
 * TaskList Component
 * 
 * Displays a list of tasks with filtering options.
 * 
 * @param {Object} props
 * @param {string} props.userRole - User role ('mentor' | 'student')
 * @param {Object} props.filters - Initial filters (cohort_id, student_id, mentor_id, status)
 * @param {Function} props.onTaskClick - Handler when task is clicked
 * @param {Function} props.onTaskEdit - Handler when task is edited (mentor only)
 * @param {Function} props.onTaskDelete - Handler when task is deleted (mentor only)
 */
export default function TaskList({
  userRole = 'student',
  filters = {},
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
}) {
  const [statusFilter, setStatusFilter] = useState(filters.status || 'all');

  const isMentor = userRole === 'mentor';

  // Build filters object - exclude status when 'all' is selected
  const buildFilters = () => {
    const baseFilters = {
      ...filters,
      page: 1,
      limit: 50,
    };
    // Only include status filter if it's not 'all'
    if (statusFilter !== 'all') {
      baseFilters.status = statusFilter;
    }
    return baseFilters;
  };

  // Use appropriate hook based on role
  const mentorTasksQuery = useMentorTasks({
    filters: buildFilters(),
    enabled: isMentor,
  });

  const studentTasksQuery = useStudentTasks({
    filters: buildFilters(),
    enabled: !isMentor,
  });

  const { data, isLoading, error } = isMentor ? mentorTasksQuery : studentTasksQuery;
  const tasks = data?.tasks || [];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-contentColor dark:text-contentColor-dark">Loading tasks...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error loading tasks: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Filter */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <label className="text-sm font-medium text-blackColor dark:text-blackColor-dark">
          Filter by status:
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1 border border-borderColor dark:border-borderColor-dark rounded-md bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark text-sm focus:outline-none focus:ring-2 focus:ring-primaryColor"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Tasks Grid */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-whiteColor dark:bg-whiteColor-dark rounded-md border-2 border-borderColor dark:border-borderColor-dark">
          <p className="text-contentColor dark:text-contentColor-dark">
            No tasks found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              userRole={userRole}
              onClick={() => onTaskClick?.(task)}
              onEdit={isMentor ? onTaskEdit : undefined}
              onDelete={isMentor ? onTaskDelete : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
