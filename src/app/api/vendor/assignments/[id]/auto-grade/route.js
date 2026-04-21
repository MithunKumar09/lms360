/**
 * Vendor Assignment Auto-Grade API Route
 * 
 * POST /api/vendor/assignments/[id]/auto-grade - Auto-grade an assignment submission
 * 
 * Body:
 * - submissionId: UUID (required) - Assignment submission ID to grade
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { autoGradeAssignment } from '@/lib/grading/assignmentGrader.js';
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
          error: 'Assignment ID is required',
        },
        { status: 400 }
      );
    }
    
    const vendorId = session.user.id;
    const assignmentId = params.id;

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
    const { submissionId } = body;

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: 'submissionId is required' },
        { status: 400 }
      );
    }

    // Verify assignment belongs to vendor
    const assignmentCheck = await query(
      `SELECT a.id, a.course_id, c.created_by
       FROM assignments a
       INNER JOIN courses c ON a.course_id = c.id
       WHERE a.id = $1 AND c.created_by = $2`,
      [assignmentId, vendorId]
    );

    if (!Array.isArray(assignmentCheck?.rows) || assignmentCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found or does not belong to vendor' },
        { status: 404 }
      );
    }

    // Auto-grade the assignment submission
    const gradingResult = await autoGradeAssignment(submissionId);

    if (!gradingResult.success) {
      // File-based assignment - cannot auto-grade
      return NextResponse.json(
        {
          success: false,
          error: gradingResult.error || 'Assignment cannot be auto-graded',
        },
        { status: 400 }
      );
    }

    // Update course progress
    const assignment = assignmentCheck.rows[0];
    if (!assignment || typeof assignment !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid assignment data' },
        { status: 500 }
      );
    }
    
    if (assignment.course_id) {
      // Get enrollment for the student
      const submissionQuery = `
        SELECT student_id FROM assignment_submissions WHERE id = $1
      `;
      const submissionResult = await query(submissionQuery, [submissionId]);
      
      if (Array.isArray(submissionResult?.rows) && submissionResult.rows.length > 0) {
        const submissionRow = submissionResult.rows[0];
        if (!submissionRow || typeof submissionRow !== 'object') {
          return NextResponse.json(
            { success: false, error: 'Invalid submission data' },
            { status: 500 }
          );
        }
        
        const studentId = submissionRow.student_id;
        
        // Get enrollment ID
        const enrollmentQuery = `
          SELECT id FROM course_enrollments
          WHERE course_id = $1 AND user_id = $2
        `;
        const enrollmentResult = await query(enrollmentQuery, [assignment.course_id, studentId]);
        
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
      }
    }

    return NextResponse.json({
      success: true,
      ...gradingResult,
    });
  } catch (error) {
    console.error('Error auto-grading assignment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to auto-grade assignment',
      },
      { status: error.status || 500 }
    );
  }
}
