/**
 * Build Full Analytics Payload
 * 
 * Orchestrates all calculation services and returns unified analytics object
 */

import calculateScoreSummary from './calculateScoreSummary.js';
import calculateQuestionDifficulty from './calculateQuestionDifficulty.js';
import calculateAttemptStats from './calculateAttemptStats.js';
import calculateHistoricalTrend from './calculateHistoricalTrend.js';
import calculateCourseWisePerformance from './calculateCourseWisePerformance.js';
import getRecommendations from '@/utils/reports/getRecommendations.js';

/**
 * Build complete analytics payload for a quiz
 * 
 * @param {string} quizId - Quiz ID
 * @param {string} role - User role
 * @param {string} userId - Current user ID
 * @param {Object} filters - Additional filters
 * @returns {Promise<Object>} Complete analytics payload
 */
export async function buildFullAnalyticsPayload(quizId, role, userId, filters = {}) {
  try {
    // Determine filters based on role
    const calculationFilters = {
      studentId: role === 'student' ? userId : filters.studentId,
      orgId: role === 'admin' ? (filters.orgId || userId) : filters.orgId,
    };

    // Run all calculations in parallel for better performance
    const [
      scoreSummary,
      questionDifficulty,
      attemptStats,
      historicalTrend,
      courseWisePerformance,
    ] = await Promise.all([
      calculateScoreSummary(quizId, role, calculationFilters),
      calculateQuestionDifficulty(quizId, calculationFilters),
      calculateAttemptStats(quizId, role, calculationFilters),
      calculateHistoricalTrend(quizId, calculationFilters.studentId, calculationFilters),
      // Only calculate course-wise for admin/superadmin
      (role === 'admin' || role === 'superadmin')
        ? calculateCourseWisePerformance(quizId, calculationFilters.orgId)
        : Promise.resolve([]),
    ]);

    // Build recommendations based on analytics
    const recommendations = getRecommendations({
      scoreSummary,
      questionDifficulty,
      attemptStats,
      historicalTrend,
    });

    // Build unified analytics payload
    const analytics = {
      scoreSummary,
      questionBreakdown: questionDifficulty,
      timeSpent: {
        avgTimePerAttempt: attemptStats.avgTimeTaken,
        minTimePerAttempt: attemptStats.minTimeTaken,
        maxTimePerAttempt: attemptStats.maxTimeTaken,
        medianTimePerAttempt: attemptStats.medianTimeTaken,
        avgTimePerQuestion: questionDifficulty.questions.length > 0
          ? questionDifficulty.questions.reduce((sum, q) => sum + (q.avgTimePerQuestion || 0), 0) / questionDifficulty.questions.length
          : null,
      },
      attemptStats,
      historicalTrend,
      courseWisePerformance: role === 'admin' || role === 'superadmin' ? courseWisePerformance : null,
      recommendations,
    };

    return analytics;
  } catch (error) {
    console.error('Error building analytics payload:', error);
    
    // Handle specific calculation errors
    if (error.message?.includes('quiz not found')) {
      throw new Error('Quiz not found');
    }

    if (error.message?.includes('permission')) {
      throw new Error('Permission denied');
    }

    // Re-throw with a more user-friendly message
    throw new Error(`Failed to build analytics: ${error.message || 'Unknown error'}`);
  }
}

export default buildFullAnalyticsPayload;

