'use client';

import { useState } from 'react';
import { useBulkDeleteCourses, useBulkUpdateCourseStatus } from '@/hooks/api/useCourses';
import useSweetAlert from '@/hooks/useSweetAlert';
import Swal from 'sweetalert2';

/**
 * Course Management Bulk Actions Component
 * 
 * Bulk actions bar with select/deselect all, bulk delete, and bulk status update.
 * 
 * @param {Object} props - Component props
 * @param {Array} props.selectedCourses - Selected course IDs
 * @param {Function} props.onClearSelection - Clear selection handler
 * @param {number} props.totalCourses - Total number of courses
 * @param {Array} props.currentPageCourseIds - Course IDs on current page
 * @param {Function} props.onSelectAll - Select all handler
 * @param {boolean} props.allSelected - Whether all current page courses are selected
 * @returns {JSX.Element} Bulk actions component
 */
const CourseManagementBulkActions = ({
  selectedCourses,
  onClearSelection,
  totalCourses,
  currentPageCourseIds,
  onSelectAll,
  allSelected,
}) => {
  const createAlert = useSweetAlert();
  const bulkDeleteMutation = useBulkDeleteCourses();
  const bulkStatusMutation = useBulkUpdateCourseStatus();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!selectedCourses || selectedCourses.length === 0) {
    return null;
  }

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const result = await Swal.fire({
      title: 'Delete Selected Courses',
      html: `Are you sure you want to delete <strong>${selectedCourses.length}</strong> course(s)?<br/><br/>This action cannot be undone and will delete all course activities and connections.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: `Yes, Delete ${selectedCourses.length} Course(s)`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        await bulkDeleteMutation.mutateAsync(selectedCourses);
        onClearSelection();
      } catch (error) {
        createAlert('error', error.message || 'Failed to delete courses');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Handle bulk status update
  const handleBulkStatusUpdate = async (newStatus) => {
    const statusText = newStatus === 'active' ? 'activate' : 'deactivate';
    const result = await Swal.fire({
      title: `${statusText.charAt(0).toUpperCase() + statusText.slice(1)} Selected Courses`,
      html: `Are you sure you want to ${statusText} <strong>${selectedCourses.length}</strong> course(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: `Yes, ${statusText.charAt(0).toUpperCase() + statusText.slice(1)} ${selectedCourses.length} Course(s)`,
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#6c757d',
    });

    if (result.isConfirmed) {
      setIsProcessing(true);
      try {
        await bulkStatusMutation.mutateAsync({
          courseIds: selectedCourses,
          status: newStatus,
        });
        onClearSelection();
      } catch (error) {
        createAlert('error', error.message || `Failed to ${statusText} courses`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Handle select/deselect all
  const handleToggleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(!allSelected);
    }
  };

  return (
    <div className="container mb-6">
      <div className="bg-primaryColor/10 dark:bg-primaryColor/20 border border-primaryColor/30 dark:border-primaryColor/40 rounded-md p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelected && currentPageCourseIds.length > 0}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 text-primaryColor bg-whiteColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor focus:ring-2 cursor-pointer"
                aria-label="Select all courses on current page"
              />
              <span className="text-sm font-medium text-contentColor dark:text-contentColor-dark">
                {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <button
              onClick={onClearSelection}
              className="text-sm text-contentColor dark:text-contentColor-dark hover:text-primaryColor dark:hover:text-primaryColor transition-colors"
            >
              Clear Selection
            </button>
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Bulk Activate */}
            <button
              onClick={() => handleBulkStatusUpdate('active')}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-whiteColor bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing ? (
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="feather feather-check-circle"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              )}
              Activate Selected
            </button>

            {/* Bulk Deactivate */}
            <button
              onClick={() => handleBulkStatusUpdate('inactive')}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-whiteColor bg-gray-600 hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing ? (
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="feather feather-x-circle"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              )}
              Deactivate Selected
            </button>

            {/* Bulk Delete */}
            <button
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="px-4 py-2 text-sm font-medium text-whiteColor bg-red-600 hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isProcessing ? (
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="feather feather-trash-2"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              )}
              Delete Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseManagementBulkActions;
