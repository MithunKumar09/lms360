/**
 * Calculate Question Difficulty
 * 
 * Calculates question-level statistics including:
 * - Question correctness percentage
 * - Most missed questions
 * - Average time per question
 */

import { query } from '@/lib/db/index.js';

/**
 * Calculate question difficulty and performance metrics
 * 
 * @param {string} quizId - Quiz ID
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Question breakdown array
 */
export async function calculateQuestionDifficulty(quizId, filters = {}) {
  const { studentId, orgId } = filters;

  // Build WHERE conditions
  let whereConditions = ['qa.quiz_id = $1', "qa.status = 'submitted'"];
  const queryParams = [quizId];
  let paramIndex = 2;

  if (studentId) {
    whereConditions.push(`qa.student_id = $${paramIndex}`);
    queryParams.push(studentId);
    paramIndex++;
  }

  const whereClause = whereConditions.join(' AND ');

  // Get question-level statistics
  const questionStatsQuery = `
    SELECT 
      qq.id as question_id,
      qq.question_text,
      qq.question_type,
      qq.marks,
      qq.order_index,
      COUNT(DISTINCT qa.id) as total_attempts,
      COUNT(DISTINCT qaa.id) FILTER (WHERE qaa.is_correct = true) as correct_attempts,
      COUNT(DISTINCT qaa.id) FILTER (WHERE qaa.is_correct = false) as incorrect_attempts,
      AVG(qaa.marks_obtained) FILTER (WHERE qaa.marks_obtained IS NOT NULL) as avg_marks_obtained,
      AVG(
        CASE 
          WHEN qa.time_taken_seconds IS NOT NULL AND qq.order_index IS NOT NULL 
          THEN qa.time_taken_seconds::float / NULLIF((SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = qa.quiz_id), 0)
          ELSE NULL
        END
      ) as avg_time_per_question
    FROM quiz_questions qq
    LEFT JOIN quiz_attempts qa ON qa.quiz_id = qq.quiz_id
    LEFT JOIN quiz_attempt_answers qaa ON qaa.question_id = qq.id AND qaa.attempt_id = qa.id
    WHERE qq.quiz_id = $1
    GROUP BY qq.id, qq.question_text, qq.question_type, qq.marks, qq.order_index
    ORDER BY qq.order_index ASC
  `;

  const questionStatsResult = await query(questionStatsQuery, [quizId]);
  
  const questionBreakdown = questionStatsResult.rows.map(row => {
    const totalAttempts = parseInt(row.total_attempts || 0, 10);
    const correctAttempts = parseInt(row.correct_attempts || 0, 10);
    const incorrectAttempts = parseInt(row.incorrect_attempts || 0, 10);
    const correctnessPercentage = totalAttempts > 0 
      ? (correctAttempts / totalAttempts) * 100 
      : 0;

    // Determine difficulty level
    let difficulty = 'medium';
    if (correctnessPercentage >= 80) {
      difficulty = 'easy';
    } else if (correctnessPercentage < 50) {
      difficulty = 'hard';
    }

    return {
      questionId: row.question_id,
      questionText: row.question_text,
      questionType: row.question_type,
      marks: parseFloat(row.marks || 0),
      orderIndex: parseInt(row.order_index || 0, 10),
      totalAttempts,
      correctAttempts,
      incorrectAttempts,
      correctnessPercentage: parseFloat(correctnessPercentage.toFixed(2)),
      avgMarksObtained: row.avg_marks_obtained ? parseFloat(parseFloat(row.avg_marks_obtained).toFixed(2)) : null,
      avgTimePerQuestion: row.avg_time_per_question ? parseFloat(parseFloat(row.avg_time_per_question).toFixed(2)) : null,
      difficulty,
    };
  });

  // Sort by difficulty (hardest first) for "most missed" identification
  const mostMissed = [...questionBreakdown]
    .sort((a, b) => a.correctnessPercentage - b.correctnessPercentage)
    .slice(0, 5)
    .map(q => ({
      questionId: q.questionId,
      questionText: q.questionText.substring(0, 100) + (q.questionText.length > 100 ? '...' : ''),
      orderIndex: q.orderIndex,
      correctnessPercentage: q.correctnessPercentage,
      difficulty: q.difficulty,
    }));

  return {
    questions: questionBreakdown,
    mostMissed,
    totalQuestions: questionBreakdown.length,
    averageCorrectness: questionBreakdown.length > 0
      ? questionBreakdown.reduce((sum, q) => sum + q.correctnessPercentage, 0) / questionBreakdown.length
      : 0,
  };
}

export default calculateQuestionDifficulty;

