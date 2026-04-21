/**
 * Vendor Quizzes API Route
 * 
 * GET /api/vendor/quizzes - List vendor's quizzes
 * POST /api/vendor/quizzes - Create quiz for vendor's course
 * 
 * Query Parameters (GET):
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - courseId: Filter by course ID
 * - status: Filter by status (draft, published, closed)
 * - search: Search in title
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import {
  getVendorQuizzes,
  createVendorQuiz,
} from '@/lib/db/vendor/quizzes.js';

export async function GET(request) {
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
    
    const vendorId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const courseId = searchParams.get('courseId') || null;
    const status = searchParams.get('status') || null;
    const search = searchParams.get('search') || null;

    // Get vendor's quizzes
    const result = await getVendorQuizzes(vendorId, {
      page,
      limit,
      courseId,
      status,
      search,
    });

    return NextResponse.json({
      success: true,
      quizzes: result.quizzes,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching vendor quizzes:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch quizzes',
      },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
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
    
    const vendorId = session.user.id;

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
    const {
      courseId,
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
    } = body;

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { success: false, error: 'title is required' },
        { status: 400 }
      );
    }

    // Validate marks
    if (totalMarks && totalMarks <= 0) {
      return NextResponse.json(
        { success: false, error: 'totalMarks must be greater than 0' },
        { status: 400 }
      );
    }

    if (passingMarks && passingMarks < 0) {
      return NextResponse.json(
        { success: false, error: 'passingMarks must be greater than or equal to 0' },
        { status: 400 }
      );
    }

    if (totalMarks && passingMarks && passingMarks > totalMarks) {
      return NextResponse.json(
        { success: false, error: 'passingMarks cannot be greater than totalMarks' },
        { status: 400 }
      );
    }

    // Create quiz
    const quiz = await createVendorQuiz(vendorId, {
      courseId: courseId || null,
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
      status: status || 'draft',
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      quiz,
    });
  } catch (error) {
    console.error('Error creating vendor quiz:', error);
    
    // Handle course not found or access denied
    if (error.message.includes('not found') || error.message.includes('does not belong')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create quiz',
      },
      { status: error.status || 500 }
    );
  }
}
