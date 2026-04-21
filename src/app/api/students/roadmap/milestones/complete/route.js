/**
 * Milestone Completion API Route
 * 
 * POST /api/students/roadmap/milestones/complete - Complete milestone and award stamp
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { 
  checkMilestoneCompletion,
  awardMilestoneStamp
} from '@/lib/services/roadmapMilestones.js';
import { isStudentEnrolled } from '@/lib/db/courses/progress.js';

/**
 * POST /api/students/roadmap/milestones/complete
 * Complete a milestone and award stamp
 * 
 * Request Body:
 * {
 *   "courseId": "uuid",
 *   "milestoneNumber": 1
 * }
 */
export async function POST(request) {
  try {
    // Authentication: Only students and alumni can access
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;

    // Parse request body
    const body = await request.json();
    const { courseId, milestoneNumber } = body;

    // Validate input
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    if (!milestoneNumber || milestoneNumber < 1) {
      return NextResponse.json(
        { success: false, error: 'Valid milestone number is required' },
        { status: 400 }
      );
    }

    // Verify student is enrolled in course
    const enrolled = await isStudentEnrolled(userId, courseId);
    if (!enrolled) {
      return NextResponse.json(
        { success: false, error: 'Student is not enrolled in this course' },
        { status: 403 }
      );
    }

    // Check if milestone is actually completed
    const isCompleted = await checkMilestoneCompletion(userId, courseId, milestoneNumber);
    
    if (!isCompleted) {
      return NextResponse.json(
        { 
          success: false, 
          completed: false,
          error: 'Milestone is not yet completed' 
        },
        { status: 400 }
      );
    }

    // Award stamp if not already awarded
    const stampResult = await awardMilestoneStamp(userId, courseId, milestoneNumber);

    return NextResponse.json({
      success: true,
      completed: true,
      stampAwarded: !stampResult.alreadyAwarded,
      stampType: stampResult.stampType,
      stampId: stampResult.stampId,
      alreadyAwarded: stampResult.alreadyAwarded,
      milestoneNumber,
    });
  } catch (error) {
    console.error('Error completing milestone:', error);
    
    // Handle specific errors
    if (error.message === 'Milestone not found') {
      return NextResponse.json(
        { success: false, error: 'Milestone not found' },
        { status: 404 }
      );
    }

    if (error.message === 'Milestone is not completed') {
      return NextResponse.json(
        { success: false, completed: false, error: 'Milestone is not completed' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to complete milestone',
      },
      { status: error.status || 500 }
    );
  }
}
