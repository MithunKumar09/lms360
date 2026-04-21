'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CourseManagementTableActions from './CourseManagementTableActions';
import { useAuthStore } from '@/store/index';
import { getCoursePermissions } from '@/lib/course/permissions';

/**
 * Course Management Table Card Component (Mobile View)
 * 
 * Mobile-friendly card layout for course display.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.course - Course object
 * @param {boolean} props.isSelected - Whether course is selected
 * @param {Function} props.onSelect - Selection handler
 * @param {string} props.role - User role
 * @param {Function} props.onDelete - Delete handler
 * @param {Function} props.onStatusToggle - Status toggle handler
 * @param {Function} props.onPinToggle - Pin toggle handler
 * @returns {JSX.Element} Card component
 */
const CourseManagementTableCard = ({
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

  // Get permissions for this course
  const permissions = getCoursePermissions(course, user);

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    return status === 'active'
      ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
      : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400';
  };

  return (
    <div
      className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-lg p-4 mb-4 shadow-sm hover:shadow-md transition-shadow"
      role="article"
      aria-label={`Course: ${course.title}`}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect(course.id, e.target.checked);
            }}
            className="w-4 h-4 mt-1 text-primaryColor bg-whiteColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor focus:ring-2 cursor-pointer"
            aria-label={`Select ${course.title}`}
          />
          
          {/* Course Title */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {course.isPinned && (
                <svg
                  className="w-4 h-4 text-primaryColor flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-label="Pinned course"
                >
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              )}
              <Link
                href={`/course-details-3?courseId=${course.id}`}
                className="text-base font-semibold text-blackColor dark:text-blackColor-dark hover:text-primaryColor dark:hover:text-primaryColor transition-colors line-clamp-2"
              >
                {course.title}
              </Link>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${getStatusBadgeClass(
            course.status
          )}`}
          aria-label={`Status: ${course.status}`}
        >
          {course.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Course Details */}
      <div className="space-y-2 mb-4">
        {/* Instructor */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-contentColor/70 dark:text-contentColor-dark/70 font-medium min-w-[80px]">
            Instructor:
          </span>
          <span className="text-contentColor dark:text-contentColor-dark">
            {course.instructor?.name || '-'}
          </span>
        </div>

        {/* Level */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-contentColor/70 dark:text-contentColor-dark/70 font-medium min-w-[80px]">
            Level:
          </span>
          <span className="text-contentColor dark:text-contentColor-dark">
            {course.level || '-'}
          </span>
        </div>

        {/* Organization */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-contentColor/70 dark:text-contentColor-dark/70 font-medium min-w-[80px]">
            Organization:
          </span>
          <span className="text-contentColor dark:text-contentColor-dark">
            {course.organization?.name || 'Global'}
          </span>
        </div>

        {/* Class */}
        {course.class?.name && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-contentColor/70 dark:text-contentColor-dark/70 font-medium min-w-[80px]">
              Class:
            </span>
            <span className="text-contentColor dark:text-contentColor-dark">
              {course.class.name}
            </span>
          </div>
        )}

        {/* Subject */}
        {course.subject?.name && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-contentColor/70 dark:text-contentColor-dark/70 font-medium min-w-[80px]">
              Subject:
            </span>
            <span className="text-contentColor dark:text-contentColor-dark">
              {course.subject.name}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-3 border-t border-borderColor dark:border-borderColor-dark">
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
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(CourseManagementTableCard, (prevProps, nextProps) => {
  return (
    prevProps.course.id === nextProps.course.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.course.status === nextProps.course.status &&
    prevProps.course.isPinned === nextProps.course.isPinned &&
    prevProps.course.title === nextProps.course.title &&
    prevProps.role === nextProps.role
  );
});

