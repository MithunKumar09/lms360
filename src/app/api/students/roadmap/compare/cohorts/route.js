/**
 * Cohorts for Course API Route
 * 
 * GET /api/students/roadmap/compare/cohorts - Get cohorts available for filtering
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/students/roadmap/compare/cohorts
 * Get cohorts available for filtering student comparison
 * 
 * Query Parameters:
 * - courseId (required): Course UUID
 */
export async function GET(request) {
  try {
    // Authentication: Only students and alumni can access
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

    // Validate courseId
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Verify student is enrolled
    const enrollmentCheck = await query(
      `SELECT 1 FROM course_enrollments
       WHERE course_id = $1 AND user_id = $2 AND enrollment_status = 'active'
       LIMIT 1`,
      [courseId, userId]
    );

    if (enrollmentCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'You must be enrolled in this course' },
        { status: 403 }
      );
    }

    // Get cohorts of students enrolled in this course
    const cohortsQuery = `
      SELECT DISTINCT
        c.id,
        c.code,
        c.name,
        COUNT(DISTINCT ce.user_id) as student_count
      FROM course_enrollments ce
      JOIN student_links sl ON ce.user_id = sl.user_id
      JOIN cohorts c ON sl.cohort_id = c.id
      WHERE ce.course_id = $1
        AND ce.enrollment_status = 'active'
        AND c.status = 'published'
      GROUP BY c.id, c.code, c.name
      ORDER BY c.code
    `;

    const cohortsResult = await query(cohortsQuery, [courseId]);
    const cohorts = cohortsResult.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name || row.code,
      studentCount: parseInt(row.student_count || 0, 10),
    }));

    // Cache for 5 minutes (cohorts don't change often)
    return NextResponse.json(
      {
        success: true,
        cohorts,
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching cohorts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch cohorts',
      },
      { status: error.status || 500 }
    );
  }
}
