/**
 * Course Lesson Transcript API Route
 * 
 * Handles transcript operations for course lessons.
 * 
 * GET /api/courses/[id]/lessons/[lessonId]/transcript - Get transcript
 * POST /api/courses/[id]/lessons/[lessonId]/transcript - Save transcript
 * PUT /api/courses/[id]/lessons/[lessonId]/transcript - Update transcript
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/courses/[id]/lessons/[lessonId]/transcript
 * Get transcript for a lesson
 */
export async function GET(request, { params }) {
  try {
    // Authentication: superadmin or admin
    const session = await requireRole(request, ['superadmin', 'admin']);

    const { id: courseId, lessonId } = params;

    if (!courseId || !lessonId) {
      return NextResponse.json(
        { success: false, error: 'Course ID and Lesson ID are required' },
        { status: 400 }
      );
    }

    // TODO: Fetch transcript from database
    // For now, return empty transcript
    const transcript = {
      lessonId,
      courseId,
      text: '',
      transcript: [],
      language: 'en-US',
      createdAt: null,
      updatedAt: null,
    };

    return NextResponse.json({
      success: true,
      transcript,
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch transcript',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/courses/[id]/lessons/[lessonId]/transcript
 * Save transcript for a lesson
 */
export async function POST(request, { params }) {
  try {
    // Authentication: superadmin or admin
    const session = await requireRole(request, ['superadmin', 'admin']);

    const { id: courseId, lessonId } = params;
    const body = await request.json();

    if (!courseId || !lessonId) {
      return NextResponse.json(
        { success: false, error: 'Course ID and Lesson ID are required' },
        { status: 400 }
      );
    }

    const { text, transcript, language = 'en-US' } = body;

    if (!text && (!transcript || transcript.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Transcript text or data is required' },
        { status: 400 }
      );
    }

    // TODO: Save transcript to database
    // For now, return success
    const savedTranscript = {
      lessonId,
      courseId,
      text: text || (Array.isArray(transcript) ? transcript.map((t) => t.text).join(' ') : ''),
      transcript: transcript || [],
      language,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      transcript: savedTranscript,
      message: 'Transcript saved successfully',
    });
  } catch (error) {
    console.error('Error saving transcript:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to save transcript',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/courses/[id]/lessons/[lessonId]/transcript
 * Update transcript for a lesson
 */
export async function PUT(request, { params }) {
  try {
    // Authentication: superadmin or admin
    const session = await requireRole(request, ['superadmin', 'admin']);

    const { id: courseId, lessonId } = params;
    const body = await request.json();

    if (!courseId || !lessonId) {
      return NextResponse.json(
        { success: false, error: 'Course ID and Lesson ID are required' },
        { status: 400 }
      );
    }

    const { text, transcript, language } = body;

    // TODO: Update transcript in database
    // For now, return success
    const updatedTranscript = {
      lessonId,
      courseId,
      text: text || (Array.isArray(transcript) ? transcript.map((t) => t.text).join(' ') : ''),
      transcript: transcript || [],
      language: language || 'en-US',
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      transcript: updatedTranscript,
      message: 'Transcript updated successfully',
    });
  } catch (error) {
    console.error('Error updating transcript:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update transcript',
      },
      { status: error.status || 500 }
    );
  }
}

