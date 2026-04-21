/**
 * Cohort Filter Courses API Route
 * 
 * Filters courses by cohort selection (program nodes, classes, subjects, streams, academic years, sections)
 * 
 * GET /api/cohorts/filter-courses - Filter courses by cohort selection
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/cohorts/filter-courses
 * Filter courses by cohort selection (admin only)
 * 
 * Query Parameters:
 * - programNodeIds[]: Array of program node IDs
 * - classIds[]: Array of class (cohort) IDs
 * - subjectIds[]: Array of subject IDs
 * - streamIds[]: Array of stream IDs (program node IDs with node_type = 'stream')
 * - academicYearIds[]: Array of academic session IDs
 * - sectionIds[]: Array of section IDs
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;

    const { searchParams } = new URL(request.url);

    // Parse array parameters
    const parseArrayParam = (paramName) => {
      const values = searchParams.getAll(paramName);
      return values.length > 0 ? values.filter(v => v && v.trim()) : null;
    };

    const programNodeIds = parseArrayParam('programNodeIds[]');
    const classIds = parseArrayParam('classIds[]'); // These are cohort IDs
    const subjectIds = parseArrayParam('subjectIds[]');
    const streamIds = parseArrayParam('streamIds[]');
    const academicYearIds = parseArrayParam('academicYearIds[]');
    const sectionIds = parseArrayParam('sectionIds[]');

    // Build WHERE conditions
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Role-based org filtering
    if (userRole === 'admin' && userOrgId) {
      whereConditions.push(`c.org_id = $${paramIndex}`);
      queryParams.push(userOrgId);
      paramIndex++;
    }
    // Superadmin can see all courses

    // Build course assignment matching conditions
    const assignmentConditions = [];

    // Filter by cohorts (classes)
    if (classIds && classIds.length > 0) {
      assignmentConditions.push(`ca.cohort_id = ANY($${paramIndex}::uuid[])`);
      queryParams.push(classIds);
      paramIndex++;
    }

    // Filter by program nodes
    if (programNodeIds && programNodeIds.length > 0) {
      // Match via cohorts that have these program nodes
      assignmentConditions.push(`EXISTS (
        SELECT 1 FROM cohorts ch
        WHERE ch.id = ca.cohort_id AND ch.program_node_id = ANY($${paramIndex}::uuid[])
      )`);
      queryParams.push(programNodeIds);
      paramIndex++;
    }

    // Filter by subjects
    if (subjectIds && subjectIds.length > 0) {
      assignmentConditions.push(`ca.subject_id = ANY($${paramIndex}::uuid[])`);
      queryParams.push(subjectIds);
      paramIndex++;
    }

    // Filter by streams (program nodes with node_type = 'stream')
    if (streamIds && streamIds.length > 0) {
      // Match via cohorts that have these stream program nodes
      assignmentConditions.push(`EXISTS (
        SELECT 1 FROM cohorts ch
        JOIN program_nodes pn ON ch.program_node_id = pn.id
        WHERE ch.id = ca.cohort_id 
        AND pn.id = ANY($${paramIndex}::uuid[])
        AND pn.node_type = 'stream'
      )`);
      queryParams.push(streamIds);
      paramIndex++;
    }

    // Filter by academic years (sessions)
    if (academicYearIds && academicYearIds.length > 0) {
      // Match via cohorts that have these academic sessions
      assignmentConditions.push(`EXISTS (
        SELECT 1 FROM cohorts ch
        WHERE ch.id = ca.cohort_id AND ch.session_id = ANY($${paramIndex}::uuid[])
      )`);
      queryParams.push(academicYearIds);
      paramIndex++;
    }

    // Filter by sections
    if (sectionIds && sectionIds.length > 0) {
      // Match via cohorts that have these sections
      assignmentConditions.push(`EXISTS (
        SELECT 1 FROM cohorts ch
        WHERE ch.id = ca.cohort_id AND ch.section_id = ANY($${paramIndex}::uuid[])
      )`);
      queryParams.push(sectionIds);
      paramIndex++;
    }

    // If no filters provided, return empty result
    if (assignmentConditions.length === 0 && !classIds && !programNodeIds && !subjectIds && !streamIds && !academicYearIds && !sectionIds) {
      return NextResponse.json({
        success: true,
        courses: [],
        matchedCohorts: [],
        message: 'No filters provided',
      });
    }

    // Build the main query
    // We need to find courses that match any of the assignment conditions
    const allWhereConditions = [...whereConditions];
    
    // Add course assignment conditions
    if (assignmentConditions.length > 0) {
      allWhereConditions.push(`(${assignmentConditions.join(' OR ')})`);
    }
    
    allWhereConditions.push('ca.is_active = true');

    const whereClause = allWhereConditions.length > 0 
      ? `WHERE ${allWhereConditions.join(' AND ')}`
      : '';

    // Get matching courses via course_assignments
    const coursesQuery = `
      SELECT DISTINCT
        c.id,
        c.title,
        c.slug,
        c.description,
        c.org_id,
        c.created_by,
        c.status,
        c.created_at,
        c.updated_at,
        o.name as org_name
      FROM courses c
      INNER JOIN course_assignments ca ON c.id = ca.course_id
      LEFT JOIN organizations o ON c.org_id = o.id
      ${whereClause}
      ORDER BY c.title ASC
    `;

    const coursesResult = await query(coursesQuery, queryParams);

    // Get matched cohorts for reference
    const cohortConditions = [];
    const cohortParams = [];
    let cohortParamIndex = 1;

    if (classIds && classIds.length > 0) {
      cohortConditions.push(`ch.id = ANY($${cohortParamIndex}::uuid[])`);
      cohortParams.push(classIds);
      cohortParamIndex++;
    }

    if (programNodeIds && programNodeIds.length > 0) {
      cohortConditions.push(`ch.program_node_id = ANY($${cohortParamIndex}::uuid[])`);
      cohortParams.push(programNodeIds);
      cohortParamIndex++;
    }

    if (academicYearIds && academicYearIds.length > 0) {
      cohortConditions.push(`ch.session_id = ANY($${cohortParamIndex}::uuid[])`);
      cohortParams.push(academicYearIds);
      cohortParamIndex++;
    }

    if (sectionIds && sectionIds.length > 0) {
      cohortConditions.push(`ch.section_id = ANY($${cohortParamIndex}::uuid[])`);
      cohortParams.push(sectionIds);
      cohortParamIndex++;
    }

    let matchedCohorts = [];
    if (cohortConditions.length > 0) {
      // Add org filter for admin
      if (userRole === 'admin' && userOrgId) {
        cohortConditions.push(`ch.org_id = $${cohortParamIndex}`);
        cohortParams.push(userOrgId);
        cohortParamIndex++;
      }

      const cohortsQuery = `
        SELECT DISTINCT
          ch.id,
          ch.code,
          ch.level,
          ch.status,
          pn.title as program_node_title,
          s.label as section_label,
          a.code as session_code
        FROM cohorts ch
        LEFT JOIN program_nodes pn ON ch.program_node_id = pn.id
        LEFT JOIN sections s ON ch.section_id = s.id
        LEFT JOIN academic_sessions a ON ch.session_id = a.id
        WHERE ${cohortConditions.join(' OR ')}
        ORDER BY ch.code ASC
        LIMIT 100
      `;

      const cohortsResult = await query(cohortsQuery, cohortParams);
      matchedCohorts = cohortsResult.rows.map(row => ({
        id: row.id,
        code: row.code,
        level: row.level,
        status: row.status,
        programNodeTitle: row.program_node_title,
        sectionLabel: row.section_label,
        sessionCode: row.session_code,
      }));
    }

    const courses = coursesResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      orgId: row.org_id,
      orgName: row.org_name,
      createdBy: row.created_by,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      courses,
      matchedCohorts,
      filters: {
        programNodeIds: programNodeIds || [],
        classIds: classIds || [],
        subjectIds: subjectIds || [],
        streamIds: streamIds || [],
        academicYearIds: academicYearIds || [],
        sectionIds: sectionIds || [],
      },
    });
  } catch (error) {
    console.error('❌ [API] [Cohort Filter Courses GET] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to filter courses',
      },
      { status: error.status || 500 }
    );
  }
}

