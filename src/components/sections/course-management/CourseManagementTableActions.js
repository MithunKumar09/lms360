'use client';

import { memo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import useSweetAlert from '@/hooks/useSweetAlert';
import Swal from 'sweetalert2';

/**
 * Course Management Table Actions Component
 * 
 * Action buttons for course management (Edit, Delete, Status Toggle, Pin, Share).
 * Buttons are shown/hidden based on permissions.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.course - Course object
 * @param {Object} props.permissions - Permission flags (canEdit, canDelete, etc.)
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onDelete - Delete handler
 * @param {Function} props.onStatusToggle - Status toggle handler
 * @param {Function} props.onPinToggle - Pin toggle handler
 * @returns {JSX.Element} Action buttons component
 */
const CourseManagementTableActions = ({
  course,
  permissions,
  onEdit,
  onDelete,
  onStatusToggle,
  onPinToggle,
}) => {
  const router = useRouter();
  const createAlert = useSweetAlert();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isTogglingPin, setIsTogglingPin] = useState(false);

  // Handle edit (memoized)
  const handleEdit = useCallback((e) => {
    e.stopPropagation();
    if (onEdit && permissions.canEdit) {
      onEdit();
    }
  }, [onEdit, permissions.canEdit]);

  // Handle delete with confirmation
  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!permissions.canDelete || !onDelete) return;

    const result = await Swal.fire({
      title: 'Delete Course',
      text: `Are you sure you want to delete "${course.title}"? This action cannot be undone and will delete all course activities and connections.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    });

    if (result.isConfirmed) {
      setIsDeleting(true);
      try {
        await onDelete(course.id);
      } catch (error) {
        createAlert('error', error.message || 'Failed to delete course');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Handle status toggle
  const handleStatusToggle = async (e) => {
    e.stopPropagation();
    if (!permissions.canChangeStatus || !onStatusToggle) return;

    setIsTogglingStatus(true);
    try {
      const newStatus = course.status === 'active' ? 'inactive' : 'active';
      await onStatusToggle(course.id, newStatus);
    } catch (error) {
      createAlert('error', error.message || 'Failed to update course status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // Handle pin toggle
  const handlePinToggle = async (e) => {
    e.stopPropagation();
    if (!permissions.canPin || !onPinToggle) return;

    setIsTogglingPin(true);
    try {
      await onPinToggle(course.id, !course.isPinned);
    } catch (error) {
      createAlert('error', error.message || 'Failed to update course pin status');
    } finally {
      setIsTogglingPin(false);
    }
  };

  // Handle share
  const handleShare = async (e) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/course-details-3?courseId=${course.id}`;
    const shareText = `Check out this course: ${course.title}`;

    // Try to use Web Share API if available
    if (navigator.share) {
      try {
        await navigator.share({
          title: course.title,
          text: shareText,
          url: shareUrl,
        });
        createAlert('success', 'Course shared successfully');
      } catch (error) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          // Show share modal as fallback
          showShareModal(shareUrl, course.title, shareText);
        }
      }
    } else {
      // Show share modal
      showShareModal(shareUrl, course.title, shareText);
    }
  };

  // Show share modal with options
  const showShareModal = async (shareUrl, courseTitle, shareText) => {
    // First try to copy to clipboard
    try {
      await copyToClipboard(shareUrl);
    } catch (error) {
      // If clipboard fails, show modal
      Swal.fire({
        title: 'Share Course',
        html: `
          <div style="text-align: left;">
            <p style="margin-bottom: 15px; font-size: 14px;">
              Share <strong>${courseTitle}</strong>
            </p>
            <div style="margin-bottom: 15px;">
              <label style="display: block; font-size: 12px; font-weight: 500; margin-bottom: 5px;">
                Course Link:
              </label>
              <div style="display: flex; gap: 8px;">
                <input
                  id="share-url-input"
                  type="text"
                  value="${shareUrl}"
                  readonly
                  style="flex: 1; padding: 8px 12px; font-size: 12px; border: 1px solid #ddd; border-radius: 4px;"
                />
                <button
                  id="copy-link-btn"
                  style="padding: 8px 16px; font-size: 12px; font-weight: 500; color: white; background: #3085d6; border: none; border-radius: 4px; cursor: pointer;"
                >
                  Copy
                </button>
              </div>
            </div>
            <div style="display: flex; gap: 8px; justify-content: center; margin-top: 15px;">
              <a
                href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}"
                target="_blank"
                rel="noopener noreferrer"
                style="padding: 8px 16px; font-size: 12px; font-weight: 500; color: white; background: #1877f2; border-radius: 4px; text-decoration: none;"
              >
                Facebook
              </a>
              <a
                href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}"
                target="_blank"
                rel="noopener noreferrer"
                style="padding: 8px 16px; font-size: 12px; font-weight: 500; color: white; background: #1da1f2; border-radius: 4px; text-decoration: none;"
              >
                Twitter
              </a>
              <a
                href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}"
                target="_blank"
                rel="noopener noreferrer"
                style="padding: 8px 16px; font-size: 12px; font-weight: 500; color: white; background: #0077b5; border-radius: 4px; text-decoration: none;"
              >
                LinkedIn
              </a>
            </div>
          </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Close',
        cancelButtonColor: '#6c757d',
        width: '500px',
        didOpen: () => {
          // Handle copy button click
          const copyBtn = document.getElementById('copy-link-btn');
          const urlInput = document.getElementById('share-url-input');
          
          if (copyBtn && urlInput) {
            copyBtn.addEventListener('click', async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                copyBtn.textContent = 'Copied!';
                copyBtn.style.background = '#28a745';
                setTimeout(() => {
                  copyBtn.textContent = 'Copy';
                  copyBtn.style.background = '#3085d6';
                }, 2000);
              } catch (error) {
                // Fallback for older browsers
                urlInput.select();
                document.execCommand('copy');
                copyBtn.textContent = 'Copied!';
                copyBtn.style.background = '#28a745';
                setTimeout(() => {
                  copyBtn.textContent = 'Copy';
                  copyBtn.style.background = '#3085d6';
                }, 2000);
              }
            });
          }
        },
      });
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      createAlert('success', 'Course link copied to clipboard!');
    } catch (error) {
      createAlert('error', 'Failed to copy link to clipboard');
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Edit Button */}
      {permissions.canEdit && (
        <button
          onClick={handleEdit}
          className="p-2 text-contentColor dark:text-contentColor-dark hover:text-primaryColor dark:hover:text-primaryColor hover:bg-lightGrey5 dark:hover:bg-whiteColor-dark rounded-md transition-colors"
          title="Edit Course"
          aria-label="Edit Course"
        >
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
            className="feather feather-edit"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      )}

      {/* Delete Button */}
      {permissions.canDelete && (
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-2 text-contentColor dark:text-contentColor-dark hover:text-red-600 dark:hover:text-red-400 hover:bg-lightGrey5 dark:hover:bg-whiteColor-dark rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete Course"
          aria-label="Delete Course"
        >
          {isDeleting ? (
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
        </button>
      )}

      {/* Status Toggle Button */}
      {permissions.canChangeStatus && (
        <button
          onClick={handleStatusToggle}
          disabled={isTogglingStatus}
          className={`p-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            course.status === 'active'
              ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          title={course.status === 'active' ? 'Set Inactive' : 'Set Active'}
          aria-label={course.status === 'active' ? 'Set Inactive' : 'Set Active'}
        >
          {isTogglingStatus ? (
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
              className="feather feather-toggle-right"
            >
              {course.status === 'active' ? (
                <>
                  <rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect>
                  <circle cx="16" cy="12" r="3"></circle>
                </>
              ) : (
                <>
                  <rect x="1" y="5" width="22" height="14" rx="7" ry="7"></rect>
                  <circle cx="8" cy="12" r="3"></circle>
                </>
              )}
            </svg>
          )}
        </button>
      )}

      {/* Pin Button */}
      {permissions.canPin && (
        <button
          onClick={handlePinToggle}
          disabled={isTogglingPin}
          className={`p-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            course.isPinned
              ? 'text-primaryColor dark:text-primaryColor hover:bg-primaryColor/10 dark:hover:bg-primaryColor/20'
              : 'text-contentColor dark:text-contentColor-dark hover:bg-lightGrey5 dark:hover:bg-whiteColor-dark'
          }`}
          title={course.isPinned ? 'Unpin Course' : 'Pin Course'}
          aria-label={course.isPinned ? 'Unpin Course' : 'Pin Course'}
        >
          {isTogglingPin ? (
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
              className={`feather feather-pin ${course.isPinned ? 'fill-current' : ''}`}
            >
              <path d="M12 2v20M2 12h20" />
              <circle cx="12" cy="12" r="2" />
            </svg>
          )}
        </button>
      )}

      {/* Share Button */}
      <button
        onClick={handleShare}
        className="p-2 text-contentColor dark:text-contentColor-dark hover:text-primaryColor dark:hover:text-primaryColor hover:bg-lightGrey5 dark:hover:bg-whiteColor-dark rounded-md transition-colors"
        title="Share Course"
        aria-label="Share Course"
      >
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
          className="feather feather-share-2"
        >
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
      </button>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(CourseManagementTableActions, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render), false if different (re-render)
  return (
    prevProps.course.id === nextProps.course.id &&
    prevProps.course.status === nextProps.course.status &&
    prevProps.course.isPinned === nextProps.course.isPinned &&
    prevProps.permissions.canEdit === nextProps.permissions.canEdit &&
    prevProps.permissions.canDelete === nextProps.permissions.canDelete &&
    prevProps.permissions.canChangeStatus === nextProps.permissions.canChangeStatus &&
    prevProps.permissions.canPin === nextProps.permissions.canPin
  );
});

