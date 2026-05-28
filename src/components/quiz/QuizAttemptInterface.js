/**
 * QuizAttemptInterface Component
 * 
 * Full-screen quiz-taking interface with timer, navigation, and auto-save
 * Supports both full-page and fullscreen-modal modes
 */

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiX, FiChevronLeft, FiChevronRight, FiCheckCircle, FiCircle, FiStar } from 'react-icons/fi';
import PrimaryButton from './buttons/PrimaryButton.js';
import OutlineButton from './buttons/OutlineButton.js';
import IconButton from './buttons/IconButton.js';

const QuizAttemptInterface = ({
  quiz,
  attemptId = null,
  mode = 'full-page', // 'full-page' | 'fullscreen-modal'
  onClose,
  onSubmit,
  onSaveProgress,
  className = '',
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState(new Set());
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const autoSaveTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  const questions = quiz?.questions || [];
  const timeLimitMinutes = quiz?.timeLimitMinutes;
  const totalQuestions = questions.length;

  // Initialize timer
  useEffect(() => {
    if (timeLimitMinutes && mode === 'full-page') {
      const totalSeconds = timeLimitMinutes * 60;
      setTimeRemaining(totalSeconds);

      countdownTimerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (countdownTimerRef.current) {
          clearInterval(autoSaveTimerRef.current);
          clearInterval(countdownTimerRef.current);
        }
      };
    }
  }, [timeLimitMinutes, mode]);

  // Load saved progress from localStorage
  useEffect(() => {
    if (attemptId) {
      const saved = localStorage.getItem(`quiz_attempt_${attemptId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAnswers(parsed.answers || {});
          setMarkedForReview(new Set(parsed.markedForReview || []));
          setCurrentQuestionIndex(parsed.currentQuestionIndex || 0);
        } catch (e) {
          console.error('Failed to load saved progress:', e);
        }
      }
    }
  }, [attemptId]);

  // Auto-save to localStorage
  useEffect(() => {
    if (attemptId && onSaveProgress) {
      autoSaveTimerRef.current = setInterval(() => {
        const progress = {
          answers,
          markedForReview: Array.from(markedForReview),
          currentQuestionIndex,
          timestamp: Date.now(),
        };
        localStorage.setItem(`quiz_attempt_${attemptId}`, JSON.stringify(progress));
        if (onSaveProgress) {
          onSaveProgress(progress);
        }
      }, 30000); // Auto-save every 30 seconds

      return () => {
        if (autoSaveTimerRef.current) {
          clearInterval(autoSaveTimerRef.current);
        }
      };
    }
  }, [attemptId, answers, markedForReview, currentQuestionIndex, onSaveProgress]);

  // Format time remaining
  const formatTime = (seconds) => {
    if (!seconds) return 'Unlimited';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle answer change
  const handleAnswerChange = useCallback((questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  // Toggle mark for review
  const toggleMarkForReview = useCallback((questionId) => {
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }, []);

  // Navigate to question
  const goToQuestion = useCallback((index) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentQuestionIndex(index);
    }
  }, [totalQuestions]);

  // Previous question
  const prevQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  }, [currentQuestionIndex]);

  // Next question
  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  }, [currentQuestionIndex, totalQuestions]);

  // Get question status
  const getQuestionStatus = useCallback(
    (questionId, index) => {
      const isAnswered = answers[questionId] !== undefined && answers[questionId] !== '';
      const isMarked = markedForReview.has(questionId);
      const isCurrent = index === currentQuestionIndex;

      if (isCurrent) return 'current';
      if (isAnswered && isMarked) return 'answered-marked';
      if (isAnswered) return 'answered';
      if (isMarked) return 'marked';
      return 'unanswered';
    },
    [answers, markedForReview, currentQuestionIndex]
  );

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (window.confirm('Are you sure you want to submit this quiz? You cannot change your answers after submission.')) {
      setIsSubmitting(true);
      if (onSubmit) {
        onSubmit({
          attemptId,
          answers,
          timeTaken: timeLimitMinutes ? timeLimitMinutes * 60 - timeRemaining : null,
        });
      }
    }
  }, [attemptId, answers, timeRemaining, timeLimitMinutes, onSubmit]);

  // Auto-submit on time up
  const handleAutoSubmit = useCallback(() => {
    if (onSubmit) {
      onSubmit({
        attemptId,
        answers,
        timeTaken: timeLimitMinutes * 60,
      });
    }
  }, [attemptId, answers, timeLimitMinutes, onSubmit]);

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    return <div>No questions available</div>;
  }

  const questionStatus = getQuestionStatus(currentQuestion.id, currentQuestionIndex);
  const isAnswered = answers[currentQuestion.id] !== undefined && answers[currentQuestion.id] !== '';

  return (
    <div
      className={`
        ${mode === 'fullscreen-modal' ? 'fixed inset-0 z-50 bg-whiteColor dark:bg-whiteColor-dark' : ''}
        flex flex-col h-full
        ${className}
      `}
    >
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-10 bg-whiteColor dark:bg-whiteColor-dark border-b border-borderColor dark:border-borderColor-dark shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {mode === 'fullscreen-modal' && onClose && (
              <IconButton
                icon={FiX}
                onClick={onClose}
                variant="secondary"
                size="md"
                ariaLabel="Close"
              />
            )}
            <h2 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark">
              {quiz?.title || 'Quiz'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {timeRemaining !== null && (
              <div
                className={`px-4 py-2 rounded-lg font-mono font-semibold ${
                  timeRemaining < 300
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                }`}
              >
                {formatTime(timeRemaining)}
              </div>
            )}
            <div className="text-sm text-contentColor dark:text-contentColor-dark">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </div>
            <PrimaryButton onClick={handleSubmit} disabled={isSubmitting} size="sm">
              {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
            </PrimaryButton>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Panel */}
        <div
          className={`
            ${isSidebarOpen ? 'w-64' : 'w-0'}
            border-r border-borderColor dark:border-borderColor-dark
            bg-gray-50 dark:bg-gray-900
            transition-all duration-300
            overflow-y-auto
            ${mode === 'fullscreen-modal' ? 'hidden md:block' : ''}
          `}
        >
          <div className="p-4">
            <h3 className="text-sm font-semibold text-blackColor dark:text-blackColor-dark mb-3">
              Questions
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, index) => {
                const status = getQuestionStatus(q.id, index);
                const statusClasses = {
                  current: 'bg-primaryColor text-whiteColor border-2 border-primaryColor',
                  'answered-marked': 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400 dark:bg-yellow-900/20 dark:text-yellow-400',
                  answered: 'bg-green-100 text-green-700 border-2 border-green-400 dark:bg-green-900/20 dark:text-green-400',
                  marked: 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400',
                  unanswered: 'bg-gray-200 text-gray-600 border-2 border-gray-300 dark:bg-gray-700 dark:text-gray-400',
                };

                return (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(index)}
                    className={`
                      w-10 h-10 rounded-lg font-semibold text-sm
                      flex items-center justify-center
                      transition-all duration-200
                      hover:scale-110
                      ${statusClasses[status]}
                    `}
                    title={`Question ${index + 1}: ${status}`}
                  >
                    {status === 'answered-marked' || status === 'marked' ? (
                      <FiStar className="w-5 h-5" />
                    ) : status === 'answered' ? (
                      <FiCheckCircle className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {/* Question Text */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-2xl font-semibold text-blackColor dark:text-blackColor-dark">
                  Question {currentQuestionIndex + 1}
                </h3>
                <button
                  onClick={() => toggleMarkForReview(currentQuestion.id)}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-semibold
                    flex items-center gap-2
                    transition-colors
                    ${
                      markedForReview.has(currentQuestion.id)
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <FiStar className={`w-4 h-4 ${markedForReview.has(currentQuestion.id) ? 'fill-current' : ''}`} />
                  {markedForReview.has(currentQuestion.id) ? 'Marked for Review' : 'Mark for Review'}
                </button>
              </div>
              <p className="text-lg text-contentColor dark:text-contentColor-dark">
                {currentQuestion.questionText}
              </p>
              {currentQuestion.marks && (
                <p className="text-sm text-contentColor dark:text-contentColor-dark mt-2">
                  Marks: {currentQuestion.marks}
                </p>
              )}
            </div>

            {/* Answer Options */}
            <div className="space-y-3 mb-6">
              {currentQuestion.questionType === 'multiple_choice' && (
                <div className="space-y-2">
                  {currentQuestion.options?.map((option) => (
                    <label
                      key={option.id}
                      className={`
                        flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer
                        transition-all duration-200
                        ${
                          answers[currentQuestion.id] === option.id
                            ? 'border-primaryColor bg-primaryColor/10 dark:bg-primaryColor/20'
                            : 'border-borderColor dark:border-borderColor-dark hover:border-primaryColor/50'
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name={`question_${currentQuestion.id}`}
                        value={option.id}
                        checked={answers[currentQuestion.id] === option.id}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        className="w-5 h-5 text-primaryColor"
                      />
                      <span className="flex-1 text-contentColor dark:text-contentColor-dark">
                        {option.optionText}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.questionType === 'true_false' && (
                <div className="grid grid-cols-2 gap-4">
                  {['True', 'False'].map((value) => (
                    <button
                      key={value}
                      onClick={() => handleAnswerChange(currentQuestion.id, value.toLowerCase())}
                      className={`
                        px-6 py-4 rounded-lg border-2 font-semibold
                        transition-all duration-200
                        ${
                          answers[currentQuestion.id] === value.toLowerCase()
                            ? 'border-primaryColor bg-primaryColor text-whiteColor'
                            : 'border-borderColor dark:border-borderColor-dark text-contentColor dark:text-contentColor-dark hover:border-primaryColor/50'
                        }
                      `}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.questionType === 'short_answer' && (
                <input
                  type="text"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="w-full px-4 py-3 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
                  placeholder="Enter your answer..."
                />
              )}

              {currentQuestion.questionType === 'essay' && (
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 border border-borderColor dark:border-borderColor-dark rounded-lg bg-whiteColor dark:bg-whiteColor-dark text-blackColor dark:text-blackColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor resize-none"
                  placeholder="Enter your answer..."
                />
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-borderColor dark:border-borderColor-dark">
              <OutlineButton
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                variant="primary"
                icon={FiChevronLeft}
              >
                Previous
              </OutlineButton>
              <OutlineButton
                onClick={nextQuestion}
                disabled={currentQuestionIndex === totalQuestions - 1}
                variant="primary"
              >
                <span className="flex items-center gap-2">
                  Next
                  <FiChevronRight className="w-4 h-4" />
                </span>
              </OutlineButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizAttemptInterface;

