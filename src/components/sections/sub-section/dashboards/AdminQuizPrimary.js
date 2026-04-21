"use client";

import QuizContainers from "@/components/shared/containers/QuizContainers";
import React from "react";
import { useQuizAttempts } from "@/hooks/api/useQuizAttempts";

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

const AdminQuizPrimaryt = () => {
  const { data, isLoading, error } = useQuizAttempts();

  if (isLoading) {
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

  const allResults = Array.isArray(data?.attempts) 
    ? data.attempts
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
          courseName: attempt.courseTitle || null,
          isView: true,
        }))
    : [];

  return <QuizContainers allResults={allResults} />;
};

export default AdminQuizPrimaryt;
