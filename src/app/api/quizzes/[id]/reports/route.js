/**
 * Quiz Reports API Route
 * 
 * GET /api/quizzes/:id/reports - Get comprehensive analytics report
 * POST /api/quizzes/:id/reports/generate - Generate PDF report
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import buildFullAnalyticsPayload from '@/services/reports/buildFullAnalyticsPayload.js';
import ensureRoleAccess from '@/utils/reports/ensureRoleAccess.js';
import generatePDFBuffer from '@/utils/reports/generatePDFBuffer.js';
import { cacheReport, getCachedReport } from '@/services/reports/cacheReport.js';

/**
 * GET /api/quizzes/:id/reports
 * Get comprehensive analytics report
 * 
 * Query Parameters:
 * - type: student | instructor | admin | superadmin
 * - studentId: Student ID (for instructor/admin viewing student report)
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const quizId = params.id;

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || userRole;
    const studentId = searchParams.get('studentId') || null;

    // Validate report type
    if (!['student', 'instructor', 'admin', 'superadmin'].includes(reportType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid report type' },
        { status: 400 }
      );
    }

    // Check role access
    const hasAccess = await ensureRoleAccess(quizId, userId, userRole, userOrgId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to view this report' },
        { status: 403 }
      );
    }

    // Get quiz information
    const quizQuery = `
      SELECT id, title, description, total_marks, passing_marks, org_id, course_id
      FROM quizzes
      WHERE id = $1
    `;
    const quizResult = await query(quizQuery, [quizId]);
    if (quizResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const quiz = quizResult.rows[0];

    // Get organization info if available
    let organization = null;
    if (quiz.org_id) {
      const orgQuery = `SELECT id, name FROM organizations WHERE id = $1`;
      const orgResult = await query(orgQuery, [quiz.org_id]);
      if (orgResult.rows.length > 0) {
        organization = {
          id: orgResult.rows[0].id,
          name: orgResult.rows[0].name,
        };
      }
    }

    // Build analytics payload
    const filters = {
      studentId: reportType === 'student' ? userId : studentId,
      orgId: userOrgId,
    };

    const analytics = await buildFullAnalyticsPayload(quizId, reportType, userId, filters);

    // Handle edge cases
    if (!analytics) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate analytics data' },
        { status: 500 }
      );
    }

    // Check if there are any attempts
    if (analytics.scoreSummary?.totalAttempts === 0) {
      return NextResponse.json({
        success: true,
        analytics: {
          ...analytics,
          message: 'No attempts found for this quiz. Report data is limited.',
        },
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          totalMarks: parseFloat(quiz.total_marks),
          passingMarks: parseFloat(quiz.passing_marks),
        },
        organization,
        reportType,
        isEmpty: true,
      });
    }

    return NextResponse.json({
      success: true,
      analytics,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        totalMarks: parseFloat(quiz.total_marks),
        passingMarks: parseFloat(quiz.passing_marks),
      },
      organization,
      reportType,
    });
  } catch (error) {
    console.error('❌ [API] [Quiz Reports GET] Error:', error);
    
    // Handle specific error types
    if (error.message?.includes('permission') || error.message?.includes('access')) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to view this report',
        },
        { status: 403 }
      );
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quiz not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch report',
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/quizzes/:id/reports/generate
 * Generate PDF report
 * 
 * Body:
 * {
 *   "reportType": "student" | "instructor" | "admin" | "superadmin",
 *   "includeCharts": true
 * }
 */
export async function POST(request, { params }) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin', 'instructor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const quizId = params.id;

    const body = await request.json();
    const { reportType = userRole, includeCharts = true } = body;

    // Validate report type
    if (!['student', 'instructor', 'admin', 'superadmin'].includes(reportType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid report type' },
        { status: 400 }
      );
    }

    // Check role access
    const hasAccess = await ensureRoleAccess(quizId, userId, userRole, userOrgId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to generate this report' },
        { status: 403 }
      );
    }

    // Check for cached report first (if caching is enabled)
    try {
      const cachedReport = await getCachedReport(quizId, userId, reportType);
      if (cachedReport) {
        return NextResponse.json({
          success: true,
          pdfUrl: cachedReport.pdfUrl,
          cached: true,
          message: 'Report retrieved from cache',
        });
      }
    } catch (error) {
      // Cache check failed, continue with generation
      console.log('Cache check failed, generating new report:', error.message);
    }

    // Get quiz information
    const quizQuery = `
      SELECT id, title, description, total_marks, passing_marks, org_id, course_id
      FROM quizzes
      WHERE id = $1
    `;
    const quizResult = await query(quizQuery, [quizId]);
    if (quizResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Quiz not found' },
        { status: 404 }
      );
    }

    const quiz = quizResult.rows[0];

    // Get organization info if available
    let organization = null;
    if (quiz.org_id) {
      const orgQuery = `SELECT id, name FROM organizations WHERE id = $1`;
      const orgResult = await query(orgQuery, [quiz.org_id]);
      if (orgResult.rows.length > 0) {
        organization = {
          id: orgResult.rows[0].id,
          name: orgResult.rows[0].name,
        };
      }
    }

    // Build analytics payload
    const filters = {
      studentId: reportType === 'student' ? userId : null,
      orgId: userOrgId,
    };

    let analytics;
    try {
      analytics = await buildFullAnalyticsPayload(quizId, reportType, userId, filters);
    } catch (calcError) {
      console.error('Error calculating analytics:', calcError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to calculate analytics data. Please try again.',
        },
        { status: 500 }
      );
    }

    if (!analytics) {
      return NextResponse.json(
        {
          success: false,
          error: 'No analytics data available',
        },
        { status: 500 }
      );
    }

    // Handle case where there are no attempts
    if (analytics.scoreSummary?.totalAttempts === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot generate PDF report: No attempts found for this quiz.',
        },
        { status: 400 }
      );
    }

    // Generate PDF
    let pdfBuffer;
    try {
      pdfBuffer = await generatePDFBuffer({
        analytics,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          totalMarks: parseFloat(quiz.total_marks),
          passingMarks: parseFloat(quiz.passing_marks),
        },
        organization,
        chartImages: {}, // Will be populated in client-side generation
        reportType,
      });
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate PDF. Please try again.',
        },
        { status: 500 }
      );
    }

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'PDF generation failed: Empty buffer',
        },
        { status: 500 }
      );
    }

    // Convert buffer to base64 for response (or upload to storage and return URL)
    const base64Pdf = pdfBuffer.toString('base64');
    const pdfDataUrl = `data:application/pdf;base64,${base64Pdf}`;

    // Optionally cache the report
    try {
      await cacheReport(quizId, userId, reportType, pdfBuffer, analytics);
    } catch (error) {
      console.log('Failed to cache report:', error.message);
      // Continue even if caching fails
    }

    return NextResponse.json({
      success: true,
      pdfDataUrl,
      pdfBuffer: base64Pdf,
      message: 'PDF report generated successfully',
    });
  } catch (error) {
    console.error('❌ [API] [Quiz Reports POST] Error:', error);
    
    // Handle specific error types
    if (error.message?.includes('permission') || error.message?.includes('access')) {
      return NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to generate this report',
        },
        { status: 403 }
      );
    }

    if (error.message?.includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quiz not found',
        },
        { status: 404 }
      );
    }

    if (error.message?.includes('PDF') || error.message?.includes('buffer')) {
      return NextResponse.json(
        {
          success: false,
          error: 'PDF generation failed. Please try again or contact support.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate PDF report',
      },
      { status: error.status || 500 }
    );
  }
}

