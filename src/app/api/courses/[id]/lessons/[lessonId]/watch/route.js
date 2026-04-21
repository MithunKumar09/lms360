/**
 * Lesson Watch Progress API Route
 * 
 * POST /api/courses/:id/lessons/:lessonId/watch - Track watch duration
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { updateWatchProgress } from '@/lib/db/lessons/index.js';

/**
 * POST /api/courses/:id/lessons/:lessonId/watch
 * 
 * Update watch progress for a lesson
 * Body: { watchDuration, totalDuration, completed }
 */
export async function POST(request, { params }) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: courseId, lessonId } = params;
    const body = await request.json();
    const { watchDuration, totalDuration, completed = false } = body;

    // Validate input
    if (watchDuration === undefined || watchDuration < 0) {
      return NextResponse.json(
        { success: false, error: 'watchDuration is required and must be >= 0' },
        { status: 400 }
      );
    }

    if (totalDuration === undefined || totalDuration <= 0) {
      return NextResponse.json(
        { success: false, error: 'totalDuration is required and must be > 0' },
        { status: 400 }
      );
    }

    // Update watch progress
    const progress = await updateWatchProgress(
      lessonId,
      session.user.id,
      Math.floor(watchDuration),
      Math.floor(totalDuration),
      completed
    );

    // Check for milestone completion if lesson is completed
    let milestoneResult = null;
    if (completed && progress.completed) {
      try {
        const { detectMilestoneAfterLessonCompletion } = await import('@/lib/services/milestoneDetection.js');
        milestoneResult = await detectMilestoneAfterLessonCompletion(
          session.user.id,
          courseId,
          lessonId
        );
      } catch (error) {
        console.error('Error detecting milestone after lesson completion:', error);
        // Don't fail the request if milestone detection fails
      }
    }

    return NextResponse.json({
      success: true,
      progress: {
        watchDuration: progress.watch_duration,
        totalDuration: progress.total_duration,
        completed: progress.completed,
        lastWatchedAt: progress.last_watched_at
      },
      milestoneCompleted: milestoneResult ? {
        milestoneNumber: milestoneResult.milestoneNumber,
        stampType: milestoneResult.stampType,
        stampAwarded: !milestoneResult.alreadyAwarded,
      } : null,
    });
  } catch (error) {
    console.error('Error updating watch progress:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update watch progress'
      },
      { status: 500 }
    );
  }
}

