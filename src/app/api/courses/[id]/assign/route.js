/**
 * Assign Course API Route
 * 
 * POST /api/courses/[id]/assign - Assign course to selected options
 * 
 * Request Body:
 * {
 *   "assignments": {
 *     "cohortIds": ["uuid1", "uuid2"],
 *     "programNodeIds": ["uuid1"],
 *     "classIds": ["uuid1", "uuid2"],
 *     "subjectIds": ["uuid1"],
 *     "years": [1, 2],
 *     "semesters": [1]
 *   }
 * }
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

export async function POST(request, { params }) {
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

    // Parse request body
    const body = await request.json();
    const { assignments } = body;

    console.log('\n📋 ========== ASSIGN COURSE REQUEST ==========');
    console.log('🔹 Course ID:', courseId);
    console.log('🔹 User ID:', userId);
    console.log('🔹 User Role:', userRole);
    console.log('🔹 Organization ID:', userOrgId);
    console.log('🔹 Request Body:', JSON.stringify(body, null, 2));
    console.log('🔹 Assignments Data:', JSON.stringify(assignments, null, 2));

    if (!assignments || typeof assignments !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Assignments object is required' },
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
    console.log('🔹 Course Found:', {
      id: course.id,
      org_id: course.org_id,
      created_by: course.created_by,
    });

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

    // For instructors: Validate that selected assignments match their assigned cohorts/subjects
    let instructorAllowedCohorts = [];
    let instructorAllowedSubjects = [];
    
    if (userRole === 'instructor') {
      // Get instructor's assigned cohorts from instructor_classes and user_class_subject_links
      const instructorCohortsResult = await query(
        `SELECT DISTINCT cohort_id 
         FROM instructor_classes 
         WHERE instructor_user_id = $1
         UNION
         SELECT DISTINCT cohort_id 
         FROM user_class_subject_links 
         WHERE user_id = $1 AND link_type = 'instructor'`,
        [userId]
      );
      
      // Get instructor's assigned subjects
      const instructorSubjectsResult = await query(
        `SELECT DISTINCT so.subject_id
         FROM instructor_classes ic
         INNER JOIN subject_offerings so ON ic.subject_offering_id = so.id
         WHERE ic.instructor_user_id = $1 AND so.subject_id IS NOT NULL
         UNION
         SELECT DISTINCT so.subject_id
         FROM user_class_subject_links ucsl
         INNER JOIN subject_offerings so ON ucsl.subject_offering_id = so.id
         WHERE ucsl.user_id = $1 AND ucsl.link_type = 'instructor' AND so.subject_id IS NOT NULL`,
        [userId]
      );

      instructorAllowedCohorts = instructorCohortsResult.rows.map(row => row.cohort_id);
      instructorAllowedSubjects = instructorSubjectsResult.rows.map(row => row.subject_id);

      console.log('👨‍🏫 [ASSIGN COURSE] Instructor allowed assignments:', {
        cohorts: instructorAllowedCohorts,
        subjects: instructorAllowedSubjects,
      });

      // Validate cohort assignments
      const requestedCohortIds = [
        ...(assignments.cohortIds || []),
        ...(assignments.classIds || []), // classIds also map to cohorts
      ].filter(id => id);

      if (requestedCohortIds.length > 0) {
        const invalidCohorts = requestedCohortIds.filter(
          id => !instructorAllowedCohorts.includes(id)
        );
        
        if (invalidCohorts.length > 0) {
          console.log('👨‍🏫 [ASSIGN COURSE] ❌ Invalid cohort assignments:', invalidCohorts);
          return NextResponse.json(
            {
              success: false,
              error: 'VALIDATION_ERROR',
              message: 'You can only assign courses to cohorts you are assigned to',
              details: {
                invalidCohorts,
                allowedCohorts: instructorAllowedCohorts,
              },
            },
            { status: 403 }
          );
        }
      }

      // Validate subject assignments
      const requestedSubjectIds = (assignments.subjectIds || []).filter(id => id);
      
      if (requestedSubjectIds.length > 0) {
        const invalidSubjects = requestedSubjectIds.filter(
          id => !instructorAllowedSubjects.includes(id)
        );
        
        if (invalidSubjects.length > 0) {
          console.log('👨‍🏫 [ASSIGN COURSE] ❌ Invalid subject assignments:', invalidSubjects);
          return NextResponse.json(
            {
              success: false,
              error: 'VALIDATION_ERROR',
              message: 'You can only assign courses to subjects you are assigned to',
              details: {
                invalidSubjects,
                allowedSubjects: instructorAllowedSubjects,
              },
            },
            { status: 403 }
          );
        }
      }

      // If instructor has no assignments, prevent any assignments
      if (instructorAllowedCohorts.length === 0 && instructorAllowedSubjects.length === 0) {
        console.log('👨‍🏫 [ASSIGN COURSE] ❌ Instructor has no assignments');
        return NextResponse.json(
          {
            success: false,
            error: 'NO_ASSIGNMENTS',
            message: 'You must be assigned to at least one cohort or subject before assigning courses',
          },
          { status: 403 }
        );
      }

      // Validate that at least one requested assignment matches instructor's assignments
      const hasValidCohortAssignment = requestedCohortIds.length > 0 && 
        requestedCohortIds.some(id => instructorAllowedCohorts.includes(id));
      const hasValidSubjectAssignment = requestedSubjectIds.length > 0 && 
        requestedSubjectIds.some(id => instructorAllowedSubjects.includes(id));
      
      if (requestedCohortIds.length > 0 && !hasValidCohortAssignment &&
          requestedSubjectIds.length > 0 && !hasValidSubjectAssignment) {
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'None of the selected assignments match your assigned cohorts or subjects',
          },
          { status: 403 }
        );
      }

      // Instructors can only assign to cohorts and subjects (not program nodes, years, or semesters)
      if ((assignments.programNodeIds && assignments.programNodeIds.length > 0) ||
          (assignments.years && assignments.years.length > 0) ||
          (assignments.semesters && assignments.semesters.length > 0)) {
        console.log('👨‍🏫 [ASSIGN COURSE] ❌ Instructor attempted to assign program nodes, years, or semesters');
        return NextResponse.json(
          {
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Instructors can only assign courses to cohorts and subjects',
          },
          { status: 403 }
        );
      }
    }

    // Get main assignments to prevent duplicate assignments
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
      cohorts: new Set(),
      programNodes: new Set(),
      subjects: new Set(),
      years: new Set(),
      semesters: new Set(),
    };

    mainAssignmentsResult.rows.forEach((row) => {
      if (row.cohort_id) mainAssignments.cohorts.add(row.cohort_id);
      if (row.program_node_id) mainAssignments.programNodes.add(row.program_node_id);
      if (row.subject_id) mainAssignments.subjects.add(row.subject_id);
      if (row.year) mainAssignments.years.add(row.year);
      if (row.semester) mainAssignments.semesters.add(row.semester);
    });

    console.log('\n🔒 Main Assignments (Read-Only):', {
      cohorts: Array.from(mainAssignments.cohorts),
      programNodes: Array.from(mainAssignments.programNodes),
      subjects: Array.from(mainAssignments.subjects),
      years: Array.from(mainAssignments.years),
      semesters: Array.from(mainAssignments.semesters),
    });

    // Prepare assignments to insert
    const assignmentsToInsert = [];
    const insertedAssignments = [];

    // Process cohort assignments (classIds also map to cohorts)
    const cohortIds = [
      ...(assignments.cohortIds || []),
      ...(assignments.classIds || []),
    ].filter((id) => id && !mainAssignments.cohorts.has(id));

    console.log('\n📦 Processing Assignments:');
    console.log('  - Cohort IDs (from cohortIds + classIds):', cohortIds);

    for (const cohortId of cohortIds) {
      // Check if already assigned
      const existingCheck = await query(
        `SELECT id FROM course_assignments
         WHERE course_id = $1
         AND cohort_id = $2
         AND assignment_type = 'assigned'
         AND is_active = true`,
        [courseId, cohortId]
      );

      if (existingCheck.rows.length === 0) {
        assignmentsToInsert.push({
          course_id: courseId,
          assigned_by_user_id: userId,
          cohort_id: cohortId,
          assignment_type: 'assigned',
        });
      }
    }

    // Process program node assignments
    const programNodeIds = (assignments.programNodeIds || []).filter(
      (id) => id && !mainAssignments.programNodes.has(id)
    );
    console.log('  - Program Node IDs:', programNodeIds);

    for (const programNodeId of programNodeIds) {
      const existingCheck = await query(
        `SELECT id FROM course_assignments
         WHERE course_id = $1
         AND program_node_id = $2
         AND assignment_type = 'assigned'
         AND is_active = true`,
        [courseId, programNodeId]
      );

      if (existingCheck.rows.length === 0) {
        assignmentsToInsert.push({
          course_id: courseId,
          assigned_by_user_id: userId,
          program_node_id: programNodeId,
          assignment_type: 'assigned',
        });
      }
    }

    // Process subject assignments
    const subjectIds = (assignments.subjectIds || []).filter(
      (id) => id && !mainAssignments.subjects.has(id)
    );
    console.log('  - Subject IDs (after filtering main assignments):', subjectIds);
    console.log('  - Main Subjects Set:', Array.from(mainAssignments.subjects));

    for (const subjectId of subjectIds) {
      console.log(`  🔍 Checking existing assignment for subject: ${subjectId}`);
      const existingCheck = await query(
        `SELECT id FROM course_assignments
         WHERE course_id = $1
         AND subject_id = $2
         AND assignment_type = 'assigned'
         AND is_active = true`,
        [courseId, subjectId]
      );

      console.log(`  📊 Existing check result for subject ${subjectId}:`, {
        found: existingCheck.rows.length > 0,
        existingIds: existingCheck.rows.map(r => r.id),
      });

      if (existingCheck.rows.length === 0) {
        const assignmentToAdd = {
          course_id: courseId,
          assigned_by_user_id: userId,
          subject_id: subjectId,
          assignment_type: 'assigned',
        };
        console.log(`  ✅ Adding subject assignment:`, assignmentToAdd);
        assignmentsToInsert.push(assignmentToAdd);
      } else {
        console.log(`  ⚠️  Subject ${subjectId} already assigned, skipping`);
      }
    }

    // Process year assignments
    const years = (assignments.years || []).filter(
      (year) => year && !mainAssignments.years.has(year)
    );
    console.log('  - Years:', years);

    for (const year of years) {
      const existingCheck = await query(
        `SELECT id FROM course_assignments
         WHERE course_id = $1
         AND year = $2
         AND assignment_type = 'assigned'
         AND is_active = true`,
        [courseId, year]
      );

      if (existingCheck.rows.length === 0) {
        assignmentsToInsert.push({
          course_id: courseId,
          assigned_by_user_id: userId,
          year: year,
          assignment_type: 'assigned',
        });
      }
    }

    // Process semester assignments
    const semesters = (assignments.semesters || []).filter(
      (semester) => semester && !mainAssignments.semesters.has(semester)
    );
    console.log('  - Semesters:', semesters);

    for (const semester of semesters) {
      const existingCheck = await query(
        `SELECT id FROM course_assignments
         WHERE course_id = $1
         AND semester = $2
         AND assignment_type = 'assigned'
         AND is_active = true`,
        [courseId, semester]
      );

      if (existingCheck.rows.length === 0) {
        assignmentsToInsert.push({
          course_id: courseId,
          assigned_by_user_id: userId,
          semester: semester,
          assignment_type: 'assigned',
        });
      }
    }

    // Insert assignments in a transaction
    console.log('\n💾 Assignments to Insert:', assignmentsToInsert.length);
    if (assignmentsToInsert.length > 0) {
      console.log('📝 Assignment Details:', JSON.stringify(assignmentsToInsert, null, 2));
      await query('BEGIN');

      try {
        for (const assignment of assignmentsToInsert) {
          console.log('\n  ➕ Inserting Assignment:', JSON.stringify(assignment, null, 2));
          const insertQuery = `
            INSERT INTO course_assignments (
              course_id,
              assigned_by_user_id,
              cohort_id,
              program_node_id,
              subject_id,
              year,
              semester,
              assignment_type,
              is_active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, cohort_id, program_node_id, subject_id, year, semester, assignment_type, is_active, created_at, updated_at
          `;

          const insertParams = [
            assignment.course_id,
            assignment.assigned_by_user_id,
            assignment.cohort_id || null,
            assignment.program_node_id || null,
            assignment.subject_id || null,
            assignment.year || null,
            assignment.semester || null,
            assignment.assignment_type,
            true,
          ];

          console.log('  🔍 SQL Query:', insertQuery);
          console.log('  🔍 SQL Parameters:', JSON.stringify(insertParams, null, 2));

          const result = await query(insertQuery, insertParams);

          const inserted = result.rows[0];
          console.log('  ✅ Inserted Successfully:', JSON.stringify(inserted, null, 2));
          
          const assignmentRecord = {
            id: inserted.id,
            type: 'assigned',
            target: inserted.cohort_id
              ? 'cohort'
              : inserted.program_node_id
              ? 'programNode'
              : inserted.subject_id
              ? 'subject'
              : inserted.year
              ? 'year'
              : 'semester',
            targetId:
              inserted.cohort_id ||
              inserted.program_node_id ||
              inserted.subject_id ||
              inserted.year ||
              inserted.semester,
            targetName: 'Assignment created', // Can be enhanced to fetch actual names
          };
          
          insertedAssignments.push(assignmentRecord);
          console.log('  📊 Assignment Record:', JSON.stringify(assignmentRecord, null, 2));
        }

        await query('COMMIT');
        console.log('\n✅ Transaction Committed Successfully');
      } catch (error) {
        await query('ROLLBACK');
        console.error('\n❌ Transaction Rolled Back:', error);
        throw error;
      }
    } else {
      console.log('\n⚠️  No assignments to insert (all may be duplicates or main assignments)');
    }

    console.log('\n📊 Final Result:');
    console.log('  - Total Inserted:', insertedAssignments.length);
    console.log('  - Inserted Assignments:', JSON.stringify(insertedAssignments, null, 2));
    console.log('==========================================\n');

    return NextResponse.json({
      success: true,
      message: 'Course assigned successfully',
      data: {
        assignedCount: insertedAssignments.length,
        assignments: insertedAssignments,
      },
    });
  } catch (error) {
    console.error('Error assigning course:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to assign course',
      },
      { status: error.status || 500 }
    );
  }
}

