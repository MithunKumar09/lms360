/**
 * Assignment Options API Route
 * 
 * GET /api/courses/[id]/assignment-options - Get available assignment options for a course
 * 
 * Query Parameters:
 * - role: 'admin' | 'instructor' (required)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

export async function GET(request, { params }) {
  try {
    // Require admin or instructor role
    const session = await requireRole(request, ['admin', 'instructor']);
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || session.user.org_id;
    const userId = session.user.id;
    const courseId = params.id; // Changed from params.courseId

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'Course ID is required' },
        { status: 400 }
      );
    }

    // Verify course exists and user has access
    const courseCheck = await query(
      `SELECT id, org_id, created_by FROM courses WHERE id = $1`,
      [courseId]
    );

    if (courseCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    const course = courseCheck.rows[0];

    // Check access permissions
    if (userRole === 'admin' && course.org_id !== userOrgId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    if (userRole === 'instructor' && course.org_id !== userOrgId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get main assignments (from course creation)
    const mainAssignmentsQuery = `
      SELECT 
        cohort_id,
        program_node_id,
        subject_id,
        year,
        semester
      FROM course_assignments
      WHERE course_id = $1
      AND assignment_type = 'main'
      AND is_active = true
    `;
    const mainAssignmentsResult = await query(mainAssignmentsQuery, [courseId]);

    const mainAssignments = {
      cohorts: [],
      programNodes: [],
      subjects: [],
      years: [],
      semesters: [],
    };

    mainAssignmentsResult.rows.forEach((row) => {
      if (row.cohort_id) mainAssignments.cohorts.push(row.cohort_id);
      if (row.program_node_id) mainAssignments.programNodes.push(row.program_node_id);
      if (row.subject_id) mainAssignments.subjects.push(row.subject_id);
      if (row.year) mainAssignments.years.push(row.year);
      if (row.semester) mainAssignments.semesters.push(row.semester);
    });

    // Get existing assigned assignments (already assigned via this feature)
    const existingAssignmentsQuery = `
      SELECT 
        cohort_id,
        program_node_id,
        subject_id,
        year,
        semester
      FROM course_assignments
      WHERE course_id = $1
      AND assignment_type = 'assigned'
      AND is_active = true
    `;
    const existingAssignmentsResult = await query(existingAssignmentsQuery, [courseId]);

    const existingAssignments = {
      cohorts: [],
      programNodes: [],
      subjects: [],
      years: [],
      semesters: [],
    };

    existingAssignmentsResult.rows.forEach((row) => {
      if (row.cohort_id) existingAssignments.cohorts.push(row.cohort_id);
      if (row.program_node_id) existingAssignments.programNodes.push(row.program_node_id);
      if (row.subject_id) existingAssignments.subjects.push(row.subject_id);
      if (row.year) existingAssignments.years.push(row.year);
      if (row.semester) existingAssignments.semesters.push(row.semester);
    });

    // Get available options based on role
    let optionsQuery = '';
    let optionsParams = [];
    let paramIndex = 1;

    if (userRole === 'admin') {
      // Admin: Get all cohorts, program nodes, subjects from their organization
      optionsQuery = `
        SELECT 
          'cohorts' as type,
          jsonb_agg(
            jsonb_build_object(
              'id', ch.id,
              'name', ch.code,
              'programNode', jsonb_build_object(
                'id', pn.id,
                'name', pn.title
              ),
              'year', t.number,
              'semester', NULL,
              'isMain', CASE WHEN $${paramIndex}::uuid[] <> ARRAY[]::uuid[] AND ch.id = ANY($${paramIndex}::uuid[]) THEN true ELSE false END,
              'isAssigned', CASE WHEN $${paramIndex + 1}::uuid[] <> ARRAY[]::uuid[] AND ch.id = ANY($${paramIndex + 1}::uuid[]) THEN true ELSE false END
            )
          ) as data
        FROM cohorts ch
        INNER JOIN program_nodes pn ON pn.id = ch.program_node_id
        LEFT JOIN terms t ON t.id = ch.term_id
        WHERE ch.org_id = $${paramIndex + 2}
        AND ch.status = 'published'
        
        UNION ALL
        
        SELECT 
          'programNodes' as type,
          jsonb_agg(
            jsonb_build_object(
              'id', pn.id,
              'name', pn.title,
              'isMain', CASE WHEN $${paramIndex + 3}::uuid[] <> ARRAY[]::uuid[] AND pn.id = ANY($${paramIndex + 3}::uuid[]) THEN true ELSE false END,
              'isAssigned', CASE WHEN $${paramIndex + 4}::uuid[] <> ARRAY[]::uuid[] AND pn.id = ANY($${paramIndex + 4}::uuid[]) THEN true ELSE false END
            )
          ) as data
        FROM program_nodes pn
        WHERE pn.org_id = $${paramIndex + 2}
        AND pn.status = 'active'
        
        UNION ALL
        
        SELECT 
          'subjects' as type,
          jsonb_agg(
            jsonb_build_object(
              'id', sc.id,
              'name', sc.title,
              'isMain', CASE WHEN $${paramIndex + 5}::uuid[] <> ARRAY[]::uuid[] AND sc.id = ANY($${paramIndex + 5}::uuid[]) THEN true ELSE false END,
              'isAssigned', CASE WHEN $${paramIndex + 6}::uuid[] <> ARRAY[]::uuid[] AND sc.id = ANY($${paramIndex + 6}::uuid[]) THEN true ELSE false END
            )
          ) as data
        FROM subject_catalog sc
        WHERE sc.org_id = $${paramIndex + 2}
        AND sc.status = 'active'
        
        UNION ALL
        
        SELECT 
          'years' as type,
          jsonb_agg(DISTINCT t.number ORDER BY t.number) as data
        FROM terms t
        WHERE t.org_id = $${paramIndex + 2}
        AND t.term_type = 'year'
        
        UNION ALL
        
        SELECT 
          'semesters' as type,
          jsonb_agg(DISTINCT t.number ORDER BY t.number) as data
        FROM terms t
        WHERE t.org_id = $${paramIndex + 2}
        AND t.term_type = 'semester'
      `;
      // Build parameter arrays for admin query
      const mainCohorts = mainAssignments.cohorts.length > 0 ? mainAssignments.cohorts : [null];
      const existingCohorts = existingAssignments.cohorts.length > 0 ? existingAssignments.cohorts : [null];
      const mainProgramNodes = mainAssignments.programNodes.length > 0 ? mainAssignments.programNodes : [null];
      const existingProgramNodes = existingAssignments.programNodes.length > 0 ? existingAssignments.programNodes : [null];
      const mainSubjects = mainAssignments.subjects.length > 0 ? mainAssignments.subjects : [null];
      const existingSubjects = existingAssignments.subjects.length > 0 ? existingAssignments.subjects : [null];
      
      optionsParams = [
        mainCohorts.length > 0 ? mainCohorts : ['00000000-0000-0000-0000-000000000000'],
        existingCohorts.length > 0 ? existingCohorts : ['00000000-0000-0000-0000-000000000000'],
        userOrgId,
        mainProgramNodes.length > 0 ? mainProgramNodes : ['00000000-0000-0000-0000-000000000000'],
        existingProgramNodes.length > 0 ? existingProgramNodes : ['00000000-0000-0000-0000-000000000000'],
        mainSubjects.length > 0 ? mainSubjects : ['00000000-0000-0000-0000-000000000000'],
        existingSubjects.length > 0 ? existingSubjects : ['00000000-0000-0000-0000-000000000000'],
      ];
    } else if (userRole === 'instructor') {
      // Instructor: Get only their classes and subjects
      // Use instructor_classes table (links instructors to cohorts and subject offerings)
      // Also check teacher_assignments as fallback
      // If no specific assignments, show all org cohorts/subjects as fallback
      optionsQuery = `
        WITH instructor_cohorts AS (
          SELECT DISTINCT ic.cohort_id 
          FROM instructor_classes ic 
          WHERE ic.instructor_user_id = $${paramIndex + 2}::uuid
          UNION
          SELECT DISTINCT so.cohort_id
          FROM subject_offerings so
          INNER JOIN teacher_assignments ta ON ta.subject_offering_id = so.id
          WHERE ta.teacher_id = $${paramIndex + 2}::uuid
        ),
        instructor_subjects AS (
          SELECT DISTINCT so.subject_id
          FROM subject_offerings so
          INNER JOIN instructor_classes ic ON ic.subject_offering_id = so.id
          WHERE ic.instructor_user_id = $${paramIndex + 2}::uuid
          UNION
          SELECT DISTINCT so.subject_id
          FROM subject_offerings so
          INNER JOIN teacher_assignments ta ON ta.subject_offering_id = so.id
          WHERE ta.teacher_id = $${paramIndex + 2}::uuid
        )
        SELECT 
          'cohorts' as type,
          COALESCE(jsonb_agg(DISTINCT
            jsonb_build_object(
              'id', ch.id,
              'name', ch.code,
              'programNode', jsonb_build_object(
                'id', COALESCE(pn.id, '00000000-0000-0000-0000-000000000000'::uuid),
                'name', COALESCE(pn.title, '')
              ),
              'year', t.number,
              'semester', NULL,
              'isMain', CASE WHEN $${paramIndex}::uuid[] <> ARRAY[]::uuid[] AND ch.id = ANY($${paramIndex}::uuid[]) THEN true ELSE false END,
              'isAssigned', CASE WHEN $${paramIndex + 1}::uuid[] <> ARRAY[]::uuid[] AND ch.id = ANY($${paramIndex + 1}::uuid[]) THEN true ELSE false END
            )
          ) FILTER (WHERE ch.id IS NOT NULL), '[]'::jsonb) as data
        FROM cohorts ch
        LEFT JOIN program_nodes pn ON pn.id = ch.program_node_id
        LEFT JOIN terms t ON t.id = ch.term_id
        WHERE ch.org_id = $${paramIndex + 3}::uuid
        AND ch.status = 'published'
        AND (
          ch.id IN (SELECT cohort_id FROM instructor_cohorts)
          OR NOT EXISTS (SELECT 1 FROM instructor_cohorts) -- Fallback: show all if no assignments
        )
        AND (
          ch.id NOT IN (
            SELECT cohort_id FROM course_assignments
            WHERE course_id = $${paramIndex + 4}::uuid
            AND assignment_type = 'main'
            AND cohort_id IS NOT NULL
          )
          -- Include existing assigned cohorts (they'll be marked as isAssigned)
          OR ch.id IN (
            SELECT cohort_id FROM course_assignments
            WHERE course_id = $${paramIndex + 4}::uuid
            AND assignment_type = 'assigned'
            AND cohort_id IS NOT NULL
          )
        )
        
        UNION ALL
        
        SELECT 
          'subjects' as type,
          COALESCE(jsonb_agg(DISTINCT
            jsonb_build_object(
              'id', sc.id,
              'name', sc.title,
              'isMain', CASE WHEN $${paramIndex + 5}::uuid[] <> ARRAY[]::uuid[] AND sc.id = ANY($${paramIndex + 5}::uuid[]) THEN true ELSE false END,
              'isAssigned', CASE WHEN $${paramIndex + 6}::uuid[] <> ARRAY[]::uuid[] AND sc.id = ANY($${paramIndex + 6}::uuid[]) THEN true ELSE false END
            )
          ) FILTER (WHERE sc.id IS NOT NULL), '[]'::jsonb) as data
        FROM subject_catalog sc
        WHERE sc.org_id = $${paramIndex + 3}::uuid
        AND sc.status = 'active'
        AND (
          sc.id IN (SELECT subject_id FROM instructor_subjects)
          OR NOT EXISTS (SELECT 1 FROM instructor_subjects) -- Fallback: show all if no assignments
        )
        AND (
          sc.id NOT IN (
            SELECT subject_id FROM course_assignments
            WHERE course_id = $${paramIndex + 4}
            AND assignment_type = 'main'
            AND subject_id IS NOT NULL
          )
          -- Include existing assigned subjects (they'll be marked as isAssigned)
          OR sc.id IN (
            SELECT subject_id FROM course_assignments
            WHERE course_id = $${paramIndex + 4}
            AND assignment_type = 'assigned'
            AND subject_id IS NOT NULL
          )
        )
      `;
      // Build params - use empty array if no main assignments to avoid UUID casting issues
      const mainCohortsInstr = mainAssignments.cohorts.length > 0 
        ? mainAssignments.cohorts 
        : ['00000000-0000-0000-0000-000000000000'];
      const existingCohortsInstr = existingAssignments.cohorts.length > 0 
        ? existingAssignments.cohorts 
        : ['00000000-0000-0000-0000-000000000000'];
      const mainSubjectsInstr = mainAssignments.subjects.length > 0 
        ? mainAssignments.subjects 
        : ['00000000-0000-0000-0000-000000000000'];
      const existingSubjectsInstr = existingAssignments.subjects.length > 0 
        ? existingAssignments.subjects 
        : ['00000000-0000-0000-0000-000000000000'];
      
      // Parameter order: mainCohorts, existingCohorts, userId (for CTE), userOrgId, courseId, mainSubjects, existingSubjects
      optionsParams = [
        mainCohortsInstr,
        existingCohortsInstr,
        userId, // paramIndex + 2 for CTE
        userOrgId, // paramIndex + 2 for WHERE clause
        courseId, // paramIndex + 4 for WHERE clause
        mainSubjectsInstr, // paramIndex + 5
        existingSubjectsInstr, // paramIndex + 6
      ];
    }

    const optionsResult = await query(optionsQuery, optionsParams);

    // Format options data
    const options = {
      years: [],
      semesters: [],
      cohorts: [],
      programNodes: [],
      subjects: [],
    };

    optionsResult.rows.forEach((row) => {
      if (row.type === 'years') {
        options.years = row.data || [];
      } else if (row.type === 'semesters') {
        options.semesters = row.data || [];
      } else if (row.type === 'cohorts') {
        options.cohorts = row.data || [];
      } else if (row.type === 'programNodes') {
        options.programNodes = row.data || [];
      } else if (row.type === 'subjects') {
        options.subjects = row.data || [];
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        options,
        mainAssignments,
        existingAssignments,
      },
    });
  } catch (error) {
    console.error('Error fetching assignment options:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch assignment options',
      },
      { status: error.status || 500 }
    );
  }
}

