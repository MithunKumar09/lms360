/**
 * Assignment Auto-Grading Utility
 * 
 * Automatically grades assignment submissions.
 * Note: For vendor assignments, only auto-gradable question types are supported.
 * File-based assignments may require different grading logic.
 * 
 * @module lib/grading/assignmentGrader
 */

import { query, getClient } from '../db/index.js';
import { calculateMarks, gradeQuizAttempt } from './autoGrader.js';

/**
 * Auto-grade an assignment submission
 * @param {string} submissionId - Assignment submission UUID
 * @returns {Promise<Object>} Grading result
 */
export async function autoGradeAssignment(submissionId) {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Fetch submission with assignment details
    const submissionQuery = `
      SELECT 
        asub.id,
        asub.assignment_id,
        asub.student_id,
        asub.status,
        a.id as assignment_id,
        a.max_marks,
        a.passing_marks,
        a.course_id,
        a.created_by
      FROM assignment_submissions asub
      INNER JOIN assignments a ON asub.assignment_id = a.id
      WHERE asub.id = $1
    `;
    const submissionResult = await client.query(submissionQuery, [submissionId]);

    if (submissionResult.rows.length === 0) {
      throw new Error('Assignment submission not found');
    }

    const submission = submissionResult.rows[0];

    if (submission.status !== 'submitted') {
      throw new Error('Assignment submission must be submitted before grading');
    }

    // Check if assignment has questions (for auto-grading)
    // If assignment is question-based, grade it like a quiz
    const questionsQuery = `
      SELECT 
        aq.id,
        aq.question_type,
        aq.question_text,
        aq.marks,
        aq.order_index
      FROM assignment_questions aq
      WHERE aq.assignment_id = $1
      ORDER BY aq.order_index ASC
    `;
    const questionsResult = await client.query(questionsQuery, [submission.assignment_id]);
    const questions = questionsResult.rows;

    // If assignment has questions, grade them
    if (questions.length > 0) {
      // Fetch question options
      const optionsQuery = `
        SELECT 
          aqo.id,
          aqo.question_id,
          aqo.option_text,
          aqo.is_correct,
          aqo.order_index
        FROM assignment_question_options aqo
        WHERE aqo.question_id = ANY($1)
        ORDER BY aqo.question_id, aqo.order_index ASC
      `;
      const questionIds = questions.map(q => q.id);
      const optionsResult = await query(optionsQuery, [questionIds]);

      // Group options by question
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
          correctAnswer = options.filter(opt => opt.is_correct).map(opt => opt.id);
        } else if (question.question_type === 'true_false') {
          const correctOption = options.find(opt => opt.is_correct);
          correctAnswer = correctOption ? correctOption.option_text.toLowerCase() === 'true' : null;
        }

        return {
          id: question.id,
          type: question.question_type,
          questionType: question.question_type,
          marks: parseFloat(question.marks || 1),
          maxMarks: parseFloat(question.marks || 1),
          correctAnswer,
          options,
        };
      });

      // Fetch student answers
      const answersQuery = `
        SELECT 
          asa.id,
          asa.question_id,
          asa.answer_text,
          asa.selected_option_ids
        FROM assignment_submission_answers asa
        WHERE asa.submission_id = $1
      `;
      const answersResult = await client.query(answersQuery, [submissionId]);
      const studentAnswers = answersResult.rows.map(row => ({
        questionId: row.question_id,
        answer: row.selected_option_ids || row.answer_text || null,
      }));

      // Grade the assignment
      const gradingResult = gradeQuizAttempt(studentAnswers, questionsWithAnswers);

      // Calculate if passed
      const passingMarks = parseFloat(submission.passing_marks || 50);
      const isPassed = gradingResult.marksObtained >= passingMarks;

      // Update submission with grades
      const updateSubmissionQuery = `
        UPDATE assignment_submissions
        SET 
          marks_obtained = $1,
          status = 'graded',
          graded_by = NULL,
          graded_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      await client.query(updateSubmissionQuery, [
        gradingResult.marksObtained,
        submissionId,
      ]);

      // Update individual question answers with grades
      for (const gradedQuestion of gradingResult.gradedQuestions) {
        const updateAnswerQuery = `
          UPDATE assignment_submission_answers
          SET 
            is_correct = $1,
            marks_obtained = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE submission_id = $3 AND question_id = $4
        `;
        await client.query(updateAnswerQuery, [
          gradedQuestion.isCorrect,
          gradedQuestion.marksObtained,
          submissionId,
          gradedQuestion.questionId,
        ]);
      }

      await client.query('COMMIT');

      return {
        success: true,
        submissionId,
        marksObtained: gradingResult.marksObtained,
        totalMarks: gradingResult.totalMarks,
        percentage: gradingResult.percentage,
        isPassed,
        gradedQuestions: gradingResult.gradedQuestions,
      };
    } else {
      // File-based assignment - cannot auto-grade
      // Return default result (no auto-grading for file submissions)
      await client.query('ROLLBACK');
      return {
        success: false,
        error: 'Assignment does not have questions. File-based assignments cannot be auto-graded.',
        submissionId,
      };
    }
  } catch (error) {
    await client.query('ROLLBACK');
    
    // If error is about missing table (assignment_questions doesn't exist), that's expected
    if (error.message.includes('does not exist') || error.message.includes('relation')) {
      return {
        success: false,
        error: 'Assignment questions table not found. File-based assignments cannot be auto-graded.',
        submissionId,
      };
    }
    
    throw error;
  } finally {
    client.release();
  }
}
