/**
 * Vendor Quiz Details API Route
 * 
 * GET /api/vendor/quizzes/[id] - Get quiz details
 * PUT /api/vendor/quizzes/[id] - Update quiz
 * DELETE /api/vendor/quizzes/[id] - Delete quiz
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import {
  getVendorQuizzes,
  updateVendorQuiz,
  deleteVendorQuiz,
} from '@/lib/db/vendor/quizzes.js';

export async function GET(request, { params }) {
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
        { success: false, error: 'Quiz ID is required' },
        { status: 400 }
      );
    }
    
    const vendorId = session.user.id;
    const quizId = params.id;

    // Get quiz (filter by vendor's courses)
    const result = await getVendorQuizzes(vendorId, {
      page: 1,
      limit: 1,
      courseId: null,
      status: null,
      search: null,
    });

    // Find the specific quiz
    const quiz = Array.isArray(result?.quizzes)
      ? result.quizzes.find(q => q && typeof q === 'object' && q.id === quizId)
      : null;

    if (!quiz) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found or does not belong to vendor' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      quiz,
    });
  } catch (error) {
    console.error('Error fetching vendor quiz:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch quiz',
      },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(request, { params }) {
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
        { success: false, error: 'Quiz ID is required' },
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

    // Validate marks if provided
    if (body.totalMarks !== undefined && body.totalMarks <= 0) {
      return NextResponse.json(
        { success: false, error: 'totalMarks must be greater than 0' },
        { status: 400 }
      );
    }

    if (body.passingMarks !== undefined && body.passingMarks < 0) {
      return NextResponse.json(
        { success: false, error: 'passingMarks must be greater than or equal to 0' },
        { status: 400 }
      );
    }

    if (body.totalMarks && body.passingMarks && body.passingMarks > body.totalMarks) {
      return NextResponse.json(
        { success: false, error: 'passingMarks cannot be greater than totalMarks' },
        { status: 400 }
      );
    }

    // Update quiz
    const quiz = await updateVendorQuiz(vendorId, quizId, body);

    return NextResponse.json({
      success: true,
      quiz,
    });
  } catch (error) {
    console.error('Error updating vendor quiz:', error);
    
    // Handle quiz not found or access denied
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
        error: error.message || 'Failed to update quiz',
      },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request, { params }) {
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
        { success: false, error: 'Quiz ID is required' },
        { status: 400 }
      );
    }
    
    const vendorId = session.user.id;
    const quizId = params.id;

    // Delete quiz
    const success = await deleteVendorQuiz(vendorId, quizId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete quiz' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting vendor quiz:', error);
    
    // Handle quiz not found or access denied
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
        error: error.message || 'Failed to delete quiz',
      },
      { status: error.status || 500 }
    );
  }
}
