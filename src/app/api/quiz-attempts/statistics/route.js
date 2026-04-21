/**
 * Quiz Attempts Statistics API Route
 * 
 * GET /api/quiz-attempts/statistics - Get student quiz statistics
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/quiz-attempts/statistics
 * Get student quiz statistics for charts
 * 
 * Query Parameters:
 * - studentId: Student ID (optional, defaults to current user for students)
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['student', 'superadmin', 'admin', 'instructor']);
    const userId = session.user.id;
    const userRole = session.user.role;

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId') || (userRole === 'student' ? userId : null);

    // For non-students, require studentId parameter
    if (userRole !== 'student' && !studentId) {
      return NextResponse.json(
        { success: false, error: 'studentId parameter is required for non-student roles' },
        { status: 400 }
      );
    }

    const targetStudentId = studentId || userId;

    // Get overall performance statistics
    const overallStatsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE qa.status = 'submitted' AND qa.is_passed = true) as total_passed,
        COUNT(*) FILTER (WHERE qa.status = 'submitted' AND qa.is_passed = false) as total_failed,
        COUNT(*) FILTER (WHERE qa.status = 'in_progress') as total_pending,
        COUNT(*) FILTER (WHERE qa.status = 'submitted') as total_attempted,
        COUNT(*) as total_all_attempts
      FROM quiz_attempts qa
      WHERE qa.student_id = $1
    `;
    const overallStatsResult = await query(overallStatsQuery, [targetStudentId]);
    const overallStats = overallStatsResult.rows[0];

    // Get historical performance (all submitted attempts with scores)
    const historicalQuery = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY qa.submitted_at ASC) as attempt_number,
        qa.percentage_score,
        qa.marks_obtained,
        qa.submitted_at,
        q.title as quiz_title,
        q.id as quiz_id
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.student_id = $1 AND qa.status = 'submitted'
      ORDER BY qa.submitted_at ASC
    `;
    const historicalResult = await query(historicalQuery, [targetStudentId]);
    const historicalData = historicalResult.rows.map(row => ({
      attemptNumber: parseInt(row.attempt_number, 10),
      score: row.percentage_score ? parseFloat(row.percentage_score) : null,
      marksObtained: row.marks_obtained ? parseFloat(row.marks_obtained) : null,
      date: row.submitted_at,
      quizTitle: row.quiz_title,
      quizId: row.quiz_id,
    }));

    // Get course-wise breakdown
    const courseBreakdownQuery = `
      SELECT 
        COALESCE(c.title, 'Standalone Quiz') as course_title,
        c.id as course_id,
        COUNT(DISTINCT qa.quiz_id) as quiz_count,
        COUNT(*) as total_attempts,
        AVG(qa.percentage_score) FILTER (WHERE qa.status = 'submitted') as average_score,
        COUNT(*) FILTER (WHERE qa.status = 'submitted' AND qa.is_passed = true) as passed_count,
        COUNT(*) FILTER (WHERE qa.status = 'submitted' AND qa.is_passed = false) as failed_count
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      LEFT JOIN courses c ON q.course_id = c.id
      WHERE qa.student_id = $1 AND qa.status = 'submitted'
      GROUP BY c.id, c.title
      ORDER BY total_attempts DESC
    `;
    const courseBreakdownResult = await query(courseBreakdownQuery, [targetStudentId]);
    const courseBreakdown = courseBreakdownResult.rows.map(row => ({
      courseTitle: row.course_title,
      courseId: row.course_id,
      quizCount: parseInt(row.quiz_count, 10),
      totalAttempts: parseInt(row.total_attempts, 10),
      averageScore: row.average_score ? parseFloat(row.average_score) : null,
      passedCount: parseInt(row.passed_count, 10),
      failedCount: parseInt(row.failed_count, 10),
    }));

    return NextResponse.json({
      success: true,
      statistics: {
        overall: {
          totalPassed: parseInt(overallStats.total_passed, 10),
          totalFailed: parseInt(overallStats.total_failed, 10),
          totalPending: parseInt(overallStats.total_pending, 10),
          totalAttempted: parseInt(overallStats.total_attempted, 10),
          totalAllAttempts: parseInt(overallStats.total_all_attempts, 10),
        },
        historical: historicalData,
        courseWise: courseBreakdown,
      },
    });
  } catch (error) {
    console.error('❌ [API] [Quiz Attempts Statistics GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch quiz statistics',
      },
      { status: error.status || 500 }
    );
  }
}

