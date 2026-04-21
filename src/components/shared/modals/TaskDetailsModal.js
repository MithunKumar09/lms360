"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useTask } from "@/hooks/api/useTask";
import { useUpdateStudentTaskStatus } from "@/hooks/api/useStudentTasks";
import {
  useTaskAttachments,
  useUploadTaskAttachment,
  useDeleteTaskAttachment,
  useTaskComments,
  useAddTaskComment,
} from "@/hooks/api/useTask";
import TaskAttachments from "@/components/shared/tasks/TaskAttachments";
import TaskComments from "@/components/shared/tasks/TaskComments";
import { useAuthStore } from "@/store/index.js";

/**
 * TaskDetailsModal Component
 * 
 * Modal for viewing task details with comments and attachments.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Close handler
 * @param {string} props.taskId - Task ID to display
 * @param {Function} props.onEdit - Edit handler (mentor only)
 * @param {Function} props.onDelete - Delete handler (mentor only)
 */
export default function TaskDetailsModal({
  isOpen,
  onClose,
  taskId,
  onEdit,
  onDelete,
}) {
  const modalRef = useRef(null);
  const contentRef = useRef(null);
  const user = useAuthStore((state) => state.user);
  const userRole = user?.role;
  const isMentor = userRole === 'mentor';
  const isStudent = userRole === 'student';

  const { data: task, isLoading, error } = useTask(taskId, {
    enabled: isOpen && !!taskId,
  });

  const updateStatus = useUpdateStudentTaskStatus();
  
  // Attachments hooks
  const { data: attachments = [], isLoading: attachmentsLoading } = useTaskAttachments(taskId, {
    enabled: isOpen && !!taskId,
  });
  const uploadAttachment = useUploadTaskAttachment();
  const deleteAttachment = useDeleteTaskAttachment();

  // Comments hooks
  const { data: comments = [], isLoading: commentsLoading } = useTaskComments(taskId, {
    enabled: isOpen && !!taskId,
  });
  const addComment = useAddTaskComment();

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

  const handleStatusChange = async (newStatus) => {
    if (!isStudent || !taskId) return;
    
    try {
      await updateStatus.mutateAsync({
        taskId,
        status: newStatus,
      });
    } catch (error) {
      console.error('Status update error:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
    } catch (e) {
      return dateString;
    }
  };

  const formatDateShort = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch (e) {
      return dateString;
    }
  };

  // Priority colors
  const priorityColors = {
    urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  };

  // Status colors
  const statusColors = {
    pending: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };

  if (!isOpen) {
    return null;
  }

  if (isLoading) {
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
      >
        <div
          ref={contentRef}
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-standard p-25px max-w-[700px] w-full max-h-[90vh] overflow-y-auto shadow-dropdown relative z-small"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center py-8">
            <p className="text-contentColor dark:text-contentColor-dark">Loading task details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !task) {
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
      >
        <div
          ref={contentRef}
          className="bg-whiteColor dark:bg-whiteColor-dark rounded-standard p-25px max-w-[700px] w-full max-h-[90vh] overflow-y-auto shadow-dropdown relative z-small"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center py-8">
            <p className="text-red-600 dark:text-red-400">
              {error?.message || "Failed to load task details"}
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 text-sm font-medium text-whiteColor bg-primaryColor rounded-md hover:bg-opacity-90"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const assignee = isMentor ? task.student : task.mentor;
  const assigneeName = assignee
    ? `${assignee.firstName || ""} ${assignee.lastName || ""}`.trim() || assignee.email
    : "N/A";

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
      aria-labelledby="task-details-modal-title"
    >
      <div
        ref={contentRef}
        className="bg-whiteColor dark:bg-whiteColor-dark rounded-standard p-25px max-w-[700px] w-full max-h-[90vh] overflow-y-auto shadow-dropdown relative z-small transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-12px right-12px text-contentColor dark:text-contentColor-dark hover:text-blackColor dark:hover:text-blackColor-dark opacity-50 hover:opacity-75 transition-opacity p-5px"
          aria-label="Close task details modal"
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
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2
                id="task-details-modal-title"
                className="text-size-24 font-bold text-blackColor dark:text-blackColor-dark mb-2"
              >
                {task.title}
              </h2>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${priorityColors[task.priority] || priorityColors.medium}`}
                >
                  {task.priority}
                </span>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[task.status] || statusColors.pending}`}
                >
                  {task.status.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Actions (Mentor only) */}
            {isMentor && (onEdit || onDelete) && (
              <div className="flex items-center gap-2 ml-4">
                {onEdit && (
                  <button
                    onClick={() => onEdit(task)}
                    className="p-2 text-primaryColor hover:bg-primaryColor/10 rounded transition-colors"
                    aria-label="Edit task"
                  >
                    <i className="icofont-edit text-lg"></i>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(task)}
                    className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    aria-label="Delete task"
                  >
                    <i className="icofont-trash text-lg"></i>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Task Meta Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-contentColor dark:text-contentColor-dark">
                {isMentor ? "Assigned to" : "From"}:{" "}
              </span>
              <span className="font-semibold text-blackColor dark:text-blackColor-dark">
                {assigneeName}
              </span>
            </div>
            {task.dueDate && (
              <div>
                <span className="text-contentColor dark:text-contentColor-dark">
                  Due Date:{" "}
                </span>
                <span className="font-semibold text-blackColor dark:text-blackColor-dark">
                  {formatDateShort(task.dueDate)}
                </span>
              </div>
            )}
            <div>
              <span className="text-contentColor dark:text-contentColor-dark">
                Created:{" "}
              </span>
              <span className="font-semibold text-blackColor dark:text-blackColor-dark">
                {formatDate(task.createdAt)}
              </span>
            </div>
            {task.taskType && (
              <div>
                <span className="text-contentColor dark:text-contentColor-dark">
                  Type:{" "}
                </span>
                <span className="font-semibold text-blackColor dark:text-blackColor-dark capitalize">
                  {task.taskType}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
              Description
            </h3>
            <p className="text-sm text-contentColor dark:text-contentColor-dark whitespace-pre-wrap">
              {task.description}
            </p>
          </div>
        )}

        {/* Status Update (Student only) */}
        {isStudent && task.status !== "completed" && task.status !== "cancelled" && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
            <h3 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-3">
              Update Status
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStatusChange("in_progress")}
                disabled={updateStatus.isPending || task.status === "in_progress"}
                className="px-4 py-2 text-sm font-medium text-whiteColor bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark as In Progress
              </button>
              <button
                onClick={() => handleStatusChange("completed")}
                disabled={updateStatus.isPending || task.status === "completed"}
                className="px-4 py-2 text-sm font-medium text-whiteColor bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark as Completed
              </button>
            </div>
          </div>
        )}

        {/* Attachments Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-3">
            Attachments
          </h3>
          <TaskAttachments
            attachments={attachments}
            onUpload={(file) => {
              uploadAttachment.mutate({ taskId, file });
            }}
            onDelete={(attachmentId) => {
              if (confirm('Are you sure you want to delete this attachment?')) {
                deleteAttachment.mutate({ taskId, attachmentId });
              }
            }}
            canUpload={true} // Both mentor and student can upload
            canDelete={true} // Mentor can delete any, student can delete their own (handled by backend)
            isUploading={uploadAttachment.isPending}
          />
        </div>

        {/* Comments Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-3">
            Comments
          </h3>
          <TaskComments
            comments={comments}
            onAddComment={(comment) => {
              addComment.mutate({ taskId, comment });
            }}
            canComment={true} // Both mentor and student can comment
            isSubmitting={addComment.isPending}
          />
        </div>

        {/* Close Button */}
        <div className="mt-6 pt-4 border-t border-borderColor dark:border-borderColor-dark">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-whiteColor bg-primaryColor rounded-md hover:bg-opacity-90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
