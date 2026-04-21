"use client";

import React, { useState, useEffect } from "react";

/**
 * TaskForm Component
 * 
 * Reusable form for creating/editing tasks.
 * 
 * @param {Object} props
 * @param {Object} props.task - Existing task data (for edit mode)
 * @param {Array} props.students - List of students to assign task to
 * @param {Object} props.cohortId - Default cohort ID
 * @param {Function} props.onSubmit - Form submit handler
 * @param {Function} props.onCancel - Cancel handler
 * @param {boolean} props.isLoading - Loading state
 */
export default function TaskForm({
  task = null,
  students = [],
  cohortId = null,
  onSubmit,
  onCancel,
  isLoading = false,
}) {
  const isEditMode = !!task;

  const [formData, setFormData] = useState({
    student_id: task?.studentId || students[0]?.id || '',
    cohort_id: cohortId || task?.cohortId || '',
    title: task?.title || '',
    description: task?.description || '',
    task_type: task?.taskType || 'general',
    priority: task?.priority || 'medium',
    due_date: task?.dueDate 
      ? new Date(task.dueDate).toISOString().slice(0, 16)
      : '',
  });

  const [errors, setErrors] = useState({});

  // Update form data when task changes
  useEffect(() => {
    if (task) {
      setFormData({
        student_id: task.studentId || '',
        cohort_id: task.cohortId || '',
        title: task.title || '',
        description: task.description || '',
        task_type: task.taskType || 'general',
        priority: task.priority || 'medium',
        due_date: task.dueDate 
          ? new Date(task.dueDate).toISOString().slice(0, 16)
          : '',
      });
    }
  }, [task]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title || formData.title.trim().length === 0) {
      newErrors.title = 'Title is required';
    }

    if (!formData.student_id) {
      newErrors.student_id = 'Please select a student';
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Convert due_date to ISO string if provided
    // Clean up cohort_id - convert empty string to null
    const submitData = {
      ...formData,
      cohort_id: formData.cohort_id && formData.cohort_id.trim() !== '' ? formData.cohort_id : null,
      due_date: formData.due_date 
        ? new Date(formData.due_date).toISOString()
        : null,
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Student Selection */}
      <div>
        <label
          htmlFor="task-student"
          className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2"
        >
          Assign to Student <span className="text-red-500">*</span>
        </label>
        <select
          id="task-student"
          name="student_id"
          value={formData.student_id}
          onChange={handleChange}
          disabled={isEditMode || isLoading}
          className={`w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor ${
            errors.student_id ? 'border-red-500' : ''
          } ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="">Select a student</option>
          {students.map((student) => {
            // Handle both API formats: {firstName, lastName} or {first_name, last_name}
            const firstName = student.firstName || student.first_name || '';
            const lastName = student.lastName || student.last_name || '';
            const email = student.email || '';
            const displayName = `${firstName} ${lastName}`.trim() || email;
            const studentId = student.id || student.student_id;
            
            return (
              <option key={studentId} value={studentId}>
                {displayName}
              </option>
            );
          })}
        </select>
        {errors.student_id && (
          <p className="text-xs text-red-500 mt-1">{errors.student_id}</p>
        )}
      </div>

      {/* Title */}
      <div>
        <label
          htmlFor="task-title"
          className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2"
        >
          Task Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="task-title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          disabled={isLoading}
          placeholder="Enter task title"
          className={`w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor ${
            errors.title ? 'border-red-500' : ''
          }`}
        />
        {errors.title && (
          <p className="text-xs text-red-500 mt-1">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="task-description"
          className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2"
        >
          Description
        </label>
        <textarea
          id="task-description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          disabled={isLoading}
          rows={4}
          placeholder="Enter task description (optional)"
          className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor resize-none"
        />
      </div>

      {/* Task Type and Priority Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Task Type */}
        <div>
          <label
            htmlFor="task-type"
            className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2"
          >
            Task Type
          </label>
          <select
            id="task-type"
            name="task_type"
            value={formData.task_type}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
          >
            <option value="general">General</option>
            <option value="assignment">Assignment</option>
            <option value="project">Project</option>
            <option value="review">Review</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label
            htmlFor="task-priority"
            className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2"
          >
            Priority
          </label>
          <select
            id="task-priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Due Date */}
      <div>
        <label
          htmlFor="task-due-date"
          className="block text-sm font-medium text-blackColor dark:text-blackColor-dark mb-2"
        >
          Due Date
        </label>
        <input
          type="datetime-local"
          id="task-due-date"
          name="due_date"
          value={formData.due_date}
          onChange={handleChange}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-borderColor dark:border-borderColor-dark rounded-md bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
        />
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-borderColor dark:border-borderColor-dark">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 text-sm font-medium text-whiteColor bg-primaryColor rounded-md hover:bg-opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : isEditMode ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}
