"use client";

import { useState, useEffect, useRef } from "react";
import TaskForm from "../tasks/TaskForm";
import { useCreateMentorTask, useUpdateMentorTask } from "@/hooks/api/useMentorTasks";

/**
 * TaskModal Component
 * 
 * Modal for creating/editing tasks (mentor only).
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.task - Existing task (for edit mode)
 * @param {Array} props.students - List of students to assign task to
 * @param {Object} props.cohortId - Default cohort ID
 */
export default function TaskModal({
  isOpen,
  onClose,
  task = null,
  students = [],
  cohortId = null,
}) {
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const createTask = useCreateMentorTask();
  const updateTask = useUpdateMentorTask();
  const isEditMode = !!task;

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  // Handle click outside modal
  const handleBackdropClick = (e) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (isEditMode) {
        await updateTask.mutateAsync({
          taskId: task.id,
          ...formData,
        });
      } else {
        await createTask.mutateAsync(formData);
      }
      onClose();
    } catch (error) {
      // Error handling is done in the mutation hooks
      console.error('Task submission error:', error);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-xxxl flex items-center justify-center p-15px transition-all duration-300"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div
        ref={contentRef}
        className="bg-whiteColor dark:bg-whiteColor-dark rounded-standard p-25px max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-dropdown relative z-small transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-12px right-12px text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark opacity-50 hover:opacity-75 transition-opacity p-5px"
          aria-label="Close task modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            className="w-5 h-5 fill-current"
          >
            <path d="M.293.293a1 1 0 0 1 1.414 0L8 6.586 14.293.293a1 1 0 1 1 1.414 1.414L9.414 8l6.293 6.293a1 1 0 0 1-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L6.586 8 .293 1.707a1 1 0 0 1 0-1.414z"></path>
          </svg>
        </button>

        {/* Modal Header */}
        <div className="mb-20px">
          <h2
            id="task-modal-title"
            className="text-size-24 font-bold text-blackColor dark:text-blackColor-dark mb-2"
          >
            {isEditMode ? "Edit Task" : "Create New Task"}
          </h2>
          <p className="text-sm text-contentColor dark:text-contentColor-dark">
            {isEditMode 
              ? "Update task details below" 
              : "Assign a new task to a student"}
          </p>
        </div>

        {/* Modal Content - Task Form */}
        <TaskForm
          task={task}
          students={students}
          cohortId={cohortId}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={createTask.isPending || updateTask.isPending}
        />
      </div>
    </div>
  );
}
