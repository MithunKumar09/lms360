'use client';

import { useState, useMemo, useCallback } from 'react';
import CourseManagementTableRow from './CourseManagementTableRow';
import CourseManagementTableCard from './CourseManagementTableCard';
import { useDeleteCourse, useUpdateCourseStatus, usePinCourse } from '@/hooks/api/useCourses';
import { useAuthStore } from '@/store/index';

/**
 * Course Management Table Component
 * 
 * Professional data table with all required columns and actions.
 * 
 * @param {Object} props - Component props
 * @param {Array} props.courses - Course data array
 * @param {Array} props.selectedCourses - Selected course IDs
 * @param {Function} props.onSelectionChange - Selection change handler
 * @param {string} props.role - User role
 * @param {number} props.currentPage - Current page number
 * @param {number} props.totalCourses - Total number of courses
 * @returns {JSX.Element} Table component
 */
const CourseManagementTable = ({
  courses,
  selectedCourses,
  onSelectionChange,
  role,
  currentPage,
  totalCourses,
}) => {
  const user = useAuthStore((state) => state.user);
  const deleteCourseMutation = useDeleteCourse();
  const updateStatusMutation = useUpdateCourseStatus();
  const pinCourseMutation = usePinCourse();

  // Get current page course IDs for select all
  const currentPageCourseIds = useMemo(
    () => courses.map((course) => course.id),
    [courses]
  );

  // Check if all current page courses are selected
  const allSelected = useMemo(
    () =>
      currentPageCourseIds.length > 0 &&
      currentPageCourseIds.every((id) => selectedCourses.includes(id)),
    [currentPageCourseIds, selectedCourses]
  );

  // Handle select all
  const handleSelectAll = useCallback((e) => {
    if (e.target.checked) {
      // Select all courses on current page
      const newSelection = [...new Set([...selectedCourses, ...currentPageCourseIds])];
      onSelectionChange(newSelection);
    } else {
      // Deselect all courses on current page
      const newSelection = selectedCourses.filter((id) => !currentPageCourseIds.includes(id));
      onSelectionChange(newSelection);
    }
  }, [selectedCourses, currentPageCourseIds, onSelectionChange]);

  // Handle individual course selection (memoized)
  const handleCourseSelect = useCallback((courseId, isSelected) => {
    if (isSelected) {
      onSelectionChange([...selectedCourses, courseId]);
    } else {
      onSelectionChange(selectedCourses.filter((id) => id !== courseId));
    }
  }, [selectedCourses, onSelectionChange]);

  // Handle delete (memoized)
  const handleDelete = useCallback(async (courseId) => {
    await deleteCourseMutation.mutateAsync(courseId);
  }, [deleteCourseMutation]);

  // Handle status toggle (memoized)
  const handleStatusToggle = useCallback(async (courseId, newStatus) => {
    await updateStatusMutation.mutateAsync({ courseId, status: newStatus });
  }, [updateStatusMutation]);

  // Handle pin toggle (memoized)
  const handlePinToggle = useCallback(async (courseId, isPinned) => {
    await pinCourseMutation.mutateAsync({ courseId, isPinned });
  }, [pinCourseMutation]);

  if (!courses || courses.length === 0) {
    return null; // Empty state is handled in parent component
  }

  return (
    <div className="container mb-6">
      {/* Desktop Table View */}
      <div className="hidden lg:block bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left" role="table" aria-label="Course management table">
            <thead className="text-sm md:text-base text-blackColor dark:text-blackColor-dark bg-lightGrey5 dark:bg-whiteColor-dark leading-1.8 md:leading-1.8">
              <tr>
                {/* Checkbox Column */}
                <th className="px-5 py-3" scope="col">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-primaryColor bg-whiteColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor focus:ring-2 cursor-pointer"
                    aria-label="Select all courses"
                  />
                </th>
                {/* Course Title */}
                <th className="px-5 py-3 font-semibold" scope="col">Course Title</th>
                {/* Instructor */}
                <th className="px-5 py-3 font-semibold" scope="col">Instructor</th>
                {/* Level */}
                <th className="px-5 py-3 font-semibold" scope="col">Level</th>
                {/* Organization */}
                <th className="px-5 py-3 font-semibold" scope="col">Organization</th>
                {/* Class */}
                <th className="px-5 py-3 font-semibold" scope="col">Class</th>
                {/* Subject */}
                <th className="px-5 py-3 font-semibold" scope="col">Subject</th>
                {/* Status */}
                <th className="px-5 py-3 font-semibold" scope="col">Status</th>
                {/* Actions */}
                <th className="px-5 py-3 font-semibold" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="text-size-13 md:text-base text-contentColor dark:text-contentColor-dark font-normal">
              {courses.map((course) => (
                <CourseManagementTableRow
                  key={course.id}
                  course={course}
                  isSelected={selectedCourses.includes(course.id)}
                  onSelect={handleCourseSelect}
                  role={role}
                  onDelete={handleDelete}
                  onStatusToggle={handleStatusToggle}
                  onPinToggle={handlePinToggle}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden">
        {/* Select All (Mobile) */}
        <div className="mb-4 flex items-center gap-3 p-4 bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-md">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            className="w-4 h-4 text-primaryColor bg-whiteColor border-borderColor dark:border-borderColor-dark rounded focus:ring-primaryColor focus:ring-2 cursor-pointer"
            aria-label="Select all courses"
          />
          <span className="text-sm font-medium text-contentColor dark:text-contentColor-dark">
            Select All ({courses.length} courses)
          </span>
        </div>

        {/* Course Cards */}
        <div className="space-y-0">
          {courses.map((course) => (
            <CourseManagementTableCard
              key={course.id}
              course={course}
              isSelected={selectedCourses.includes(course.id)}
              onSelect={handleCourseSelect}
              role={role}
              onDelete={handleDelete}
              onStatusToggle={handleStatusToggle}
              onPinToggle={handlePinToggle}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseManagementTable;

