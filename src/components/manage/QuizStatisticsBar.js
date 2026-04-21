"use client";

import React, { useMemo } from 'react';
import { FiFileText, FiEdit, FiCheckCircle, FiTrendingUp, FiBarChart2 } from 'react-icons/fi';

/**
 * QuizStatisticsBar Component
 * 
 * Displays statistics about quizzes in a horizontal bar
 * Calculates stats from quiz list data
 */
const QuizStatisticsBar = ({
  quizzes = [],
  isLoading = false,
  className = '',
}) => {
  // Calculate statistics from quiz list
  const statistics = useMemo(() => {
    if (!quizzes || quizzes.length === 0) {
      return {
        total: 0,
        draft: 0,
        published: 0,
        closed: 0,
        mostAttempted: null,
        averageAttempts: 0,
      };
    }

    const total = quizzes.length;
    const draft = quizzes.filter((q) => q.status === 'draft').length;
    const published = quizzes.filter((q) => q.status === 'published').length;
    const closed = quizzes.filter((q) => q.status === 'closed').length;

    // Calculate most attempted quiz (if attemptCount is available in quiz data)
    // Note: attemptCount might not be in quiz data, so we'll show N/A if not available
    let mostAttempted = null;
    let maxAttempts = 0;
    let totalAttempts = 0;
    let quizzesWithAttempts = 0;

    quizzes.forEach((quiz) => {
      // If quiz has attemptCount property, use it
      const attemptCount = quiz.attemptCount || quiz.attempt_count || 0;
      if (attemptCount > maxAttempts) {
        maxAttempts = attemptCount;
        mostAttempted = quiz.title;
      }
      if (attemptCount > 0) {
        totalAttempts += attemptCount;
        quizzesWithAttempts++;
      }
    });

    const averageAttempts = quizzesWithAttempts > 0 
      ? Math.round((totalAttempts / quizzesWithAttempts) * 10) / 10 
      : 0;

    return {
      total,
      draft,
      published,
      closed,
      mostAttempted: mostAttempted || 'N/A',
      averageAttempts,
    };
  }, [quizzes]);

  if (isLoading) {
    return (
      <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-whiteColor dark:bg-whiteColor-dark rounded-lg shadow p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Quizzes',
      value: statistics.total,
      icon: FiFileText,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Draft',
      value: statistics.draft,
      icon: FiEdit,
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-800',
    },
    {
      label: 'Published',
      value: statistics.published,
      icon: FiCheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Most Attempted',
      value: statistics.mostAttempted,
      icon: FiTrendingUp,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      isText: true,
    },
    {
      label: 'Avg Attempts',
      value: statistics.averageAttempts,
      icon: FiBarChart2,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className={`grid grid-cols-2 md:grid-cols-5 gap-4 ${className}`}>
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`${stat.bgColor} rounded-lg p-4 border border-borderColor dark:border-borderColor-dark`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-sm font-semibold text-contentColor dark:text-contentColor-dark">
                {stat.label}
              </span>
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.isText ? (
                <span className="text-sm truncate block" title={stat.value}>
                  {stat.value}
                </span>
              ) : (
                stat.value.toLocaleString()
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default QuizStatisticsBar;

