/**
 * Course Progress API Route
 * 
 * GET /api/courses/[id]/progress - Get course progress for authenticated student
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { calculateStudentCourseProgress } from '@/lib/services/courseProgress.js';

/**
 * GET /api/courses/[id]/progress
 * Get course progress for authenticated student
 */
export async function GET(request, { params }) {
  try {
    // Authentication: Only students and alumni can check progress
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;
    const courseId = params.id;

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Calculate progress
    const progress = await calculateStudentCourseProgress(userId, courseId);

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error('Error fetching course progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch course progress',
      },
      { status: error.status || 500 }
    );
  }
}

