/**
 * Student Progress Comparison API Route
 * 
 * GET /api/students/roadmap/compare - Get other students' progress for comparison
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { calculateStudentCourseProgress } from '@/lib/services/courseProgress.js';
import { 
  getCourseMilestones,
  getStampCount
} from '@/lib/services/roadmapMilestones.js';

/**
 * GET /api/students/roadmap/compare
 * Get other students' progress for same course
 * 
 * Query Parameters:
 * - courseId (required): Course UUID
 * - cohortId (optional): Filter by cohort
 * - page (optional): Page number (default: 1)
 * - limit (optional): Results per page (default: 50, max: 50)
 */
export async function GET(request) {
  try {
    // Authentication: Only students and alumni can access
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const cohortId = searchParams.get('cohortId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 50); // Max 50
    const offset = (page - 1) * limit;

    // Validate courseId
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Verify current student is enrolled
    const enrollmentCheck = await query(
      `SELECT 1 FROM course_enrollments
       WHERE course_id = $1 AND user_id = $2 AND enrollment_status = 'active'
       LIMIT 1`,
      [courseId, userId]
    );

    if (enrollmentCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'You must be enrolled in this course to view comparisons' },
        { status: 403 }
      );
    }

    // Build query to get other students enrolled in same course
    let studentsQuery = `
      SELECT DISTINCT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url,
        ce.enrolled_at,
        ce.progress_percentage
      FROM course_enrollments ce
      JOIN users u ON ce.user_id = u.id
      WHERE ce.course_id = $1
        AND ce.enrollment_status = 'active'
        AND ce.user_id != $2
    `;
    const queryParams = [courseId, userId];
    let paramIndex = 3;

    // Filter by cohort if provided
    if (cohortId) {
      // Verify current student is in this cohort (for security)
      const studentCohortCheck = await query(
        `SELECT 1 FROM student_links
         WHERE user_id = $1 AND cohort_id = $2
         LIMIT 1`,
        [userId, cohortId]
      );

      if (studentCohortCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'You are not in this cohort' },
          { status: 403 }
        );
      }

      // Filter students by cohort
      studentsQuery += ` AND EXISTS (
        SELECT 1 FROM student_links sl
        WHERE sl.user_id = u.id AND sl.cohort_id = $${paramIndex}
      )`;
      queryParams.push(cohortId);
      paramIndex++;
    }

    studentsQuery += ` ORDER BY ce.progress_percentage DESC, ce.enrolled_at ASC`;

    // Get total count - build count query separately to avoid SQL syntax errors
    let countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM course_enrollments ce
      JOIN users u ON ce.user_id = u.id
      WHERE ce.course_id = $1
        AND ce.enrollment_status = 'active'
        AND ce.user_id != $2
    `;
    const countParams = [courseId, userId];
    let countParamIndex = 3;

    // Add cohort filter to count query if provided
    if (cohortId) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM student_links sl
        WHERE sl.user_id = u.id AND sl.cohort_id = $${countParamIndex}
      )`;
      countParams.push(cohortId);
      countParamIndex++;
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    // Get students with pagination
    studentsQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);
    const studentsResult = await query(studentsQuery, queryParams);

    // Process each student with progress and milestones
    const students = await Promise.all(
      studentsResult.rows.map(async (row) => {
        const studentId = row.id;

        // Calculate progress
        let progress = 0;
        let completedMilestones = 0;
        let totalMilestones = 0;
        let stampCount = 0;

        try {
          const progressData = await calculateStudentCourseProgress(studentId, courseId);
          progress = progressData.progressPercentage;

          // Get milestones
          const milestoneRecords = await getCourseMilestones(studentId, courseId);
          totalMilestones = milestoneRecords.length;
          completedMilestones = milestoneRecords.filter(m => m.completed_at !== null).length;

          // Get stamp count
          stampCount = await getStampCount(studentId, courseId);
        } catch (error) {
          console.error(`Error getting progress for student ${studentId}:`, error);
          // Use enrollment progress as fallback
          progress = parseFloat(row.progress_percentage || 0);
        }

        // Get cohort code
        let cohortCode = null;
        try {
          const cohortResult = await query(
            `SELECT c.code
             FROM student_links sl
             JOIN cohorts c ON sl.cohort_id = c.id
             WHERE sl.user_id = $1
             LIMIT 1`,
            [studentId]
          );
          cohortCode = cohortResult.rows[0]?.code || null;
        } catch (error) {
          console.error(`Error getting cohort for student ${studentId}:`, error);
        }

        return {
          id: studentId,
          name: row.first_name && row.last_name
            ? `${row.first_name} ${row.last_name}`.trim()
            : row.email,
          email: row.email,
          avatarUrl: row.avatar_url,
          cohortCode,
          progress: Math.round(progress * 100) / 100,
          completedMilestones,
          totalMilestones,
          stampCount,
        };
      })
    );

    // Calculate summary statistics
    let averageProgress = 0;
    let averageMilestones = 0;
    if (students.length > 0) {
      averageProgress = students.reduce((sum, s) => sum + s.progress, 0) / students.length;
      averageMilestones = students.reduce((sum, s) => sum + s.completedMilestones, 0) / students.length;
    }

    // Get current student rank
    let currentStudentRank = null;
    try {
      const currentStudentProgress = await calculateStudentCourseProgress(userId, courseId);
      const rankQuery = `
        SELECT COUNT(*) + 1 as rank
        FROM course_enrollments ce
        WHERE ce.course_id = $1
          AND ce.enrollment_status = 'active'
          AND ce.user_id != $2
          AND (
            ce.progress_percentage > $3
            OR (ce.progress_percentage = $3 AND ce.enrolled_at < (
              SELECT enrolled_at FROM course_enrollments
              WHERE course_id = $1 AND user_id = $2 AND enrollment_status = 'active'
            ))
          )
      `;
      const rankResult = await query(rankQuery, [
        courseId,
        userId,
        currentStudentProgress.progressPercentage
      ]);
      currentStudentRank = parseInt(rankResult.rows[0]?.rank || 0, 10);
    } catch (error) {
      console.error('Error calculating current student rank:', error);
    }

    // Cache response for 1 minute
    return NextResponse.json(
      {
        success: true,
        students,
        summary: {
          totalStudents: total,
          averageProgress: Math.round(averageProgress * 100) / 100,
          averageMilestones: Math.round(averageMilestones * 100) / 100,
          currentStudentRank,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      {
        headers: {
          'Cache-Control': 'private, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching student comparison:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch student comparison',
      },
      { status: error.status || 500 }
    );
  }
}
