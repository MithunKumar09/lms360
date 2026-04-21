/**
 * Quiz Analytics API Route
 * 
 * GET /api/quizzes/:id/analytics - Get analytics data for a quiz
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/quizzes/:id/analytics
 * Get analytics data for a quiz
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const quizId = params.id;

    // Verify quiz access (same logic as submissions endpoint)
    const quizCheckQuery = `
      SELECT id, org_id, course_id, created_by, title, total_marks, passing_marks
      FROM quizzes
      WHERE id = $1
    `;
    const quizCheck = await query(quizCheckQuery, [quizId]);
    if (quizCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const quiz = quizCheck.rows[0];

    // Role-based permission check
    if (userRole === 'admin') {
      if (userOrgId && quiz.org_id !== userOrgId) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to view this quiz' },
          { status: 403 }
        );
      }
      if (!userOrgId && quiz.org_id !== null) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to view this quiz' },
          { status: 403 }
        );
      }
    } else if (userRole === 'instructor') {
      if (quiz.course_id) {
        const courseCheck = await query(
          `SELECT created_by FROM courses WHERE id = $1`,
          [quiz.course_id]
        );
        if (courseCheck.rows.length === 0 || courseCheck.rows[0].created_by !== userId) {
          return NextResponse.json(
            { success: false, error: 'You do not have permission to view this quiz' },
            { status: 403 }
          );
        }
      } else if (quiz.created_by !== userId) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to view this quiz' },
          { status: 403 }
        );
      }
    }

    // Get total attempts
    const totalAttemptsQuery = `
      SELECT COUNT(*) as total
      FROM quiz_attempts
      WHERE quiz_id = $1
    `;
    const totalAttemptsResult = await query(totalAttemptsQuery, [quizId]);
    const totalAttempts = parseInt(totalAttemptsResult.rows[0].total, 10);

    // Get submitted attempts
    const submittedAttemptsQuery = `
      SELECT COUNT(*) as total
      FROM quiz_attempts
      WHERE quiz_id = $1 AND status = 'submitted'
    `;
    const submittedAttemptsResult = await query(submittedAttemptsQuery, [quizId]);
    const submittedAttempts = parseInt(submittedAttemptsResult.rows[0].total, 10);

    // Get pass/fail statistics
    const passFailQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE is_passed = true) as passed,
        COUNT(*) FILTER (WHERE is_passed = false) as failed,
        COUNT(*) FILTER (WHERE is_passed IS NULL) as not_graded
      FROM quiz_attempts
      WHERE quiz_id = $1 AND status = 'submitted'
    `;
    const passFailResult = await query(passFailQuery, [quizId]);
    const passFail = passFailResult.rows[0];

    // Get average marks
    const avgMarksQuery = `
      SELECT 
        AVG(marks_obtained) as avg_marks,
        AVG(percentage_score) as avg_percentage,
        MIN(marks_obtained) as min_marks,
        MAX(marks_obtained) as max_marks
      FROM quiz_attempts
      WHERE quiz_id = $1 AND status = 'submitted' AND marks_obtained IS NOT NULL
    `;
    const avgMarksResult = await query(avgMarksQuery, [quizId]);
    const avgMarks = avgMarksResult.rows[0];

    // Submission rate over time (last 30 days)
    const submissionRateQuery = `
      SELECT 
        DATE(submitted_at) as date,
        COUNT(*) as count
      FROM quiz_attempts
      WHERE quiz_id = $1 
        AND status = 'submitted' 
        AND submitted_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(submitted_at)
      ORDER BY date ASC
    `;
    const submissionRateResult = await query(submissionRateQuery, [quizId]);

    // Marks distribution (buckets)
    const marksDistributionQuery = `
      SELECT 
        CASE
          WHEN percentage_score >= 90 THEN '90-100'
          WHEN percentage_score >= 80 THEN '80-89'
          WHEN percentage_score >= 70 THEN '70-79'
          WHEN percentage_score >= 60 THEN '60-69'
          WHEN percentage_score >= 50 THEN '50-59'
          WHEN percentage_score >= 40 THEN '40-49'
          WHEN percentage_score >= 30 THEN '30-39'
          WHEN percentage_score >= 20 THEN '20-29'
          WHEN percentage_score >= 10 THEN '10-19'
          ELSE '0-9'
        END as range,
        COUNT(*) as count
      FROM quiz_attempts
      WHERE quiz_id = $1 
        AND status = 'submitted' 
        AND percentage_score IS NOT NULL
      GROUP BY range
      ORDER BY range DESC
    `;
    const marksDistributionResult = await query(marksDistributionQuery, [quizId]);

    // Organization comparison (for superadmin only)
    let orgComparison = null;
    if (userRole === 'superadmin' && quiz.org_id) {
      // For org-specific quizzes, compare with other orgs if applicable
      // This is a simplified version - can be enhanced
      const orgComparisonQuery = `
        SELECT 
          o.id,
          o.name,
          COUNT(qa.id) as attempt_count,
          AVG(qa.percentage_score) as avg_percentage
        FROM organizations o
        LEFT JOIN quizzes q ON q.org_id = o.id AND q.id = $1
        LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.status = 'submitted'
        WHERE q.id = $1
        GROUP BY o.id, o.name
      `;
      const orgComparisonResult = await query(orgComparisonQuery, [quizId]);
      if (orgComparisonResult.rows.length > 0) {
        orgComparison = orgComparisonResult.rows.map(row => ({
          orgId: row.id,
          orgName: row.name,
          attemptCount: parseInt(row.attempt_count || 0, 10),
          avgPercentage: row.avg_percentage ? parseFloat(row.avg_percentage) : null,
        }));
      }
    }

    return NextResponse.json({
      success: true,
      analytics: {
        totalAttempts,
        submittedAttempts,
        passFail: {
          passed: parseInt(passFail.passed || 0, 10),
          failed: parseInt(passFail.failed || 0, 10),
          notGraded: parseInt(passFail.not_graded || 0, 10),
        },
        averageMarks: {
          avgMarks: avgMarks.avg_marks ? parseFloat(avgMarks.avg_marks) : null,
          avgPercentage: avgMarks.avg_percentage ? parseFloat(avgMarks.avg_percentage) : null,
          minMarks: avgMarks.min_marks ? parseFloat(avgMarks.min_marks) : null,
          maxMarks: avgMarks.max_marks ? parseFloat(avgMarks.max_marks) : null,
        },
        submissionRateOverTime: submissionRateResult.rows.map(row => ({
          date: row.date,
          count: parseInt(row.count, 10),
        })),
        marksDistribution: marksDistributionResult.rows.map(row => ({
          range: row.range,
          count: parseInt(row.count, 10),
        })),
        orgComparison,
      },
    });
  } catch (error) {
    console.error('❌ [API] [Quiz Analytics GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch analytics',
      },
      { status: error.status || 500 }
    );
  }
}

