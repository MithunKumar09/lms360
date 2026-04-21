/**
 * Bulk Enrollment Status API Route
 * 
 * POST /api/courses/enrollment-status - Get enrollment status for multiple courses
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getEnrollmentStatusForCourses } from '@/lib/db/courses/enrollments.js';

/**
 * POST /api/courses/enrollment-status
 * Get enrollment status for multiple courses
 * 
 * Request Body:
 * {
 *   "courseIds": ["uuid1", "uuid2", ...]
 * }
 */
export async function POST(request) {
  try {
    // Authentication: Only students and alumni can check enrollment
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;

    const body = await request.json();
    const { courseIds } = body;

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'courseIds array is required' },
        { status: 400 }
      );
    }

    // Get enrollment status for all courses
    const enrollmentMap = await getEnrollmentStatusForCourses(courseIds, userId);

    // Build response with all course IDs (marking non-enrolled ones)
    const statusMap = {};
    courseIds.forEach(courseId => {
      if (enrollmentMap[courseId]) {
        statusMap[courseId] = enrollmentMap[courseId];
      } else {
        statusMap[courseId] = {
          isEnrolled: false,
        };
      }
    });

    return NextResponse.json({
      success: true,
      enrollmentStatus: statusMap,
    });
  } catch (error) {
    console.error('Error getting enrollment status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get enrollment status',
      },
      { status: error.status || 500 }
    );
  }
}

