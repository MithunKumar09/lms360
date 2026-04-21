"use client";

import React from 'react';
import { FiX, FiFileText, FiClock, FiCheckCircle } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/client.js';
import QuizStatusBadge from '@/components/quiz/badges/QuizStatusBadge';
import QuizTypeBadge from '@/components/quiz/badges/QuizTypeBadge';

/**
 * QuizPreviewModal Component
 * 
 * Read-only modal showing quiz details, settings, and all questions
 */
const QuizPreviewModal = ({
  isOpen,
  onClose,
  quizId,
}) => {
  // Fetch quiz data with questions
  const { data: quizData, isLoading } = useQuery({
    queryKey: ['quiz', quizId, 'preview'],
    queryFn: async () => {
      const response = await apiClient.get(`/quizzes/${quizId}`);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch quiz');
      }
      return response.quiz;
    },
    enabled: isOpen && !!quizId,
    staleTime: 5 * 60 * 1000,
  });

  if (!isOpen) return null;

  const quiz = quizData || {};
  const questions = quiz.questions || [];

  // Format question type
  const formatQuestionType = (type) => {
    const types = {
      multiple_choice: 'Multiple Choice',
      true_false: 'True/False',
      short_answer: 'Short Answer',
      essay: 'Essay',
    };
    return types[type] || type;
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-whiteColor dark:bg-whiteColor-dark rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-whiteColor dark:bg-whiteColor-dark border-b border-borderColor dark:border-borderColor-dark p-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <FiFileText className="w-6 h-6 text-primaryColor" />
              <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
                Quiz Preview
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <FiX className="w-5 h-5 text-contentColor dark:text-contentColor-dark" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primaryColor"></div>
              </div>
            ) : (
              <>
                {/* Quiz Info */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-2">
                        {quiz.title || 'Untitled Quiz'}
                      </h3>
                      {quiz.description && (
                        <p className="text-contentColor dark:text-contentColor-dark mb-4">
                          {quiz.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <QuizTypeBadge quizType={quiz.quizType || 'main_course'} />
                      <QuizStatusBadge status={quiz.status || 'draft'} />
                    </div>
                  </div>

                  {/* Course/Mini Course Info */}
                  {quiz.courseTitle && (
                    <div className="text-sm">
                      <span className="font-semibold text-blackColor dark:text-blackColor-dark">Course: </span>
                      <span className="text-contentColor dark:text-contentColor-dark">{quiz.courseTitle}</span>
                    </div>
                  )}
                  {quiz.miniCourseTitle && (
                    <div className="text-sm">
                      <span className="font-semibold text-blackColor dark:text-blackColor-dark">Mini Course: </span>
                      <span className="text-contentColor dark:text-contentColor-dark">{quiz.miniCourseTitle}</span>
                    </div>
                  )}
                  {quiz.orgName && (
                    <div className="text-sm">
                      <span className="font-semibold text-blackColor dark:text-blackColor-dark">Organization: </span>
                      <span className="text-contentColor dark:text-contentColor-dark">{quiz.orgName}</span>
                    </div>
                  )}

                  {/* Instructions */}
                  {quiz.instructions && (
                    <div className="mt-4">
                      <h4 className="font-semibold text-blackColor dark:text-blackColor-dark mb-2">Instructions:</h4>
                      <div
                        className="prose dark:prose-invert max-w-none text-contentColor dark:text-contentColor-dark"
                        dangerouslySetInnerHTML={{ __html: quiz.instructions }}
                      />
                    </div>
                  )}
                </div>

                {/* Quiz Settings */}
                <div className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-lg p-6">
                  <h4 className="font-semibold text-blackColor dark:text-blackColor-dark mb-4">Quiz Settings</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-contentColor dark:text-contentColor-dark">Total Marks</div>
                      <div className="font-semibold text-blackColor dark:text-blackColor-dark">{quiz.totalMarks || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-contentColor dark:text-contentColor-dark">Passing Marks</div>
                      <div className="font-semibold text-blackColor dark:text-blackColor-dark">{quiz.passingMarks || 0}</div>
                    </div>
                    <div>
                      <div className="text-sm text-contentColor dark:text-contentColor-dark">Time Limit</div>
                      <div className="font-semibold text-blackColor dark:text-blackColor-dark flex items-center gap-1">
                        <FiClock className="w-4 h-4" />
                        {quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} min` : 'No limit'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-contentColor dark:text-contentColor-dark">Max Attempts</div>
                      <div className="font-semibold text-blackColor dark:text-blackColor-dark">{quiz.maxAttempts || 1}</div>
                    </div>
                  </div>

                  {/* Additional Settings */}
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className={`w-4 h-4 ${quiz.showResultsImmediately ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-contentColor dark:text-contentColor-dark">Show Results Immediately</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className={`w-4 h-4 ${quiz.showCorrectAnswers ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-contentColor dark:text-contentColor-dark">Show Correct Answers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className={`w-4 h-4 ${quiz.randomizeQuestions ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-contentColor dark:text-contentColor-dark">Randomize Questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FiCheckCircle className={`w-4 h-4 ${quiz.randomizeOptions ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-contentColor dark:text-contentColor-dark">Randomize Options</span>
                    </div>
                  </div>
                </div>

                {/* Questions List */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-blackColor dark:text-blackColor-dark text-lg">
                    Questions ({questions.length})
                  </h4>

                  {questions.length === 0 ? (
                    <div className="text-center py-8 text-contentColor dark:text-contentColor-dark">
                      No questions found
                    </div>
                  ) : (
                    questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="bg-whiteColor dark:bg-whiteColor-dark border border-borderColor dark:border-borderColor-dark rounded-lg p-6"
                      >
                        {/* Question Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primaryColor/10 dark:bg-primaryColor/20 flex items-center justify-center font-semibold text-primaryColor">
                              {index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-blackColor dark:text-blackColor-dark">
                                  {formatQuestionType(question.questionType)}
                                </span>
                                <span className="text-sm text-contentColor dark:text-contentColor-dark">
                                  • {question.marks} marks
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Question Text */}
                        <div className="mb-4">
                          <p className="text-blackColor dark:text-blackColor-dark font-medium">
                            {question.questionText}
                          </p>
                        </div>

                        {/* Options (for MCQ and True/False) */}
                        {['multiple_choice', 'true_false'].includes(question.questionType) && question.options && question.options.length > 0 && (
                          <div className="space-y-2">
                            <div className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-2">
                              Options:
                            </div>
                            {question.options.map((option, optIndex) => (
                              <div
                                key={option.id}
                                className={`p-3 rounded-lg border ${
                                  option.isCorrect
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-blackColor dark:text-blackColor-dark">
                                    {String.fromCharCode(65 + optIndex)}.
                                  </span>
                                  <span className="text-blackColor dark:text-blackColor-dark">
                                    {option.optionText}
                                  </span>
                                  {option.isCorrect && (
                                    <span className="ml-auto px-2 py-1 bg-green-500 text-white text-xs rounded">
                                      Correct
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Short Answer / Essay Note */}
                        {['short_answer', 'essay'].includes(question.questionType) && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              This is a {question.questionType === 'short_answer' ? 'short answer' : 'essay'} question. 
                              Students will provide a text response.
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-whiteColor dark:bg-whiteColor-dark border-t border-borderColor dark:border-borderColor-dark p-6 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primaryColor text-whiteColor rounded-lg font-semibold hover:bg-primaryColor/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuizPreviewModal;

