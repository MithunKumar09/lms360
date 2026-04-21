"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import QuizGrid from '@/components/quiz/QuizGrid';
import useStudentQuizAttempts from '@/hooks/api/useStudentQuizAttempts';
import ResultDisplay from '@/components/quiz/ResultDisplay';
import QuizReportPreviewModal from '@/components/reports/QuizReportPreviewModal';
import { useAuthStore } from '@/store';

const AttemptedQuizzesSection = ({ className = '' }) => {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedQuizForReport, setSelectedQuizForReport] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const [filters, setFilters] = useState({
    quizId: null,
    status: 'submitted',
    page: 1,
    limit: 12,
  });

  const { data, isLoading, error } = useStudentQuizAttempts({
    quizId: filters.quizId,
    status: filters.status,
    page: filters.page,
    limit: filters.limit,
  });

  const attempts = data?.attempts || [];
  const pagination = data?.pagination || { page: 1, limit: filters.limit, total: 0, totalPages: 0 };

  // Transform attempts into quiz-like objects for QuizGrid
  const quizzesFromAttempts = attempts.map((attempt) => ({
    id: attempt.quizId,
    title: attempt.quizTitle,
    description: `Score: ${attempt.percentageScore?.toFixed(2) || 'N/A'}%`,
    status: attempt.isPassed ? 'published' : 'closed',
    marksObtained: attempt.marksObtained,
    percentageScore: attempt.percentageScore,
    isPassed: attempt.isPassed,
    submittedAt: attempt.submittedAt,
    attemptId: attempt.id,
    quizTotalMarks: attempt.quizTotalMarks,
    quizPassingMarks: attempt.quizPassingMarks,
    questionCount: attempt.questionCount,
  }));

  const handleViewResults = useCallback((quizId) => {
    const attempt = attempts.find((a) => a.quizId === quizId);
    if (attempt) {
      setSelectedAttempt(attempt);
      setShowResultModal(true);
    }
  }, [attempts]);

  const handleViewDetails = useCallback((quizId) => {
    router.push(`/quizzes/${quizId}/results`);
  }, [router]);

  const handleViewReport = useCallback((quizId) => {
    setSelectedQuizForReport(quizId);
    setShowReportModal(true);
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1,
    }));
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setFilters((prev) => ({
      ...prev,
      page: newPage,
    }));
  }, []);

  return (
    <div className={`mb-8 ${className}`}>
      <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-6">
        Attempted Quizzes
      </h2>
      <QuizGrid
        quizzes={quizzesFromAttempts}
        isLoading={isLoading}
        onFilterChange={handleFilterChange}
        onPaginate={handlePageChange}
        pagination={pagination}
        role="student"
        filters={filters}
        actionHandlers={{
          onView: handleViewResults,
          onViewDetails: handleViewDetails,
          onViewReport: handleViewReport,
        }}
        context="student-view"
      />

      {/* Result Modal */}
      {showResultModal && selectedAttempt && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-whiteColor dark:bg-darkdeep3-dark rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <button
                onClick={() => {
                  setShowResultModal(false);
                  setSelectedAttempt(null);
                }}
                className="float-right text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
              <ResultDisplay
                attempt={{
                  marksObtained: selectedAttempt.marksObtained,
                  percentageScore: selectedAttempt.percentageScore,
                  isPassed: selectedAttempt.isPassed,
                  timeTakenSeconds: selectedAttempt.timeTakenSeconds,
                  submittedAt: selectedAttempt.submittedAt,
                  attemptNumber: 1, // TODO: Get actual attempt number
                  answers: [], // TODO: Fetch actual answers
                }}
                quiz={{
                  id: selectedAttempt.quizId,
                  title: selectedAttempt.quizTitle,
                  totalMarks: selectedAttempt.quizTotalMarks,
                  passingMarks: selectedAttempt.quizPassingMarks,
                  questions: [], // TODO: Fetch actual questions
                }}
                showCorrectAnswers={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttemptedQuizzesSection;

