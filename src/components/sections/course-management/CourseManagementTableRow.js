'use client';

import { memo, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CourseManagementTableActions from './CourseManagementTableActions';
import { useAuthStore } from '@/store/index';
import { getCoursePermissions } from '@/lib/course/permissions';

/**
 * Course Management Table Row Component
 * 
 * Individual table row for a course with all columns and actions.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.course - Course object
 * @param {boolean} props.isSelected - Whether course is selected
 * @param {Function} props.onSelect - Selection handler
 * @param {string} props.role - User role
 * @param {Function} props.onDelete - Delete handler
 * @param {Function} props.onStatusToggle - Status toggle handler
 * @param {Function} props.onPinToggle - Pin toggle handler
 * @returns {JSX.Element} Table row component
 */
const CourseManagementTableRow = ({
  course,
  isSelected,
  onSelect,
  role,
  onDelete,
  onStatusToggle,
  onPinToggle,
}) => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  // Get permissions for this course (memoized)
  const permissions = useMemo(
    () => getCoursePermissions(course, user),
    [course, user]
  );

  // Handle row click (navigate to course details)
  const handleRowClick = (e) => {
    // Don't navigate if clicking on checkbox or action buttons
    if (
      e.target.closest('input[type="checkbox"]') ||
      e.target.closest('button') ||
      e.target.closest('a')
    ) {
      return;
    }
    router.push(`/course-details-3?courseId=${course.id}`);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    return status === 'active'
      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';
  };

  // Memoize status badge class
  const statusBadgeClass = useMemo(
    () => getStatusBadgeClass(course.status),
    [course.status]
  );

  return (
    <tr
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          router.push(`/course-details-3?courseId=${course.id}`);
        }
      }}
      tabIndex={0}
      role="row"
      aria-label={`Course: ${course.title}, Status: ${course.status}`}
      className="border-b border-borderColor dark:border-borderColor-dark hover:bg-lightGrey5 dark:hover:bg-whiteColor-dark transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-inset"
    >
      {/* Checkbox */}
      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()} role="gridcell">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(course.id, e.target.checked);
          }}
          className="w-4 h-4 text-primaryColor bg-whiteColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor focus:ring-2 cursor-pointer"
          aria-label={`Select ${course.title}`}
        />
      </td>

      {/* Course Title */}
      <td className="px-5 py-3" role="gridcell">
        <div className="flex items-center gap-2">
          {course.isPinned && (
            <svg
              className="w-4 h-4 text-primaryColor flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-label="Pinned course"
              role="img"
            >
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
          )}
          <Link
            href={`/course-details-3?courseId=${course.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm md:text-base font-medium text-blackColor dark:text-blackColor-dark hover:text-primaryColor dark:hover:text-primaryColor transition-colors focus:outline-none focus:ring-2 focus:ring-primaryColor focus:ring-offset-2 rounded"
            aria-label={`View details for ${course.title}`}
          >
            {course.title}
          </Link>
        </div>
      </td>

      {/* Instructor */}
      <td className="px-5 py-3" role="gridcell">
        <span className="text-sm text-contentColor dark:text-contentColor-dark">
          {course.instructor?.name || '-'}
        </span>
      </td>

      {/* Level */}
      <td className="px-5 py-3" role="gridcell">
        <span className="text-sm text-contentColor dark:text-contentColor-dark">
          {course.level || '-'}
        </span>
      </td>

      {/* Organization */}
      <td className="px-5 py-3" role="gridcell">
        <span className="text-sm text-contentColor dark:text-contentColor-dark">
          {course.organization?.name || 'Global'}
        </span>
      </td>

      {/* Class */}
      <td className="px-5 py-3" role="gridcell">
        <span className="text-sm text-contentColor dark:text-contentColor-dark">
          {course.class?.name || '-'}
        </span>
      </td>

      {/* Subject */}
      <td className="px-5 py-3" role="gridcell">
        <span className="text-sm text-contentColor dark:text-contentColor-dark">
          {course.subject?.name || '-'}
        </span>
      </td>

      {/* Status */}
      <td className="px-5 py-3" role="gridcell">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass}`}
          aria-label={`Status: ${course.status}`}
        >
          {course.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      </td>

      {/* Actions */}
      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()} role="gridcell">
        <CourseManagementTableActions
          course={course}
          permissions={permissions}
          onEdit={() => {
            router.push(`/dashboards/create-course?edit=${course.id}`);
          }}
          onDelete={onDelete}
          onStatusToggle={onStatusToggle}
          onPinToggle={onPinToggle}
        />
      </td>
    </tr>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(CourseManagementTableRow, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render), false if different (re-render)
  return (
    prevProps.course.id === nextProps.course.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.course.status === nextProps.course.status &&
    prevProps.course.isPinned === nextProps.course.isPinned &&
    prevProps.course.title === nextProps.course.title &&
    prevProps.role === nextProps.role
  );
});

