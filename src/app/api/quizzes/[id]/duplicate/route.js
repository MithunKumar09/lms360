/**
 * Quiz Duplication API Route
 * 
 * POST /api/quizzes/:id/duplicate - Duplicate a quiz with all questions and options
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query, getClient } from '@/lib/db/index.js';

/**
 * POST /api/quizzes/:id/duplicate
 * Duplicate a quiz
 * 
 * Body:
 * {
 *   "newTitle": "Copy of Original Title" (optional, defaults to "Copy of {original title}"),
 *   "targetCourseId": UUID (optional, for main_course quizzes),
 *   "targetOrgId": UUID (optional, superadmin only),
 *   "targetQuizType": "main_course" | "mini_course" | "global" (optional, superadmin only)
 * }
 */
export async function POST(request, { params }) {
  const client = await getClient();
  
  try {
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const originalQuizId = params.id;

    const body = await request.json();
    const {
      newTitle = null,
      targetCourseId = null,
      targetOrgId = null,
      targetQuizType = null,
    } = body;

    // Start transaction
    await client.query('BEGIN');

    try {
      // Get original quiz with permission check
      const originalQuizQuery = `
        SELECT 
          q.id,
          q.course_id,
          q.org_id,
          q.created_by,
          q.quiz_type,
          q.mini_course_id,
          q.admin_id,
          q.cohort_ids,
          q.is_roadmap_mandatory,
          q.certificate_enabled,
          q.title,
          q.description,
          q.instructions,
          q.total_marks,
          q.passing_marks,
          q.time_limit_minutes,
          q.max_attempts,
          q.show_results_immediately,
          q.show_correct_answers,
          q.randomize_questions,
          q.randomize_options,
          q.status,
          q.start_date,
          q.end_date
        FROM quizzes q
        WHERE q.id = $1
      `;
      const originalQuizResult = await client.query(originalQuizQuery, [originalQuizId]);

      if (originalQuizResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Quiz not found' },
          { status: 404 }
        );
      }

      const originalQuiz = originalQuizResult.rows[0];

      // Permission check based on role
      if (userRole === 'instructor') {
        // Instructor can only duplicate their own quizzes or quizzes from their courses
        if (originalQuiz.course_id) {
          const courseCheck = await client.query(
            `SELECT created_by FROM courses WHERE id = $1`,
            [originalQuiz.course_id]
          );
          if (courseCheck.rows.length === 0 || courseCheck.rows[0].created_by !== userId) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { success: false, error: 'You do not have permission to duplicate this quiz' },
              { status: 403 }
            );
          }
        } else if (originalQuiz.created_by !== userId) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'You do not have permission to duplicate this quiz' },
            { status: 403 }
          );
        }
      } else if (userRole === 'admin') {
        // Admin can only duplicate quizzes from their organization
        if (userOrgId && originalQuiz.org_id !== userOrgId) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'You do not have permission to duplicate this quiz' },
            { status: 403 }
          );
        }
        if (!userOrgId && originalQuiz.org_id !== null && originalQuiz.created_by !== userId) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'You do not have permission to duplicate this quiz' },
            { status: 403 }
          );
        }
      }
      // Superadmin can duplicate any quiz

      // Determine new quiz properties
      const finalTitle = newTitle || `Copy of ${originalQuiz.title}`;
      const finalQuizType = targetQuizType || originalQuiz.quiz_type;
      const finalCourseId = targetCourseId !== null ? targetCourseId : originalQuiz.course_id;
      const finalMiniCourseId = originalQuiz.mini_course_id; // Preserve mini course relationship
      const finalOrgId = targetOrgId !== null ? targetOrgId : originalQuiz.org_id;
      const finalCohortIds = originalQuiz.cohort_ids; // Preserve cohort IDs
      const finalAdminId = originalQuiz.admin_id; // Preserve admin_id for global quizzes

      // Validate target course if provided (for main_course quizzes)
      if (finalQuizType === 'main_course' && finalCourseId) {
        const courseCheck = await client.query(
          `SELECT id, org_id, created_by FROM courses WHERE id = $1`,
          [finalCourseId]
        );
        if (courseCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'Target course not found' },
            { status: 404 }
          );
        }

        // Role-based validation for target course
        if (userRole === 'instructor') {
          if (courseCheck.rows[0].created_by !== userId) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { success: false, error: 'You do not have permission to use this course' },
              { status: 403 }
            );
          }
        } else if (userRole === 'admin' && userOrgId) {
          if (courseCheck.rows[0].org_id !== userOrgId) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { success: false, error: 'Target course does not belong to your organization' },
              { status: 403 }
            );
          }
        }
      }

      // Validate target org if provided (superadmin only)
      if (targetOrgId && userRole === 'superadmin') {
        const orgCheck = await client.query(
          `SELECT id FROM organizations WHERE id = $1`,
          [targetOrgId]
        );
        if (orgCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { success: false, error: 'Target organization not found' },
            { status: 404 }
          );
        }
      }

      // Insert new quiz (status = 'draft', dates = null)
      const insertQuizQuery = `
        INSERT INTO quizzes (
          course_id,
          org_id,
          created_by,
          quiz_type,
          mini_course_id,
          admin_id,
          cohort_ids,
          is_roadmap_mandatory,
          certificate_enabled,
          title,
          description,
          instructions,
          total_marks,
          passing_marks,
          time_limit_minutes,
          max_attempts,
          show_results_immediately,
          show_correct_answers,
          randomize_questions,
          randomize_options,
          status,
          start_date,
          end_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        RETURNING id, created_at, updated_at
      `;
      const newQuizResult = await client.query(insertQuizQuery, [
        finalCourseId,
        finalOrgId,
        userId, // New quiz is created by current user
        finalQuizType,
        finalMiniCourseId,
        finalAdminId,
        finalCohortIds,
        originalQuiz.is_roadmap_mandatory,
        originalQuiz.certificate_enabled,
        finalTitle,
        originalQuiz.description,
        originalQuiz.instructions,
        originalQuiz.total_marks,
        originalQuiz.passing_marks,
        originalQuiz.time_limit_minutes,
        originalQuiz.max_attempts,
        originalQuiz.show_results_immediately,
        originalQuiz.show_correct_answers,
        originalQuiz.randomize_questions,
        originalQuiz.randomize_options,
        'draft', // Always set to draft
        null, // Reset start date
        null, // Reset end date
      ]);

      const newQuizId = newQuizResult.rows[0].id;

      // Get all questions from original quiz
      const questionsQuery = `
        SELECT 
          id,
          question_text,
          question_type,
          marks,
          order_index
        FROM quiz_questions
        WHERE quiz_id = $1
        ORDER BY order_index ASC
      `;
      const questionsResult = await client.query(questionsQuery, [originalQuizId]);

      // Clone questions and their options
      for (const question of questionsResult.rows) {
        // Insert new question
        const insertQuestionQuery = `
          INSERT INTO quiz_questions (
            quiz_id,
            question_text,
            question_type,
            marks,
            order_index
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `;
        const newQuestionResult = await client.query(insertQuestionQuery, [
          newQuizId,
          question.question_text,
          question.question_type,
          question.marks,
          question.order_index,
        ]);

        const newQuestionId = newQuestionResult.rows[0].id;

        // Get options for this question (if multiple_choice or true_false)
        if (['multiple_choice', 'true_false'].includes(question.question_type)) {
          const optionsQuery = `
            SELECT 
              option_text,
              is_correct,
              order_index
            FROM quiz_question_options
            WHERE question_id = $1
            ORDER BY order_index ASC
          `;
          const optionsResult = await client.query(optionsQuery, [question.id]);

          // Insert options
          for (const option of optionsResult.rows) {
            const insertOptionQuery = `
              INSERT INTO quiz_question_options (
                question_id,
                option_text,
                is_correct,
                order_index
              ) VALUES ($1, $2, $3, $4)
            `;
            await client.query(insertOptionQuery, [
              newQuestionId,
              option.option_text,
              option.is_correct,
              option.order_index,
            ]);
          }
        }
      }

      // Commit transaction
      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        quizId: newQuizId,
        message: 'Quiz duplicated successfully',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ [API] [Quiz Duplicate] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to duplicate quiz',
      },
      { status: error.status || 500 }
    );
  } finally {
    client.release();
  }
}

