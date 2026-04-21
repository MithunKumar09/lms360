/**
 * ResultDisplay Component
 * 
 * Post-attempt summary component with score, pie chart placeholder, and question review
 * Standalone component ready for Phase 4 integration
 */

'use client';

import React, { useState } from 'react';
import { FiCheckCircle, FiXCircle, FiClock, FiFileText, FiChevronDown, FiChevronUp, FiDownload, FiEye } from 'react-icons/fi';
import QuizStatusBadge from './badges/QuizStatusBadge.js';
import PrimaryButton from './buttons/PrimaryButton.js';
import SecondaryButton from './buttons/SecondaryButton.js';
import QuizReportPreviewModal from '@/components/reports/QuizReportPreviewModal';
import { useGeneratePDFReport } from '@/hooks/api/useQuizReport';

const ResultDisplay = ({
  attempt,
  quiz,
  showCorrectAnswers = false,
  showExplanations = false,
  onReviewQuestion,
  className = '',
}) => {
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const generatePDFMutation = useGeneratePDFReport();

  const {
    marksObtained = 0,
    totalMarks = 0,
    percentageScore = 0,
    isPassed = false,
    timeTakenSeconds = 0,
    attemptNumber = 1,
    submittedAt,
    answers = {},
  } = attempt || {};

  const { questions = [], totalMarks: quizTotalMarks = 100, passingMarks = 50 } = quiz || {};

  // Toggle question expansion
  const toggleQuestion = (questionId) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // Format time taken
  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  // Get question result status
  const getQuestionResult = (question, userAnswer) => {
    if (!showCorrectAnswers) return null;

    if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
      const correctOption = question.options?.find((opt) => opt.isCorrect);
      const isCorrect = userAnswer === correctOption?.id || userAnswer === correctOption?.optionText?.toLowerCase();
      return { isCorrect, correctAnswer: correctOption?.optionText };
    }

    return { isCorrect: null, correctAnswer: null };
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Score Summary Card */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
              Quiz Results
            </h2>
            <div className="flex items-center gap-4 text-sm text-contentColor dark:text-contentColor-dark">
              <span>Attempt {attemptNumber}</span>
              <span>•</span>
              <span>{formatDate(submittedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <QuizStatusBadge status={isPassed ? 'published' : 'closed'} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {/* Score */}
          <div className="text-center p-4 bg-primaryColor/10 dark:bg-primaryColor/20 rounded-lg">
            <div className="text-3xl font-bold text-primaryColor dark:text-primaryColor mb-1">
              {marksObtained.toFixed(1)} / {totalMarks.toFixed(1)}
            </div>
            <div className="text-sm text-contentColor dark:text-contentColor-dark">Marks Obtained</div>
          </div>

          {/* Percentage */}
          <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 mb-1">
              {percentageScore.toFixed(1)}%
            </div>
            <div className="text-sm text-contentColor dark:text-contentColor-dark">Percentage</div>
          </div>

          {/* Time Taken */}
          <div className="text-center p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <div className="text-3xl font-bold text-green-700 dark:text-green-400 mb-1 flex items-center justify-center gap-2">
              <FiClock className="w-6 h-6" />
              {formatTime(timeTakenSeconds)}
            </div>
            <div className="text-sm text-contentColor dark:text-contentColor-dark">Time Taken</div>
          </div>
        </div>

        {/* Pass/Fail Message */}
        <div
          className={`mt-4 p-4 rounded-lg ${
            isPassed
              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {isPassed ? (
              <>
                <FiCheckCircle className="w-5 h-5" />
                <span>Congratulations! You passed the quiz.</span>
              </>
            ) : (
              <>
                <FiXCircle className="w-5 h-5" />
                <span>You did not pass. Passing marks: {passingMarks}%</span>
              </>
            )}
          </div>
        </div>

        {/* Report Actions */}
        {quiz?.id && (
          <div className="mt-4 flex items-center gap-3">
            <SecondaryButton
              onClick={() => setIsReportModalOpen(true)}
              icon={FiEye}
              size="sm"
            >
              View Report
            </SecondaryButton>
            <PrimaryButton
              onClick={() => {
                generatePDFMutation.mutate({
                  quizId: quiz.id,
                  reportType: 'student',
                  includeCharts: true,
                });
              }}
              icon={FiDownload}
              size="sm"
              loading={generatePDFMutation.isPending}
            >
              Download PDF
            </PrimaryButton>
          </div>
        )}
      </div>

      {/* Pie Chart Placeholder */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">
          Performance Overview
        </h3>
        <div className="h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <div className="text-center">
            <FiFileText className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-contentColor dark:text-contentColor-dark">
              Chart will be implemented in Phase 6
            </p>
          </div>
        </div>
      </div>

      {/* Question Review Navigation */}
      <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">
          Question Review
        </h3>
        <div className="space-y-2">
          {questions.map((question, index) => {
            const userAnswer = answers[question.id];
            const result = getQuestionResult(question, userAnswer);
            const isExpanded = expandedQuestions.has(question.id);

            return (
              <div
                key={question.id}
                className="border border-borderColor dark:border-borderColor-dark rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleQuestion(question.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-blackColor dark:text-blackColor-dark">
                      Q{index + 1}
                    </span>
                    <span className="text-sm text-contentColor dark:text-contentColor-dark line-clamp-1">
                      {question.questionText}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {result && (
                      <div
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          result.isCorrect
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        }`}
                      >
                        {result.isCorrect ? (
                          <FiCheckCircle className="w-4 h-4" />
                        ) : (
                          <FiXCircle className="w-4 h-4" />
                        )}
                      </div>
                    )}
                    {isExpanded ? (
                      <FiChevronUp className="w-5 h-5 text-contentColor dark:text-contentColor-dark" />
                    ) : (
                      <FiChevronDown className="w-5 h-5 text-contentColor dark:text-contentColor-dark" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="p-4 border-t border-borderColor dark:border-borderColor-dark bg-gray-50 dark:bg-gray-900">
                    <div className="space-y-4">
                      {/* Question Text */}
                      <div>
                        <h4 className="font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                          Question:
                        </h4>
                        <p className="text-contentColor dark:text-contentColor-dark">
                          {question.questionText}
                        </p>
                      </div>

                      {/* User's Answer */}
                      <div>
                        <h4 className="font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                          Your Answer:
                        </h4>
                        <p className="text-contentColor dark:text-contentColor-dark">
                          {userAnswer || 'Not answered'}
                        </p>
                      </div>

                      {/* Correct Answer (if allowed) */}
                      {showCorrectAnswers && result && (
                        <div>
                          <h4 className="font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                            Correct Answer:
                          </h4>
                          <p className="text-green-700 dark:text-green-400 font-semibold">
                            {result.correctAnswer}
                          </p>
                        </div>
                      )}

                      {/* Marks */}
                      <div>
                        <span className="text-sm text-contentColor dark:text-contentColor-dark">
                          Marks: {question.marks || 0}
                        </span>
                      </div>

                      {/* Explanation (future-ready) */}
                      {showExplanations && question.explanation && (
                        <div>
                          <h4 className="font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                            Explanation:
                          </h4>
                          <p className="text-contentColor dark:text-contentColor-dark">
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Report Preview Modal */}
      {quiz?.id && (
        <QuizReportPreviewModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          quizId={quiz.id}
          reportType="student"
        />
      )}
    </div>
  );
};

export default ResultDisplay;

