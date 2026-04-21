/**
 * Assignment Export API Route
 * 
 * GET /api/courses/assignments/export - Export assignment report as CSV or PDF
 * 
 * Query Parameters:
 * - role: 'admin' | 'instructor' (required)
 * - format: 'csv' | 'pdf' (required)
 * - courseId: Filter by course
 * - cohortId: Filter by cohort
 * - classId: Filter by class
 * - subjectId: Filter by subject
 * - dateFrom: Filter from date (ISO date string)
 * - dateTo: Filter to date (ISO date string)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

export async function GET(request) {
  try {
    // Require admin or instructor role
    const session = await requireRole(request, ['admin', 'instructor']);
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    if (!format || !['csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Format must be csv or pdf' },
        { status: 400 }
      );
    }

    // Build WHERE clause (same as report endpoint)
    const whereConditions = ['ca.is_active = $1'];
    const queryParams = [true];
    let paramIndex = 2;

    // Role-based filtering
    if (userRole === 'admin') {
      if (userOrgId) {
        whereConditions.push(`c.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      }
    } else if (userRole === 'instructor') {
      whereConditions.push(`c.created_by = $${paramIndex}`);
      queryParams.push(userId);
      paramIndex++;
    }

    // Additional filters
    const courseId = searchParams.get('courseId');
    if (courseId) {
      whereConditions.push(`ca.course_id = $${paramIndex}`);
      queryParams.push(courseId);
      paramIndex++;
    }

    const cohortId = searchParams.get('cohortId');
    if (cohortId) {
      whereConditions.push(`ca.cohort_id = $${paramIndex}`);
      queryParams.push(cohortId);
      paramIndex++;
    }

    const classId = searchParams.get('classId');
    if (classId) {
      whereConditions.push(`ca.cohort_id = $${paramIndex}`);
      queryParams.push(classId);
      paramIndex++;
    }

    const subjectId = searchParams.get('subjectId');
    if (subjectId) {
      whereConditions.push(`ca.subject_id = $${paramIndex}`);
      queryParams.push(subjectId);
      paramIndex++;
    }

    const dateFrom = searchParams.get('dateFrom');
    if (dateFrom) {
      whereConditions.push(`ca.created_at >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    const dateTo = searchParams.get('dateTo');
    if (dateTo) {
      whereConditions.push(`ca.created_at <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get assignments data
    const assignmentsQuery = `
      SELECT 
        c.id as "courseId",
        c.title as "courseTitle",
        COALESCE(
          NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
          u.email
        ) as "instructorName",
        CASE 
          WHEN ca.cohort_id IS NOT NULL THEN ch.code
          WHEN ca.program_node_id IS NOT NULL THEN pn.title
          WHEN ca.subject_id IS NOT NULL THEN sc.title
          WHEN ca.year IS NOT NULL THEN 'Year ' || ca.year
          WHEN ca.semester IS NOT NULL THEN 'Semester ' || ca.semester
          ELSE 'Unknown'
        END as "assignedTo",
        CASE 
          WHEN ca.assignment_type = 'main' THEN 'Main'
          ELSE 'Assigned'
        END as "assignmentType",
        ca.created_at as "assignedDate",
        COALESCE(
          NULLIF(TRIM(CONCAT(COALESCE(u_assigned.first_name, ''), ' ', COALESCE(u_assigned.last_name, ''))), ''),
          u_assigned.email
        ) as "assignedByName",
        u_assigned.role as "assignedByRole",
        'Active' as status
      FROM course_assignments ca
      INNER JOIN courses c ON c.id = ca.course_id
      LEFT JOIN course_instructors ci ON ci.course_id = c.id
      LEFT JOIN users u ON u.id = ci.instructor_id
      LEFT JOIN users u_assigned ON u_assigned.id = ca.assigned_by_user_id
      LEFT JOIN cohorts ch ON ch.id = ca.cohort_id
      LEFT JOIN program_nodes pn ON pn.id = ca.program_node_id
      LEFT JOIN subject_catalog sc ON sc.id = ca.subject_id
      ${whereClause}
      ORDER BY ca.created_at DESC
    `;

    const assignmentsResult = await query(assignmentsQuery, queryParams);

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'Course ID',
        'Course Title',
        'Instructor Name',
        'Assigned To',
        'Assignment Type',
        'Assigned Date',
        'Assigned By',
        'Assigned By Role',
        'Status',
      ];

      const rows = assignmentsResult.rows.map((row) => [
        row.courseId,
        row.courseTitle,
        row.instructorName || 'Unknown',
        row.assignedTo,
        row.assignmentType,
        new Date(row.assignedDate).toISOString(),
        row.assignedByName || 'Unknown',
        row.assignedByRole || 'Unknown',
        row.status,
      ]);

      // Escape CSV values
      const escapeCsv = (value) => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      const csvContent = [
        headers.map(escapeCsv).join(','),
        ...rows.map((row) => row.map(escapeCsv).join(',')),
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="course-assignments-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else if (format === 'pdf') {
      // For PDF, return JSON with data (PDF generation can be implemented later with a library like pdfkit or puppeteer)
      return NextResponse.json({
        success: false,
        error: 'PDF export not yet implemented. Please use CSV format.',
      });
    }
  } catch (error) {
    console.error('Error exporting assignment report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to export assignment report',
      },
      { status: error.status || 500 }
    );
  }
}

