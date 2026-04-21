/**
 * Vendor Quiz Auto-Grade API Route
 * 
 * POST /api/vendor/quizzes/[id]/auto-grade - Auto-grade a quiz attempt
 * 
 * Body:
 * - attemptId: UUID (required) - Quiz attempt ID to grade
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { autoGradeQuiz } from '@/lib/grading/quizGrader.js';
import { updateCourseProgressAfterGrading } from '@/lib/grading/progressTracker.js';
import { query } from '@/lib/db/index.js';

export async function POST(request, { params }) {
  try {
    // Authentication: Only vendors
    const session = await requireRole(request, ['vendor']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quiz ID is required',
        },
        { status: 400 }
      );
    }
    
    const vendorId = session.user.id;
    const quizId = params.id;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const { attemptId } = body;

    if (!attemptId) {
      return NextResponse.json(
        { success: false, error: 'attemptId is required' },
        { status: 400 }
      );
    }

    // Verify quiz belongs to vendor
    const quizCheck = await query(
      `SELECT q.id, q.course_id, c.created_by
       FROM quizzes q
       LEFT JOIN courses c ON q.course_id = c.id
       WHERE q.id = $1 AND (
         (q.course_id IS NULL AND q.created_by = $2) OR
         (q.course_id IS NOT NULL AND c.created_by = $2)
       )`,
      [quizId, vendorId]
    );

    if (!Array.isArray(quizCheck?.rows) || quizCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found or does not belong to vendor' },
        { status: 404 }
      );
    }

    // Auto-grade the quiz attempt
    const gradingResult = await autoGradeQuiz(attemptId);

    // Update course progress if quiz is linked to a course
    const quiz = quizCheck.rows[0];
    if (!quiz || typeof quiz !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid quiz data' },
        { status: 500 }
      );
    }
    let milestoneResult = null;
    
    if (quiz.course_id) {
      // Get enrollment for the student
      const attemptQuery = `
        SELECT student_id, is_passed FROM quiz_attempts WHERE id = $1
      `;
      const attemptResult = await query(attemptQuery, [attemptId]);
      
      if (Array.isArray(attemptResult?.rows) && attemptResult.rows.length > 0) {
        const attemptRow = attemptResult.rows[0];
        if (!attemptRow || typeof attemptRow !== 'object') {
          return NextResponse.json(
            { success: false, error: 'Invalid attempt data' },
            { status: 500 }
          );
        }
        
        const studentId = attemptRow.student_id;
        const isPassed = attemptRow.is_passed;
        
        // Get enrollment ID
        const enrollmentQuery = `
          SELECT id FROM course_enrollments
          WHERE course_id = $1 AND user_id = $2
        `;
        const enrollmentResult = await query(enrollmentQuery, [quiz.course_id, studentId]);
        
        if (Array.isArray(enrollmentResult?.rows) && enrollmentResult.rows.length > 0) {
          const enrollmentId = enrollmentResult.rows[0]?.id;
          if (!enrollmentId) {
            return NextResponse.json(
              { success: false, error: 'Invalid enrollment data' },
              { status: 500 }
            );
          }
          await updateCourseProgressAfterGrading(enrollmentId);
        }

        // Check for milestone completion if quiz is passed
        if (isPassed) {
          try {
            const { detectMilestoneAfterQuizSubmission } = await import('@/lib/services/milestoneDetection.js');
            milestoneResult = await detectMilestoneAfterQuizSubmission(
              studentId,
              quiz.course_id,
              quizId,
              isPassed
            );
          } catch (error) {
            console.error('Error detecting milestone after quiz submission:', error);
            // Don't fail the request if milestone detection fails
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      ...gradingResult,
      milestoneCompleted: milestoneResult ? {
        milestoneNumber: milestoneResult.milestoneNumber,
        stampType: milestoneResult.stampType,
        stampAwarded: !milestoneResult.alreadyAwarded,
      } : null,
    });
  } catch (error) {
    console.error('Error auto-grading quiz:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to auto-grade quiz',
      },
      { status: error.status || 500 }
    );
  }
}
