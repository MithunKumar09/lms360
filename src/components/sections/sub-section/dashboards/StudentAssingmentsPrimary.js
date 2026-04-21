"use client";

import QuizContainers from "@/components/shared/containers/QuizContainers";
import React, { useState, useMemo } from "react";
import { useStudentAssignments } from "@/hooks/api/useStudentAssignments";
import { formatDateShort } from "@/lib/utils/dateFormatter";

const StudentAssingmentsPrimary = () => {
  // Filter state
  const [filters, setFilters] = useState({
    courseId: null,
    status: null,
    sortBy: 'deadline',
    sortOrder: 'asc',
    page: 1,
    limit: 20,
  });

  // Fetch assignments with filters
  const { data, isLoading, error } = useStudentAssignments({
    courseId: filters.courseId,
    status: filters.status,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    page: filters.page,
    limit: filters.limit,
  });

  // Extract courses from assignments for filter dropdown
  const courses = useMemo(() => {
    if (!Array.isArray(data?.assignments)) return [];
    const uniqueCourses = new Map();
    data.assignments
      .filter(assignment => assignment && typeof assignment === 'object')
      .forEach((assignment) => {
        if (assignment.courseId && !uniqueCourses.has(assignment.courseId)) {
          uniqueCourses.set(assignment.courseId, {
            id: assignment.courseId,
            title: assignment.courseName,
          });
        }
      });
    return Array.from(uniqueCourses.values());
  }, [data?.assignments]);

  // Transform assignments to table format
  const allResults = useMemo(() => {
    if (!Array.isArray(data?.assignments)) return [];

    return data.assignments
      .filter(assignment => assignment && typeof assignment === 'object')
      .map((assignment) => {
      const submission = assignment.submission;
      const isSubmitted = !!submission;

      return {
        id: assignment.id,
        title: assignment.title,
        courseName: assignment.courseName,
        tm: assignment.maxMarks,
        totalSubmit: submission?.fileCount || 0,
        deadline: assignment.deadline ? formatDateShort(assignment.deadline) : "N/A",
        markObtained: submission?.marksObtained !== null && submission?.marksObtained !== undefined 
          ? submission.marksObtained 
          : undefined,
        isSubmit: !isSubmitted, // Show Submit button if not submitted
        isView: isSubmitted, // Show View/Edit buttons if submitted
        isDownload: isSubmitted && submission?.fileCount > 0,
      };
    });
  }, [data?.assignments]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page when filters change
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  // Loading state
  if (isLoading) {
    return (
      <QuizContainers 
        allResults={[]} 
        title="Assignments" 
        table={2}
        isLoading={true}
      />
    );
  }

  // Error state
  if (error) {
    // Safely extract error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
      ? error 
      : error?.message || 'Failed to load assignments';
    
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="text-center py-20">
          <p className="text-lg text-contentColor dark:text-contentColor-dark">
            {errorMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <QuizContainers 
      allResults={allResults} 
      title="Assignments" 
      table={2}
      filters={filters}
      onFilterChange={handleFilterChange}
      courses={courses}
      pagination={data?.pagination}
      onPageChange={handlePageChange}
    />
  );
};

export default StudentAssingmentsPrimary;
