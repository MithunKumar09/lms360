/**
 * Format Analytics Data
 * 
 * Formats raw analytics data for chart consumption
 */

/**
 * Format score distribution for pie chart
 * 
 * @param {Array} distribution - Distribution buckets from calculateScoreSummary
 * @returns {Object} Chart.js formatted data
 */
export function formatScoreDistribution(distribution) {
  if (!distribution || distribution.length === 0) {
    return {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
      }],
    };
  }

  const labels = distribution.map(d => d.range);
  const data = distribution.map(d => d.count);
  
  // Color palette for score ranges (green for high, red for low)
  const colors = [
    'rgba(34, 197, 94, 0.8)',   // 90-100: Green
    'rgba(74, 222, 128, 0.8)',  // 80-89: Light green
    'rgba(163, 230, 53, 0.8)',  // 70-79: Yellow-green
    'rgba(234, 179, 8, 0.8)',   // 60-69: Yellow
    'rgba(251, 146, 60, 0.8)',  // 50-59: Orange
    'rgba(249, 115, 22, 0.8)',  // 40-49: Dark orange
    'rgba(239, 68, 68, 0.8)',   // 30-39: Red
    'rgba(220, 38, 38, 0.8)',   // 20-29: Dark red
    'rgba(185, 28, 28, 0.8)',   // 10-19: Very dark red
    'rgba(127, 29, 29, 0.8)',   // 0-9: Darkest red
  ];

  return {
    labels,
    datasets: [{
      label: 'Score Distribution',
      data,
      backgroundColor: colors.slice(0, labels.length),
      borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
      borderWidth: 2,
    }],
  };
}

/**
 * Format question difficulty for bar chart
 * 
 * @param {Object} questionBreakdown - Question breakdown from calculateQuestionDifficulty
 * @returns {Object} Chart.js formatted data
 */
export function formatQuestionDifficulty(questionBreakdown) {
  if (!questionBreakdown || !questionBreakdown.questions || questionBreakdown.questions.length === 0) {
    return {
      labels: [],
      datasets: [{
        data: [],
        backgroundColor: [],
      }],
    };
  }

  const questions = questionBreakdown.questions;
  const labels = questions.map((q, index) => `Q${q.orderIndex || index + 1}`);
  const data = questions.map(q => q.correctnessPercentage);
  
  // Color based on difficulty
  const backgroundColor = questions.map(q => {
    if (q.difficulty === 'easy') return 'rgba(34, 197, 94, 0.8)';
    if (q.difficulty === 'hard') return 'rgba(239, 68, 68, 0.8)';
    return 'rgba(234, 179, 8, 0.8)'; // medium
  });

  return {
    labels,
    datasets: [{
      label: 'Correctness Percentage',
      data,
      backgroundColor,
      borderColor: backgroundColor.map(c => c.replace('0.8', '1')),
      borderWidth: 2,
    }],
  };
}

/**
 * Format historical trend for line chart
 * 
 * @param {Object} historicalTrend - Historical trend from calculateHistoricalTrend
 * @returns {Object} Chart.js formatted data
 */
export function formatHistoricalTrend(historicalTrend) {
  if (!historicalTrend || !historicalTrend.trendByDate || historicalTrend.trendByDate.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const trendData = historicalTrend.trendByDate;
  const labels = trendData.map(t => new Date(t.date).toLocaleDateString());
  const scores = trendData.map(t => t.averageScore || 0);
  const attemptCounts = trendData.map(t => t.count);

  return {
    labels,
    datasets: [
      {
        label: 'Average Score (%)',
        data: scores,
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
        yAxisID: 'y',
      },
      {
        label: 'Attempts',
        data: attemptCounts,
        borderColor: 'rgba(168, 85, 247, 1)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
        fill: false,
        yAxisID: 'y1',
      },
    ],
  };
}

/**
 * Format course-wise performance for bar chart
 * 
 * @param {Array} courseWisePerformance - Course breakdown from calculateCourseWisePerformance
 * @returns {Object} Chart.js formatted data
 */
export function formatCourseWisePerformance(courseWisePerformance) {
  if (!courseWisePerformance || courseWisePerformance.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const labels = courseWisePerformance.map(c => c.courseTitle);
  const averageScores = courseWisePerformance.map(c => c.averageScore || 0);
  const passRates = courseWisePerformance.map(c => c.passRate || 0);

  return {
    labels,
    datasets: [
      {
        label: 'Average Score (%)',
        data: averageScores,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        yAxisID: 'y',
      },
      {
        label: 'Pass Rate (%)',
        data: passRates,
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
        yAxisID: 'y1',
      },
    ],
  };
}

/**
 * Format time spent data for bar chart
 * 
 * @param {Object} questionBreakdown - Question breakdown
 * @returns {Object} Chart.js formatted data
 */
export function formatTimeSpent(questionBreakdown) {
  if (!questionBreakdown || !questionBreakdown.questions || questionBreakdown.questions.length === 0) {
    return {
      labels: [],
      datasets: [],
    };
  }

  const questions = questionBreakdown.questions.filter(q => q.avgTimePerQuestion !== null);
  const labels = questions.map((q, index) => `Q${q.orderIndex || index + 1}`);
  const data = questions.map(q => q.avgTimePerQuestion);

  return {
    labels,
    datasets: [{
      label: 'Average Time (seconds)',
      data,
      backgroundColor: 'rgba(168, 85, 247, 0.8)',
      borderColor: 'rgba(168, 85, 247, 1)',
      borderWidth: 2,
    }],
  };
}

export default {
  formatScoreDistribution,
  formatQuestionDifficulty,
  formatHistoricalTrend,
  formatCourseWisePerformance,
  formatTimeSpent,
};

