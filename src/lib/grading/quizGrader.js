/**
 * Quiz Auto-Grading Utility
 * 
 * Automatically grades quiz attempts by comparing student answers with correct answers.
 * 
 * @module lib/grading/quizGrader
 */

import { query, getClient } from '../db/index.js';
import { gradeQuizAttempt } from './autoGrader.js';

/**
 * Auto-grade a quiz attempt
 * @param {string} attemptId - Quiz attempt UUID
 * @returns {Promise<Object>} Grading result
 */
export async function autoGradeQuiz(attemptId) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Fetch quiz attempt with quiz details
    const attemptQuery = `
      SELECT 
        qa.id,
        qa.quiz_id,
        qa.student_id,
        qa.status,
        q.id as quiz_id,
        q.total_marks,
        q.passing_marks,
        q.course_id
      FROM quiz_attempts qa
      INNER JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.id = $1
    `;
    const attemptResult = await client.query(attemptQuery, [attemptId]);

    if (attemptResult.rows.length === 0) {
      throw new Error('Quiz attempt not found');
    }

    const attempt = attemptResult.rows[0];

    if (attempt.status !== 'submitted') {
      throw new Error('Quiz attempt must be submitted before grading');
    }

    // Fetch all questions for the quiz
    const questionsQuery = `
      SELECT 
        qq.id,
        qq.question_type,
        qq.question_text,
        qq.marks,
        qq.order_index
      FROM quiz_questions qq
      WHERE qq.quiz_id = $1
      ORDER BY qq.order_index ASC
    `;
    const questionsResult = await client.query(questionsQuery, [attempt.quiz_id]);
    const questions = questionsResult.rows;

    if (questions.length === 0) {
      throw new Error('Quiz has no questions');
    }

    // Fetch question options (for multiple choice and true/false)
    const optionsQuery = `
      SELECT 
        qo.id,
        qo.question_id,
        qo.option_text,
        qo.is_correct,
        qo.order_index
      FROM quiz_question_options qo
      WHERE qo.question_id = ANY($1)
      ORDER BY qo.question_id, qo.order_index ASC
    `;
    const questionIds = questions.map(q => q.id);
    const optionsResult = await client.query(optionsQuery, [questionIds]);

    // Group options by question ID
    const optionsByQuestion = new Map();
    optionsResult.rows.forEach(option => {
      if (!optionsByQuestion.has(option.question_id)) {
        optionsByQuestion.set(option.question_id, []);
      }
      optionsByQuestion.get(option.question_id).push(option);
    });

    // Prepare questions with correct answers
    const questionsWithAnswers = questions.map(question => {
      const options = optionsByQuestion.get(question.id) || [];
      
      let correctAnswer = null;
      
      if (question.question_type === 'multiple_choice') {
        // Correct answer is array of correct option IDs
        correctAnswer = options.filter(opt => opt.is_correct).map(opt => opt.id);
      } else if (question.question_type === 'true_false') {
        // Correct answer is the boolean value of the correct option
        const correctOption = options.find(opt => opt.is_correct);
        correctAnswer = correctOption ? correctOption.option_text.toLowerCase() === 'true' : null;
      } else {
        // For short_answer, fill_blank, numeric - correct answer might be stored elsewhere
        // For now, we'll need to fetch it from question metadata or a separate table
        // This is a placeholder - actual implementation depends on schema
        correctAnswer = null;
      }

      return {
        id: question.id,
        type: question.question_type,
        questionType: question.question_type,
        marks: parseFloat(question.marks || 1),
        maxMarks: parseFloat(question.marks || 1),
        correctAnswer,
        options, // Include options for reference
      };
    });

    // Fetch student answers
    const answersQuery = `
      SELECT 
        qaa.id,
        qaa.question_id,
        qaa.answer_text,
        qaa.selected_option_ids
      FROM quiz_attempt_answers qaa
      WHERE qaa.attempt_id = $1
    `;
    const answersResult = await client.query(answersQuery, [attemptId]);
    const studentAnswers = answersResult.rows.map(row => ({
      questionId: row.question_id,
      answer: row.selected_option_ids || row.answer_text || null,
    }));

    // Grade the quiz
    const gradingResult = gradeQuizAttempt(studentAnswers, questionsWithAnswers);

    // Calculate if passed
    const passingMarks = parseFloat(attempt.passing_marks || 50);
    const isPassed = gradingResult.marksObtained >= passingMarks;

    // Update quiz attempt with grades
    const updateAttemptQuery = `
      UPDATE quiz_attempts
      SET 
        marks_obtained = $1,
        percentage_score = $2,
        is_passed = $3,
        status = 'submitted',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    const updateResult = await client.query(updateAttemptQuery, [
      gradingResult.marksObtained,
      gradingResult.percentage,
      isPassed,
      attemptId,
    ]);

    // Update individual question answers with grades
    for (const gradedQuestion of gradingResult.gradedQuestions) {
      const updateAnswerQuery = `
        UPDATE quiz_attempt_answers
        SET 
          is_correct = $1,
          marks_obtained = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE attempt_id = $3 AND question_id = $4
      `;
      await client.query(updateAnswerQuery, [
        gradedQuestion.isCorrect,
        gradedQuestion.marksObtained,
        attemptId,
        gradedQuestion.questionId,
      ]);
    }

    await client.query('COMMIT');

    return {
      success: true,
      attemptId,
      marksObtained: gradingResult.marksObtained,
      totalMarks: gradingResult.totalMarks,
      percentage: gradingResult.percentage,
      isPassed,
      gradedQuestions: gradingResult.gradedQuestions,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
