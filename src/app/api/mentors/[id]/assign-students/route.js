/**
 * Assign Students to Mentor API Route
 * 
 * POST /api/mentors/[id]/assign-students
 * Assign students to a mentor (Admin only, within their organization)
 * 
 * Request body:
 * {
 *   student_ids: string[] (array of student UUIDs)
 *   cohort_id?: string (optional cohort ID for the assignments)
 * }
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

export async function POST(request, { params }) {
  const client = await getClient();
  
  try {
    console.log('👥 [ASSIGN STUDENTS] ===== ASSIGN STUDENTS STARTED =====');
    
    const { id: mentorId } = params;
    
    // Check authentication and require admin role
    const session = await requireRole(request, ['admin']);
    const adminId = session.user.id;
    const userOrgId = session.user.orgId;

    if (!userOrgId) {
      return NextResponse.json(
        { success: false, error: 'You must belong to an organization' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { student_ids, cohort_id } = body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'student_ids must be a non-empty array' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');
    console.log('👥 [ASSIGN STUDENTS] Transaction started');

    // Verify mentor exists and belongs to admin's organization
    const mentorCheck = await client.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.org_id
       FROM users u
       INNER JOIN user_roles ur ON u.id = ur.user_id
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1 AND r.code = 'mentor' AND u.org_id = $2`,
      [mentorId, userOrgId]
    );

    if (mentorCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Mentor not found or does not belong to your organization' },
        { status: 404 }
      );
    }

    // Validate all students exist and belong to admin's organization
    const studentsCheck = await client.query(
      `SELECT u.id, u.email, u.first_name, u.last_name
       FROM users u
       INNER JOIN user_roles ur ON u.id = ur.user_id
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE u.id = ANY($1::uuid[]) AND r.code = 'student' AND u.org_id = $2`,
      [student_ids, userOrgId]
    );

    if (studentsCheck.rows.length !== student_ids.length) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'One or more students not found or do not belong to your organization' },
        { status: 404 }
      );
    }

    // Validate cohort if provided
    if (cohort_id) {
      const cohortCheck = await client.query(
        'SELECT id FROM cohorts WHERE id = $1',
        [cohort_id]
      );

      if (cohortCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Cohort not found' },
          { status: 404 }
        );
      }
    }

    // Check for existing assignments in the same cohort to prevent duplicates
    // Allow same student in different cohorts, but prevent duplicates in same cohort
    const existingAssignments = await client.query(
      `SELECT student_id, cohort_id
       FROM mentor_student_assignments
       WHERE mentor_id = $1 
         AND student_id = ANY($2::uuid[])
         AND (cohort_id = $3 OR (cohort_id IS NULL AND $3 IS NULL))`,
      [mentorId, student_ids, cohort_id || null]
    );

    const existingStudentIds = new Set(
      existingAssignments.rows.map(row => row.student_id)
    );

    // Filter out students already assigned to this cohort
    const newStudentIds = student_ids.filter(id => !existingStudentIds.has(id));

    if (newStudentIds.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { 
          success: false, 
          error: 'All selected students are already assigned to this mentor in the selected cohort' 
        },
        { status: 400 }
      );
    }

    if (newStudentIds.length < student_ids.length) {
      const duplicateCount = student_ids.length - newStudentIds.length;
      console.log(`👥 [ASSIGN STUDENTS] ⚠️ Skipping ${duplicateCount} duplicate assignment(s)`);
    }

    // Create new assignments only for students not already assigned
    const assignments = [];
    for (const studentId of newStudentIds) {
      const assignmentResult = await client.query(
        `INSERT INTO mentor_student_assignments (mentor_id, student_id, cohort_id, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [mentorId, studentId, cohort_id || null, adminId]
      );
      assignments.push(assignmentResult.rows[0].id);
    }

    await client.query('COMMIT');
    console.log('👥 [ASSIGN STUDENTS] Transaction committed');

    const skippedCount = student_ids.length - newStudentIds.length;
    const assignedCount = assignments.length;

    console.log(`👥 [ASSIGN STUDENTS] ✅ ${assignedCount} student(s) assigned successfully${skippedCount > 0 ? `, ${skippedCount} skipped (already assigned)` : ''}`);

    // Get assigned student details
    const assignedStudentDetails = studentsCheck.rows
      .filter(s => newStudentIds.includes(s.id))
      .map(s => ({
        id: s.id,
        email: s.email,
        first_name: s.first_name,
        last_name: s.last_name
      }));

    return NextResponse.json(
      {
        success: true,
        data: {
          mentor_id: mentorId,
          assigned_students: assignedStudentDetails,
          cohort_id: cohort_id || null,
          assignment_ids: assignments,
          assigned_count: assignedCount,
          skipped_count: skippedCount,
          message: skippedCount > 0 
            ? `${assignedCount} student(s) assigned, ${skippedCount} student(s) were already assigned to this mentor in the selected cohort`
            : `${assignedCount} student(s) assigned successfully`
        }
      },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('👥 [ASSIGN STUDENTS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to assign students' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

