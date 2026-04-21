/**
 * Assignment Report API Route
 * 
 * GET /api/courses/assignments/report - Get assignment report data
 * 
 * Query Parameters:
 * - role: 'admin' | 'instructor' (required)
 * - format: 'json' | 'csv' | 'pdf' (default: 'json')
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
    const format = searchParams.get('format') || 'json';

    // Build WHERE clause
    const whereConditions = ['ca.is_active = $1'];
    const queryParams = [true];
    let paramIndex = 2;

    // Role-based filtering
    if (userRole === 'admin') {
      // Admin: Only see assignments from their organization
      if (userOrgId) {
        whereConditions.push(`c.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      }
    } else if (userRole === 'instructor') {
      // Instructor: See assignments from courses matching their classes/subjects
      // OR assignments they created themselves
      if (userOrgId) {
        whereConditions.push(`c.org_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
        
        // Filter to:
        // 1. Assignments created by this instructor
        // 2. OR assignments where the target matches instructor's cohorts/subjects
        whereConditions.push(`(
          ca.assigned_by_user_id = $${paramIndex}
          OR ca.cohort_id IN (
            SELECT DISTINCT ic.cohort_id 
            FROM instructor_classes ic 
            WHERE ic.instructor_user_id = $${paramIndex}
          )
          OR ca.cohort_id IN (
            SELECT DISTINCT so.cohort_id
            FROM subject_offerings so
            INNER JOIN teacher_assignments ta ON ta.subject_offering_id = so.id
            WHERE ta.teacher_id = $${paramIndex}
          )
          OR ca.subject_id IN (
            SELECT DISTINCT so.subject_id
            FROM subject_offerings so
            INNER JOIN instructor_classes ic ON ic.subject_offering_id = so.id
            WHERE ic.instructor_user_id = $${paramIndex}
          )
          OR ca.subject_id IN (
            SELECT DISTINCT so.subject_id
            FROM subject_offerings so
            INNER JOIN teacher_assignments ta ON ta.subject_offering_id = so.id
            WHERE ta.teacher_id = $${paramIndex}
          )
        )`);
        queryParams.push(userId);
        paramIndex++;
      } else {
        return NextResponse.json(
          { success: false, error: 'Instructor must belong to an organization' },
          { status: 403 }
        );
      }
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
      // classId is cohort_id
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

    // Build WHERE clause
    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get assignments with details
    const assignmentsQuery = `
      SELECT 
        ca.id,
        ca.assignment_type as "assignmentType",
        ca.created_at as "assignedDate",
        ca.cohort_id as "cohortId",
        ca.program_node_id as "programNodeId",
        ca.subject_id as "subjectId",
        ca.year,
        ca.semester,
        -- Course info
        jsonb_build_object(
          'id', c.id,
          'title', c.title
        ) as course,
        -- Instructor info
        (
          SELECT jsonb_build_object(
            'id', u.id,
            'name', COALESCE(
              NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
              u.email
            )
          )
          FROM course_instructors ci
          INNER JOIN users u ON u.id = ci.instructor_id
          WHERE ci.course_id = c.id
          LIMIT 1
        ) as instructor,
        -- Assigned by info
        jsonb_build_object(
          'id', u_assigned.id,
          'name', COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(u_assigned.first_name, ''), ' ', COALESCE(u_assigned.last_name, ''))), ''),
            u_assigned.email
          ),
          'role', u_assigned.role
        ) as "assignedBy",
        -- Assigned to info
        CASE 
          WHEN ca.cohort_id IS NOT NULL THEN
            jsonb_build_object(
              'type', 'cohort',
              'name', ch.code,
              'details', COALESCE(
                CASE WHEN t.term_type = 'year' THEN 'Year ' || t.number || ', ' ELSE '' END ||
                CASE WHEN t2.term_type = 'semester' THEN 'Semester ' || t2.number ELSE '' END,
                ''
              )
            )
          WHEN ca.program_node_id IS NOT NULL THEN
            jsonb_build_object(
              'type', 'programNode',
              'name', pn.title,
              'details', ''
            )
          WHEN ca.subject_id IS NOT NULL THEN
            jsonb_build_object(
              'type', 'subject',
              'name', sc.title,
              'details', ''
            )
          WHEN ca.year IS NOT NULL THEN
            jsonb_build_object(
              'type', 'year',
              'name', 'Year ' || ca.year,
              'details', ''
            )
          WHEN ca.semester IS NOT NULL THEN
            jsonb_build_object(
              'type', 'semester',
              'name', 'Semester ' || ca.semester,
              'details', ''
            )
          ELSE jsonb_build_object('type', 'unknown', 'name', 'Unknown', 'details', '')
        END as "assignedTo",
        'active' as status
      FROM course_assignments ca
      INNER JOIN courses c ON c.id = ca.course_id
      LEFT JOIN users u_assigned ON u_assigned.id = ca.assigned_by_user_id
      LEFT JOIN cohorts ch ON ch.id = ca.cohort_id
      LEFT JOIN terms t ON t.id = ch.term_id AND t.term_type = 'year'
      LEFT JOIN terms t2 ON t2.id = ch.term_id AND t2.term_type = 'semester'
      LEFT JOIN program_nodes pn ON pn.id = ca.program_node_id
      LEFT JOIN subject_catalog sc ON sc.id = ca.subject_id
      ${whereClause}
      ORDER BY ca.created_at DESC
    `;

    const assignmentsResult = await query(assignmentsQuery, queryParams);

    // Format assignments data
    const assignments = assignmentsResult.rows.map((row) => ({
      id: row.id,
      course: row.course,
      instructor: row.instructor || { id: null, name: 'Unknown' },
      assignedTo: row.assignedTo,
      assignmentType: row.assignmentType,
      assignedDate: row.assignedDate,
      assignedBy: row.assignedBy,
      status: row.status,
    }));

    // Get summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as "totalAssignments",
        COUNT(*) FILTER (WHERE ca.assignment_type = 'main') as "mainAssignments",
        COUNT(*) FILTER (WHERE ca.assignment_type = 'assigned') as "assignedCourses"
      FROM course_assignments ca
      INNER JOIN courses c ON c.id = ca.course_id
      ${whereClause}
    `;
    const summaryResult = await query(summaryQuery, queryParams);
    const summary = {
      totalAssignments: parseInt(summaryResult.rows[0].totalAssignments, 10),
      mainAssignments: parseInt(summaryResult.rows[0].mainAssignments, 10),
      assignedCourses: parseInt(summaryResult.rows[0].assignedCourses, 10),
    };

    // Return based on format
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: {
          assignments,
          summary,
        },
      });
    } else {
      // For CSV/PDF, redirect to export endpoint
      return NextResponse.json({
        success: false,
        error: 'Use /api/courses/assignments/export endpoint for CSV/PDF format',
      });
    }
  } catch (error) {
    console.error('Error fetching assignment report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch assignment report',
      },
      { status: error.status || 500 }
    );
  }
}

