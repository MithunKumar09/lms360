/**
 * Quiz API Route (Single Quiz)
 * 
 * GET /api/quizzes/:id - Get quiz details with questions
 * PUT /api/quizzes/:id - Update quiz
 * DELETE /api/quizzes/:id - Delete quiz
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query, getClient } from '@/lib/db/index.js';

/**
 * GET /api/quizzes/:id
 * Get quiz details with questions and options
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const quizId = params.id;

    // Build WHERE conditions based on role
    const whereConditions = ['q.id = $1'];
    const queryParams = [quizId];
    let paramIndex = 2;

    if (userRole === 'superadmin') {
      // Superadmin: Can see all quizzes
      // No additional filter needed
    } else if (userRole === 'admin') {
      // Admin: Only quizzes from their organization
      if (userOrgId) {
        whereConditions.push(`q.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        whereConditions.push(`q.org_id IS NULL AND q.created_by = $${paramIndex}`);
        queryParams.push(userId);
        paramIndex++;
      }
    } else if (userRole === 'instructor') {
      // Instructor: Quizzes from their courses AND standalone quizzes they created
      whereConditions.push(`(
        (q.course_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM courses c 
          WHERE c.id = q.course_id AND c.created_by = $${paramIndex}
        )) OR
        (q.course_id IS NULL AND q.created_by = $${paramIndex})
      )`);
      queryParams.push(userId);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get quiz details
    const quizQuery = `
      SELECT 
        q.id,
        q.course_id,
        q.org_id,
        q.created_by,
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
        q.end_date,
        q.created_at,
        q.updated_at,
        c.title as course_title,
        c.slug as course_slug,
        o.name as org_name
      FROM quizzes q
      LEFT JOIN courses c ON q.course_id = c.id
      LEFT JOIN organizations o ON q.org_id = o.id
      WHERE ${whereClause}
    `;
    const quizResult = await query(quizQuery, queryParams);

    if (quizResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const row = quizResult.rows[0];
    const quiz = {
      id: row.id,
      courseId: row.course_id,
      courseTitle: row.course_title,
      courseSlug: row.course_slug,
      orgId: row.org_id,
      orgName: row.org_name,
      createdBy: row.created_by,
      title: row.title,
      description: row.description,
      instructions: row.instructions,
      totalMarks: parseFloat(row.total_marks),
      passingMarks: parseFloat(row.passing_marks),
      timeLimitMinutes: row.time_limit_minutes,
      maxAttempts: row.max_attempts,
      showResultsImmediately: row.show_results_immediately,
      showCorrectAnswers: row.show_correct_answers,
      randomizeQuestions: row.randomize_questions,
      randomizeOptions: row.randomize_options,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    // Get questions with options
    const questionsQuery = `
      SELECT 
        qq.id,
        qq.question_text,
        qq.question_type,
        qq.marks,
        qq.order_index
      FROM quiz_questions qq
      WHERE qq.quiz_id = $1
      ORDER BY qq.order_index ASC
    `;
    const questionsResult = await query(questionsQuery, [quizId]);

    const questions = await Promise.all(
      questionsResult.rows.map(async (qRow) => {
        const question = {
          id: qRow.id,
          questionText: qRow.question_text,
          questionType: qRow.question_type,
          marks: parseFloat(qRow.marks),
          orderIndex: qRow.order_index,
          options: [],
        };

        // Get options for multiple_choice and true_false
        if (['multiple_choice', 'true_false'].includes(qRow.question_type)) {
          const optionsQuery = `
            SELECT 
              id,
              option_text,
              is_correct,
              order_index
            FROM quiz_question_options
            WHERE question_id = $1
            ORDER BY order_index ASC
          `;
          const optionsResult = await query(optionsQuery, [qRow.id]);
          question.options = optionsResult.rows.map((optRow) => ({
            id: optRow.id,
            optionText: optRow.option_text,
            isCorrect: optRow.is_correct,
            orderIndex: optRow.order_index,
          }));
        }

        return question;
      })
    );

    return NextResponse.json({
      success: true,
      quiz: {
        ...quiz,
        questions,
      },
    });
  } catch (error) {
    console.error('❌ [API] [Quiz GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch quiz',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/quizzes/:id
 * Update quiz
 */
