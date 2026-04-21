"use client";

import React from 'react';
import OverallPerformancePieChart from '@/components/student/charts/OverallPerformancePieChart';
import HistoricalPerformanceLineChart from '@/components/student/charts/HistoricalPerformanceLineChart';
import CourseWiseBreakdownChart from '@/components/student/charts/CourseWiseBreakdownChart';
import useStudentQuizStatistics from '@/hooks/api/useStudentQuizStatistics';
import QuizLoadingSpinner from '@/components/quiz/states/QuizLoadingSpinner';

const ReportsSection = ({ className = '' }) => {
  const { data, isLoading, error } = useStudentQuizStatistics();

  if (isLoading) {
    return (
      <div className={`mb-8 ${className}`}>
        <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-6">
          Performance Reports
        </h2>
        <div className="flex items-center justify-center h-64">
          <QuizLoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`mb-8 ${className}`}>
        <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-6">
          Performance Reports
        </h2>
        <div className="text-center py-8 text-red-500">
          Error loading statistics: {error.message}
        </div>
      </div>
    );
  }

  const statistics = data?.statistics;

  if (!statistics) {
    return (
      <div className={`mb-8 ${className}`}>
        <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-6">
          Performance Reports
        </h2>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No statistics available yet. Complete some quizzes to see your performance.
        </div>
      </div>
    );
  }

  return (
    <div className={`mb-8 ${className}`}>
      <h2 className="text-2xl font-bold text-blackColor dark:text-blackColor-dark mb-6">
        Performance Reports
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Overall Performance Pie Chart */}
        <div className="bg-whiteColor dark:bg-darkdeep3-dark shadow-lg rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">
            Overall Performance
          </h3>
          <OverallPerformancePieChart data={statistics.overall} />
        </div>

        {/* Historical Performance Line Chart */}
        <div className="bg-whiteColor dark:bg-darkdeep3-dark shadow-lg rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">
            Historical Performance
          </h3>
          <HistoricalPerformanceLineChart data={statistics.historical} />
        </div>
      </div>

      {/* Course-wise Breakdown */}
      {statistics.courseWise && statistics.courseWise.length > 0 && (
        <div className="bg-whiteColor dark:bg-darkdeep3-dark shadow-lg rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">
            Course-wise Performance
          </h3>
          <CourseWiseBreakdownChart data={statistics.courseWise} />
        </div>
      )}
    </div>
  );
};

export default ReportsSection;

