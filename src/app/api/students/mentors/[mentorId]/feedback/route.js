/**
 * Student Mentor Feedback API Route
 * 
 * POST /api/students/mentors/:mentorId/feedback - Submit feedback for a mentor
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import { createFeedbackSubmittedActivity } from '@/lib/db/mentorActivityFeed.js';

/**
 * POST /api/students/mentors/:mentorId/feedback
 * Submit feedback for a mentor (student only)
 * 
 * Request Body:
 * - rating: number (1-5, required)
 * - category: string (optional)
 * - message: string (10-1000 characters, required)
 */
export async function POST(request, { params }) {
  try {
    console.log('💬 [MENTOR FEEDBACK] ===== SUBMIT FEEDBACK STARTED =====');
    
    if (!params || !params.mentorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Mentor ID is required',
        },
        { status: 400 }
      );
    }
    
    const { mentorId } = params;

    // Require student role
    const session = await requireRole(request, ['student']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    const studentId = session.user.id;

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
    const { rating, category, message } = body;

    // Validation
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'rating is required and must be between 1 and 5' },
        { status: 400 }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'message is required and must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (message.trim().length > 1000) {
      return NextResponse.json(
        { success: false, error: 'message must be at most 1000 characters' },
        { status: 400 }
      );
    }

    // Validate category if provided
    if (category && typeof category === 'string') {
      const validCategories = ['teaching', 'communication', 'support', 'availability', 'other'];
      if (!validCategories.includes(category)) {
        return NextResponse.json(
          { success: false, error: `category must be one of: ${validCategories.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate that mentor-student relationship exists
    const relationshipQuery = `
      SELECT id, cohort_id
      FROM mentor_student_assignments
      WHERE mentor_id = $1 AND student_id = $2
      LIMIT 1
    `;
    const relationshipResult = await query(relationshipQuery, [mentorId, studentId]);

    if (!Array.isArray(relationshipResult?.rows) || relationshipResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'You are not assigned to this mentor' },
        { status: 403 }
      );
    }

    const assignment = relationshipResult.rows[0];
    if (!assignment || typeof assignment !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid assignment data' },
        { status: 500 }
      );
    }
    const cohortId = assignment.cohort_id || null;

    // Insert feedback
    const insertQuery = `
      INSERT INTO mentor_feedback (
        student_id,
        mentor_id,
        cohort_id,
        rating,
        category,
        message,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const insertResult = await query(insertQuery, [
      studentId,
      mentorId,
      cohortId,
      rating,
      category || null,
      message.trim(),
      'submitted',
    ]);

    if (!Array.isArray(insertResult?.rows) || insertResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to create feedback' },
        { status: 500 }
      );
    }
    
    const feedback = insertResult.rows[0];
    if (!feedback || typeof feedback !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid feedback data' },
        { status: 500 }
      );
    }

    const feedbackResponse = {
      id: feedback.id,
      studentId: feedback.student_id,
      mentorId: feedback.mentor_id,
      cohortId: feedback.cohort_id,
      rating: feedback.rating,
      category: feedback.category,
      message: feedback.message,
      status: feedback.status,
      createdAt: feedback.created_at,
      updatedAt: feedback.updated_at,
    };

    // Create activity feed entry
    try {
      await createFeedbackSubmittedActivity({
        mentorId: mentorId,
        studentId: studentId,
        cohortId: cohortId,
        feedbackId: feedback.id,
        rating: rating,
        createdBy: studentId,
      });
    } catch (activityError) {
      // Log error but don't fail the request
      console.error('📰 [MENTOR FEEDBACK] Failed to create activity feed entry:', activityError);
    }

    console.log('💬 [MENTOR FEEDBACK] ✅ Feedback submitted:', feedback.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          feedback: feedbackResponse,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('💬 [MENTOR FEEDBACK] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to submit feedback' 
      },
      { status: 500 }
    );
  }
}
