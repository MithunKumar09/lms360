"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QuizContainers from "@/components/shared/containers/QuizContainers";
import { useQuizAttempts } from "@/hooks/api/useQuizAttempts";
import useCoursesForDropdown from "@/hooks/api/useCoursesForDropdown";
import useQuizzesForDropdown from "@/hooks/api/useQuizzesForDropdown";
import AdvancedDropdown from "@/components/shared/forms/AdvancedDropdown";
import NoData from "@/components/shared/others/NoData";
import apiClient from "@/lib/api/client.js";

/**
 * Transform quiz attempt status to display status
 */
const transformStatus = (status, isPassed, submittedAt) => {
  if (status === 'submitted') {
    if (isPassed === true) return 'pass';
    if (isPassed === false) return 'fail';
    return 'processing';
  }
  if (status === 'in_progress') return 'running';
  if (status === 'timeout') return 'time over';
  if (status === 'abandoned') return 'cancel';
  return status;
};

/**
 * Format date to display format
 */
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

/**
 * Format time taken
 */
const formatTimeTaken = (seconds) => {
  if (!seconds) return 'N/A';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

const AdminQuizAttemptsPrimary = () => {
  // Filters state
  const [filters, setFilters] = useState({
    quizId: null,
    courseId: null,
    status: null,
    page: 1,
    limit: 20,
  });

  // Fetch courses for filter (admin's organization only)
  const { data: coursesData, isLoading: isLoadingCourses } = useCoursesForDropdown();
  const courses = coursesData?.courses || [];

  // Fetch quizzes for filter (admin's organization only)
  const { data: quizzesData, isLoading: isLoadingQuizzes } = useQuizzesForDropdown();
  const quizzes = quizzesData?.quizzes || [];

  // Fetch quiz attempts with filters
  const { data, isLoading, error } = useQuizAttempts({
    quizId: filters.quizId,
    status: filters.status,
    page: filters.page,
    limit: filters.limit,
  });

  // Filter attempts by course on frontend (since API doesn't support course filter directly)
  let filteredAttempts = Array.isArray(data?.attempts) ? data.attempts : [];
  if (filters.courseId && Array.isArray(courses)) {
    const selectedCourse = courses.find(c => c && c.id === filters.courseId);
    if (selectedCourse && selectedCourse.title) {
      filteredAttempts = filteredAttempts.filter(
        (attempt) => attempt && attempt.courseTitle === selectedCourse.title
      );
    }
  }

  // Get pagination info from API
  const pagination = data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 };
  
  // Adjust total for course filter (if applied)
  const totalFiltered = filters.courseId 
    ? filteredAttempts.length 
    : pagination.total;
  const totalPages = filters.courseId
    ? Math.ceil(filteredAttempts.length / filters.limit)
    : pagination.totalPages;

  // Transform attempts for display
  const allResults = Array.isArray(filteredAttempts) ? filteredAttempts
    .filter(attempt => attempt && typeof attempt === 'object')
    .map((attempt) => ({
      id: attempt.id,
      date: formatDate(attempt.submittedAt || attempt.startedAt),
      title: attempt.quizTitle || 'Untitled Quiz',
      studentName: attempt.studentName || 'Unknown',
      qus: typeof attempt.questionCount === 'number' ? attempt.questionCount : 0,
      tm: typeof attempt.quizTotalMarks === 'number' ? attempt.quizTotalMarks : 0,
      ca: attempt.marksObtained !== null && attempt.marksObtained !== undefined ? attempt.marksObtained : '-',
      status: transformStatus(attempt.status, attempt.isPassed, attempt.submittedAt),
      courseName: attempt.courseTitle || 'Standalone Quiz',
      isView: true,
      timeTaken: formatTimeTaken(attempt.timeTakenSeconds),
      percentageScore: typeof attempt.percentageScore === 'number' ? `${attempt.percentageScore}%` : '-',
    })) : [];

  // Filter options
  const courseOptions = [
    { id: "all", label: "All Courses", value: null },
    ...(Array.isArray(courses) ? courses
      .filter(course => course && typeof course === 'object' && course.id)
      .map((course) => ({
        id: course.id,
        label: course.title || 'Untitled Course',
        value: course.id,
      })) : []),
  ];

  const quizOptions = [
    { id: "all", label: "All Quizzes", value: null },
    ...(Array.isArray(quizzes) ? quizzes
      .filter(quiz => quiz && typeof quiz === 'object' && quiz.id)
      .map((quiz) => ({
        id: quiz.id,
        label: quiz.title || 'Untitled Quiz',
        value: quiz.id,
      })) : []),
  ];

  const statusOptions = [
    { id: "all", label: "All Status", value: null },
    { id: "in_progress", label: "In Progress", value: "in_progress" },
    { id: "submitted", label: "Submitted", value: "submitted" },
    { id: "timeout", label: "Timeout", value: "timeout" },
    { id: "abandoned", label: "Abandoned", value: "abandoned" },
  ];

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value === "all" ? null : value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      quizId: null,
      courseId: null,
      status: null,
      page: 1,
      limit: 20,
    });
  };

  if (isLoading || isLoadingCourses || isLoadingQuizzes) {
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="h-10 flex items-center justify-center font-semibold text-lightGrey4 text-lg md:text-2xl">
          <p>Loading quiz attempts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    // Safely extract error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : typeof error === 'string' 
      ? error 
      : error?.message || 'Failed to load quiz attempts';
    
    return (
      <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
        <div className="h-10 flex items-center justify-center font-semibold text-red-500 text-lg md:text-2xl">
          <p>Error loading quiz attempts: {errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10px md:px-10 md:py-50px mb-30px bg-whiteColor dark:bg-whiteColor-dark shadow-accordion dark:shadow-accordion-dark rounded-5">
      {/* Filters Section */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Filter by Course
            </label>
            <AdvancedDropdown
              options={courseOptions}
              value={filters.courseId || "all"}
              onChange={(value) => handleFilterChange("courseId", value)}
              placeholder="All Courses"
              searchable={true}
              loading={isLoadingCourses}
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Filter by Quiz
            </label>
            <AdvancedDropdown
              options={quizOptions}
              value={filters.quizId || "all"}
              onChange={(value) => handleFilterChange("quizId", value)}
              placeholder="All Quizzes"
              searchable={true}
              loading={isLoadingQuizzes}
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold text-blackColor dark:text-blackColor-dark">
              Filter by Status
            </label>
            <AdvancedDropdown
              options={statusOptions}
              value={filters.status || "all"}
              onChange={(value) => handleFilterChange("status", value)}
              placeholder="All Status"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <hr className="my-4 border-contentColor opacity-35" />

      {/* Results */}
      {allResults.length === 0 ? (
        <NoData message="No quiz attempts found" />
      ) : (
        <>
          <QuizContainers allResults={allResults} title="Quiz Attempts" />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, totalFiltered)} of {totalFiltered}{" "}
                attempts
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page === 1}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  Page {filters.page} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page >= totalPages}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminQuizAttemptsPrimary;

