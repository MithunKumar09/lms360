/**
 * Milestone Check API Route
 * 
 * POST /api/students/roadmap/milestones/check - Check for milestone completion after activity
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import {
  detectMilestoneAfterLessonCompletion,
  detectMilestoneAfterQuizSubmission,
  detectMilestoneAfterAssignmentSubmission,
} from '@/lib/services/milestoneDetection.js';

/**
 * POST /api/students/roadmap/milestones/check
 * 
 * Check for milestone completion after activity
 * Body: { courseId, triggerType, triggerId, isPassed? }
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['student', 'alumni']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
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
    const { courseId, triggerType, triggerId, isPassed } = body;

    // Validate input
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    if (!triggerType || !triggerId) {
      return NextResponse.json(
        { success: false, error: 'Trigger type and trigger ID are required' },
        { status: 400 }
      );
    }

    let result = null;

    switch (triggerType) {
      case 'lesson':
        result = await detectMilestoneAfterLessonCompletion(userId, courseId, triggerId);
        break;
      case 'quiz':
        result = await detectMilestoneAfterQuizSubmission(userId, courseId, triggerId, isPassed || false);
        break;
      case 'assignment':
        result = await detectMilestoneAfterAssignmentSubmission(userId, courseId, triggerId);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid trigger type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      completedMilestones: result ? [{
        number: result.milestoneNumber,
        stampType: result.stampType,
      }] : [],
    });
  } catch (error) {
    console.error('Error checking milestones:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check milestones' },
      { status: 500 }
    );
  }
}
