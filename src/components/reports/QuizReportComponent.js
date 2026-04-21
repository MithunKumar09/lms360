"use client";

import React from 'react';
import { FiDownload, FiPrinter, FiEye, FiTrendingUp, FiUsers, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import ScoreDistributionPieChart from './charts/ScoreDistributionPieChart';
import QuestionDifficultyBarChart from './charts/QuestionDifficultyBarChart';
import HistoricalTrendLineChart from './charts/HistoricalTrendLineChart';
import CourseWiseBarChart from './charts/CourseWiseBarChart';
import TimeSpentBarChart from './charts/TimeSpentBarChart';
import PrimaryButton from '@/components/quiz/buttons/PrimaryButton';
import SecondaryButton from '@/components/quiz/buttons/SecondaryButton';
import { useQuizReport, useGeneratePDFReport } from '@/hooks/api/useQuizReport';
import QuizLoadingSpinner from '@/components/quiz/states/QuizLoadingSpinner';
import QuizListEmptyState from '@/components/quiz/states/QuizListEmptyState';

const QuizReportComponent = ({ 
  quizId, 
  reportType = null, 
  role = null,
  analytics: providedAnalytics = null,
  onViewPreview,
  className = '' 
}) => {
  const user = useAuthStore((state) => state.user);
  const finalReportType = reportType || user?.role;
  const finalRole = role || user?.role;

  const { data, isLoading, error } = useQuizReport(quizId, finalReportType, {
    enabled: !providedAnalytics, // Don't fetch if analytics are provided
  });
  const generatePDFMutation = useGeneratePDFReport();

  // Use provided analytics if available, otherwise use fetched data
  const analytics = providedAnalytics || data?.analytics;
  const quiz = data?.quiz;

  const handleDownloadPDF = () => {
    generatePDFMutation.mutate({
      quizId,
      reportType: finalReportType,
      includeCharts: true,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <QuizLoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    // Handle specific error types
    const errorMessage = error.message || 'Unknown error';
    const isPermissionError = errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('access');
    const isNotFoundError = errorMessage.toLowerCase().includes('not found');
    
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className={`mb-4 ${isPermissionError ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-500 dark:text-red-400'}`}>
          {isPermissionError 
            ? 'You do not have permission to view this report.'
            : isNotFoundError
            ? 'Quiz not found.'
            : `Error loading report: ${errorMessage}`}
        </p>
        {!isPermissionError && (
          <SecondaryButton onClick={() => window.location.reload()}>
            Retry
          </SecondaryButton>
        )}
      </div>
    );
  }

  if (!analytics) {
    return (
      <QuizListEmptyState
        message="No report data available for this quiz."
        className={className}
      />
    );
  }

  // Handle empty state (no attempts)
  if (data?.isEmpty || (analytics.scoreSummary?.totalAttempts === 0)) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          No attempts found for this quiz. Report data will be available once students start taking the quiz.
        </p>
      </div>
    );
  }

  const { scoreSummary, questionBreakdown, attemptStats, historicalTrend, courseWisePerformance, recommendations } = analytics;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        {onViewPreview && (
          <SecondaryButton
            onClick={() => onViewPreview(quizId, finalReportType, analytics)}
            icon={FiEye}
          >
            View Full Report
          </SecondaryButton>
        )}
        <SecondaryButton
          onClick={handlePrint}
          icon={FiPrinter}
        >
          Print Report
        </SecondaryButton>
        <PrimaryButton
          onClick={handleDownloadPDF}
          icon={FiDownload}
          loading={generatePDFMutation.isPending}
        >
          Download PDF
        </PrimaryButton>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-whiteColor dark:bg-darkdeep3-dark rounded-lg shadow-lg p-6 border border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Total Attempts
            </h3>
            <FiUsers className="text-primaryColor w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {scoreSummary?.totalAttempts || 0}
          </p>
        </div>

        <div className="bg-whiteColor dark:bg-darkdeep3-dark rounded-lg shadow-lg p-6 border border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Average Score
            </h3>
            <FiTrendingUp className="text-blue-500 w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {scoreSummary?.averageScore ? `${scoreSummary.averageScore.toFixed(1)}%` : 'N/A'}
          </p>
        </div>

        <div className="bg-whiteColor dark:bg-darkdeep3-dark rounded-lg shadow-lg p-6 border border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Pass Rate
            </h3>
            <FiCheckCircle className="text-green-500 w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {scoreSummary?.passRate ? `${scoreSummary.passRate.toFixed(1)}%` : '0%'}
          </p>
        </div>

        <div className="bg-whiteColor dark:bg-darkdeep3-dark rounded-lg shadow-lg p-6 border border-borderColor dark:border-borderColor-dark">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-contentColor dark:text-contentColor-dark">
              Highest Score
            </h3>
            <FiTrendingUp className="text-purple-500 w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-blackColor dark:text-blackColor-dark">
            {scoreSummary?.maxScore ? `${scoreSummary.maxScore.toFixed(1)}%` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Score Distribution Chart */}
      {scoreSummary && (
        <div className="bg-whiteColor dark:bg-darkdeep3-dark rounded-lg shadow-lg p-6 border border-borderColor dark:border-borderColor-dark">
          <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">
            Score Distribution
          </h3>
          <ScoreDistributionPieChart data={scoreSummary} />
        </div>
      )}

      {/* Question Difficulty Chart */}
      {questionBreakdown && questionBreakdown.questions && questionBreakdown.questions.length > 0 && (
        <div className="bg-whiteColor dark:bg-darkdeep3-dark rounded-lg shadow-lg p-6 border border-borderColor dark:border-borderColor-dark">
          <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">
            Question Difficulty Analysis
          </h3>
          <QuestionDifficultyBarChart data={questionBreakdown} />
        </div>
      )}

      {/* Historical Performance Trend */}
      {historicalTrend && historicalTrend.trendByDate && historicalTrend.trendByDate.length > 0 && (
        <div className="bg-whiteColor dark:bg-darkdeep3-dark rounded-lg shadow-lg p-6 border border-borderColor dark:border-borderColor-dark">
          <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">
            Historical Performance Trend
          </h3>
          <HistoricalTrendLineChart data={historicalTrend} />
        </div>
      )}

      {/* Course-wise Breakdown (admin/superadmin only) */}
      {finalRole === 'admin' || finalRole === 'superadmin' ? (
        courseWisePerformance && courseWisePerformance.length > 0 && (
          <div className="bg-whiteColor dark:bg-darkdeep3-dark rounded-lg shadow-lg p-6 border border-borderColor dark:border-borderColor-dark">
            <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">
              Course-wise Performance
            </h3>
            <CourseWiseBarChart data={courseWisePerformance} />
          </div>
        )
      ) : null}

      {/* Time Spent per Question (optional) */}
      {questionBreakdown && questionBreakdown.questions && questionBreakdown.questions.some(q => q.avgTimePerQuestion) && (
        <div className="bg-whiteColor dark:bg-darkdeep3-dark rounded-lg shadow-lg p-6 border border-borderColor dark:border-borderColor-dark">
          <h3 className="text-lg font-semibold text-blackColor dark:text-blackColor-dark mb-4">
            Average Time Spent per Question
          </h3>
          <TimeSpentBarChart data={questionBreakdown} />
        </div>
      )}

      {/* Recommendations Section */}
      {recommendations && recommendations.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-lg p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4 flex items-center gap-2">
            <FiTrendingUp className="w-5 h-5" />
            Recommendations
          </h3>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QuizReportComponent;

