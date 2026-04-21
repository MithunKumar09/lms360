/**
 * Get Recommendations
 * 
 * Rules-based recommendation engine that analyzes performance data
 * and returns actionable recommendations
 */

/**
 * Generate recommendations based on analytics data
 * 
 * @param {Object} analytics - Analytics data object
 * @returns {Array<string>} Array of recommendation strings
 */
export function getRecommendations(analytics) {
  const recommendations = [];

  if (!analytics) {
    return ['No data available for recommendations.'];
  }

  const { scoreSummary, questionBreakdown, attemptStats, historicalTrend } = analytics;

  // Score Summary Recommendations
  if (scoreSummary) {
    if (scoreSummary.passRate < 50) {
      recommendations.push('Low pass rate detected. Consider reviewing quiz difficulty or providing additional study materials.');
    }

    if (scoreSummary.averageScore && scoreSummary.averageScore < 60) {
      recommendations.push('Average score is below 60%. Students may need more preparation time or clearer instructions.');
    }

    if (scoreSummary.distribution) {
      const lowScores = scoreSummary.distribution.filter(d => 
        ['0-9', '10-19', '20-29', '30-39'].includes(d.range)
      );
      const lowScoreCount = lowScores.reduce((sum, d) => sum + d.count, 0);
      const totalCount = scoreSummary.distribution.reduce((sum, d) => sum + d.count, 0);
      
      if (totalCount > 0 && (lowScoreCount / totalCount) > 0.3) {
        recommendations.push('High percentage of low scores. Consider offering review sessions or practice quizzes.');
      }
    }
  }

  // Question Difficulty Recommendations
  if (questionBreakdown && questionBreakdown.questions) {
    const hardQuestions = questionBreakdown.questions.filter(q => q.difficulty === 'hard');
    
    if (hardQuestions.length > 0) {
      const hardQuestionNumbers = hardQuestions
        .map(q => q.orderIndex || questionBreakdown.questions.indexOf(q) + 1)
        .sort((a, b) => a - b);
      
      recommendations.push(
        `Questions ${hardQuestionNumbers.join(', ')} are particularly challenging. Consider reviewing these topics or providing additional resources.`
      );
    }

    if (questionBreakdown.mostMissed && questionBreakdown.mostMissed.length > 0) {
      const topMissed = questionBreakdown.mostMissed[0];
      recommendations.push(
        `Question ${topMissed.orderIndex} has the lowest correctness rate (${topMissed.correctnessPercentage.toFixed(1)}%). Focus on this topic in future lessons.`
      );
    }
  }

  // Attempt Statistics Recommendations
  if (attemptStats) {
    if (attemptStats.completionRate < 70) {
      recommendations.push('Low completion rate. Consider adjusting time limits or breaking the quiz into smaller sections.');
    }

    if (attemptStats.timeoutAttempts > 0 && attemptStats.timeoutAttempts / attemptStats.totalAttempts > 0.2) {
      recommendations.push('High timeout rate detected. Consider increasing time limits or simplifying questions.');
    }

    if (attemptStats.avgTimeTaken) {
      // Compare average time with expected time (if available)
      // This is a placeholder - in real implementation, compare with quiz time_limit_minutes
      recommendations.push(
        `Average completion time: ${Math.round(attemptStats.avgTimeTaken / 60)} minutes. Monitor if students need more time.`
      );
    }
  }

  // Historical Trend Recommendations
  if (historicalTrend && historicalTrend.metrics) {
    const { trendDirection, improvementRate } = historicalTrend.metrics;

    if (trendDirection === 'improving' && improvementRate) {
      recommendations.push(
        `Positive trend detected! Performance has improved by ${improvementRate.toFixed(1)}%. Keep up the good work!`
      );
    } else if (trendDirection === 'declining' && improvementRate) {
      recommendations.push(
        `Performance trend is declining (${Math.abs(improvementRate).toFixed(1)}% decrease). Consider additional support or review sessions.`
      );
    }
  }

  // Default recommendation if none generated
  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring performance metrics for insights.');
  }

  return recommendations;
}

export default getRecommendations;