export async function PUT(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const quizId = params.id;

    const body = await request.json();
    const {
      title,
      description,
      instructions,
      totalMarks,
      passingMarks,
      timeLimitMinutes,
      maxAttempts,
      showResultsImmediately,
      showCorrectAnswers,
      randomizeQuestions,
      randomizeOptions,
      status,
      startDate,
      endDate,
      questions,
    } = body;

    // Verify quiz belongs to user (based on role)
    const checkQuery = `
      SELECT id, status, created_by, org_id, course_id
      FROM quizzes
      WHERE id = $1
    `;
    const checkResult = await query(checkQuery, [quizId]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const existingQuiz = checkResult.rows[0];

    // Role-based permission check
    if (userRole === 'admin') {
      if (userOrgId && existingQuiz.org_id !== userOrgId) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to edit this quiz' },
          { status: 403 }
        );
      }
      if (!userOrgId && (existingQuiz.org_id !== null || existingQuiz.created_by !== userId)) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to edit this quiz' },
          { status: 403 }
        );
      }
    } else if (userRole === 'instructor') {
      // Instructor: Can edit if they created it or if it's from their course
      if (existingQuiz.course_id) {
        const courseCheck = await query(
          `SELECT created_by FROM courses WHERE id = $1`,
          [existingQuiz.course_id]
        );
        if (courseCheck.rows.length === 0 || courseCheck.rows[0].created_by !== userId) {
          return NextResponse.json(
            { success: false, error: 'You do not have permission to edit this quiz' },
            { status: 403 }
          );
        }
      } else if (existingQuiz.created_by !== userId) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to edit this quiz' },
          { status: 403 }
        );
      }
    }
    // Superadmin can edit any quiz

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (!title || title.trim().length < 3) {
        return NextResponse.json(
          { success: false, error: 'Title must be at least 3 characters' },
          { status: 400 }
        );
      }
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(title.trim());
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(description?.trim() || null);
    }
    if (instructions !== undefined) {
      updateFields.push(`instructions = $${paramIndex++}`);
      updateValues.push(instructions?.trim() || null);
    }
    if (totalMarks !== undefined) {
      if (totalMarks <= 0) {
        return NextResponse.json(
          { success: false, error: 'Total marks must be greater than 0' },
          { status: 400 }
        );
      }
      updateFields.push(`total_marks = $${paramIndex++}`);
      updateValues.push(totalMarks);
    }
    if (passingMarks !== undefined) {
      const currentTotalMarks = totalMarks !== undefined ? totalMarks : existingQuiz.total_marks;
      if (passingMarks < 0 || passingMarks > currentTotalMarks) {
        return NextResponse.json(
          { success: false, error: 'Passing marks must be between 0 and total marks' },
          { status: 400 }
        );
      }
      updateFields.push(`passing_marks = $${paramIndex++}`);
      updateValues.push(passingMarks);
    }
    if (timeLimitMinutes !== undefined) {
      if (timeLimitMinutes !== null && timeLimitMinutes <= 0) {
        return NextResponse.json(
          { success: false, error: 'Time limit must be greater than 0' },
          { status: 400 }
        );
      }
      updateFields.push(`time_limit_minutes = $${paramIndex++}`);
      updateValues.push(timeLimitMinutes);
    }
    if (maxAttempts !== undefined) {
      if (maxAttempts <= 0) {
        return NextResponse.json(
          { success: false, error: 'Max attempts must be greater than 0' },
          { status: 400 }
        );
      }
      updateFields.push(`max_attempts = $${paramIndex++}`);
      updateValues.push(maxAttempts);
    }
    if (showResultsImmediately !== undefined) {
      updateFields.push(`show_results_immediately = $${paramIndex++}`);
      updateValues.push(showResultsImmediately);
    }
    if (showCorrectAnswers !== undefined) {
      updateFields.push(`show_correct_answers = $${paramIndex++}`);
      updateValues.push(showCorrectAnswers);
    }
    if (randomizeQuestions !== undefined) {
      updateFields.push(`randomize_questions = $${paramIndex++}`);
      updateValues.push(randomizeQuestions);
    }
    if (randomizeOptions !== undefined) {
      updateFields.push(`randomize_options = $${paramIndex++}`);
      updateValues.push(randomizeOptions);
    }
    if (status !== undefined) {
      if (!['draft', 'published', 'closed'].includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
    }
    if (startDate !== undefined) {
      updateFields.push(`start_date = $${paramIndex++}`);
      updateValues.push(startDate);
    }
    if (endDate !== undefined) {
      updateFields.push(`end_date = $${paramIndex++}`);
      updateValues.push(endDate);
    }

    // Update quiz if there are fields to update
    if (updateFields.length > 0) {
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(quizId);

      const updateQuery = `
        UPDATE quizzes
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      const result = await query(updateQuery, updateValues);
      // Quiz updated
    }

    // Update questions if provided
    if (questions !== undefined && Array.isArray(questions)) {
      if (questions.length === 0) {
        return NextResponse.json(
          { success: false, error: 'At least one question is required' },
          { status: 400 }
        );
      }

      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Delete existing questions (CASCADE will handle options)
        await client.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]);

        // Insert new questions
        for (let i = 0; i < questions.length; i++) {
          const question = questions[i];
          
          // Validate question
          if (!question.questionText || question.questionText.trim().length === 0) {
            throw new Error('All questions must have text');
          }
          if (!['multiple_choice', 'true_false', 'short_answer', 'essay'].includes(question.questionType)) {
            throw new Error('Invalid question type');
          }
          if (question.marks <= 0) {
            throw new Error('Question marks must be greater than 0');
          }

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
          const questionResult = await client.query(insertQuestionQuery, [
            quizId,
            question.questionText.trim(),
            question.questionType,
            question.marks,
            i + 1,
          ]);

          const questionId = questionResult.rows[0].id;

          // Insert options for multiple_choice and true_false
          if (['multiple_choice', 'true_false'].includes(question.questionType) && question.options) {
            if (question.options.length < 2) {
              throw new Error('Multiple choice and true/false questions must have at least 2 options');
            }
            const hasCorrectAnswer = question.options.some(opt => opt.isCorrect);
            if (!hasCorrectAnswer) {
              throw new Error('At least one option must be marked as correct');
            }

            for (let j = 0; j < question.options.length; j++) {
              const option = question.options[j];
              const insertOptionQuery = `
                INSERT INTO quiz_question_options (
                  question_id,
                  option_text,
                  is_correct,
                  order_index
                ) VALUES ($1, $2, $3, $4)
              `;
              await client.query(insertOptionQuery, [
                questionId,
                option.optionText.trim(),
                option.isCorrect || false,
                j + 1,
              ]);
            }
          }
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    // Fetch updated quiz
    const updatedQuizQuery = `
      SELECT *
      FROM quizzes
      WHERE id = $1
    `;
    const updatedResult = await query(updatedQuizQuery, [quizId]);
    const row = updatedResult.rows[0];

    const updatedQuiz = {
      id: row.id,
      courseId: row.course_id,
      orgId: row.org_id,
      createdBy: row.created_by,
      title: row.title,
      description: row.description,
      instructions: row.instructions,
      totalMarks: parseFloat(row.total_marks),
      passingMarks: parseFloat(row.passing_marks),
      timeLimitMinutes: row.time_limit_minutes,
      maxAttempts: row.max_attempts,
      showResultsImmediately: row.show_results_immediately,
      showCorrectAnswers: row.show_correct_answers,
      randomizeQuestions: row.randomize_questions,
      randomizeOptions: row.randomize_options,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({
      success: true,
      quiz: updatedQuiz,
      message: 'Quiz updated successfully',
    });
  } catch (error) {
    console.error('❌ [API] [Quiz PUT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update quiz',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/quizzes/:id
 * Delete quiz
 */
export async function DELETE(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const quizId = params.id;

    // Verify quiz belongs to user (based on role)
    const checkQuery = `
      SELECT id, created_by, org_id, course_id
      FROM quizzes
      WHERE id = $1
    `;
    const checkResult = await query(checkQuery, [quizId]);
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const existingQuiz = checkResult.rows[0];

    // Role-based permission check
    if (userRole === 'admin') {
      if (userOrgId && existingQuiz.org_id !== userOrgId) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to delete this quiz' },
          { status: 403 }
        );
      }
      if (!userOrgId && (existingQuiz.org_id !== null || existingQuiz.created_by !== userId)) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to delete this quiz' },
          { status: 403 }
        );
      }
    } else if (userRole === 'instructor') {
      // Instructor: Can delete if they created it or if it's from their course
      if (existingQuiz.course_id) {
        const courseCheck = await query(
          `SELECT created_by FROM courses WHERE id = $1`,
          [existingQuiz.course_id]
        );
        if (courseCheck.rows.length === 0 || courseCheck.rows[0].created_by !== userId) {
          return NextResponse.json(
            { success: false, error: 'You do not have permission to delete this quiz' },
            { status: 403 }
          );
        }
      } else if (existingQuiz.created_by !== userId) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to delete this quiz' },
          { status: 403 }
        );
      }
    }
    // Superadmin can delete any quiz

    // Delete quiz (CASCADE will handle related records)
    const deleteQuery = `
      DELETE FROM quizzes
      WHERE id = $1
      RETURNING id
    `;
    const result = await query(deleteQuery, [quizId]);

    return NextResponse.json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    console.error('❌ [API] [Quiz DELETE] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete quiz',
      },
      { status: error.status || 500 }
    );
  }
}

