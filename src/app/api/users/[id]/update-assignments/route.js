import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { query, getClient } from "@/lib/db/index.js";
import { attachStudentLink, attachInstructorLinks, attachParentLink, syncUserCohortMetadata } from "@/lib/db/users.js";
import { createAuditLog, extractRequestInfo } from "@/lib/db/auditLogs.js";
import { revalidateTag } from "next/cache";

/**
 * PATCH /api/users/[id]/update-assignments
 * 
 * Updates user's cohorts, instructors, and parent information
 * Only available for admin and superadmin
 * Admin can only update users in their own organization
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization - only admin and superadmin can update assignments
    const userRole = session.user.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden", message: "Only admin and superadmin can update user assignments" },
        { status: 403 }
      );
    }

    // Get user to check organization
    const userResult = await query(
      `SELECT id, email, org_id FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userResult.rows[0];

    // Organization access control: Admin can only update users from their organization
    const userOrgId = session.user.orgId || null;
    if (userRole === "admin" && userOrgId) {
      if (user.org_id !== userOrgId) {
        return NextResponse.json(
          { error: "Forbidden", message: "You can only update users in your own organization" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    
    // Add comprehensive logging
    console.log('🔄 [UPDATE ASSIGNMENTS API] ===== REQUEST RECEIVED =====');
    console.log('🔄 [UPDATE ASSIGNMENTS API] User ID:', id);
    console.log('🔄 [UPDATE ASSIGNMENTS API] Actor Role:', userRole);
    console.log('🔄 [UPDATE ASSIGNMENTS API] Request Body:', JSON.stringify(body, null, 2));
    
    const { 
      cohort_id, // Legacy single cohort (for backward compatibility)
      cohort_ids, // For students and instructors (multiple cohorts)
      subject_offering_ids, 
      roll_no, 
      program_node_id,
      offering_ids, // For instructors
      linked_student_ids, // For parents
      parent_ids, // For students - parent user IDs
      instructor_ids, // For students - assigned instructor IDs
    } = body;

    // Get user's roles to determine what to update
    const rolesResult = await query(
      `SELECT r.code 
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [id]
    );
    const userRoles = rolesResult.rows.map(row => row.code);
    const isStudent = userRoles.includes('student') || userRoles.includes('orgstudent');
    const isInstructor = userRoles.includes('instructor') || userRoles.includes('orginstructor');
    const isParent = userRoles.includes('parent');

    const client = await getClient();
    const { ipAddress, userAgent } = extractRequestInfo(request);

    try {
      await client.query('BEGIN');

      // Update student assignments
      // Support both cohort_id (legacy) and cohort_ids (new - multiple cohorts)
      const studentCohortIds = cohort_ids && Array.isArray(cohort_ids) && cohort_ids.length > 0 
        ? cohort_ids 
        : (cohort_id ? [cohort_id] : []);
      
      if (isStudent && (studentCohortIds.length > 0 || subject_offering_ids !== undefined || instructor_ids !== undefined)) {
        console.log('🎓 [UPDATE ASSIGNMENTS API] Processing student assignments:', {
          cohortIds: studentCohortIds,
          subjectOfferingIds: subject_offering_ids,
          instructorIds: instructor_ids,
          rollNo: roll_no,
          programNodeId: program_node_id,
        });
        
        // Delete existing student links
        await client.query(
          `DELETE FROM student_links WHERE user_id = $1`,
          [id]
        );
        console.log('🎓 [UPDATE ASSIGNMENTS API] Deleted existing student_links');

        // Delete existing user_class_subject_links for this student
        await client.query(
          `DELETE FROM user_class_subject_links WHERE user_id = $1 AND link_type = 'student'`,
          [id]
        );
        console.log('🎓 [UPDATE ASSIGNMENTS API] Deleted existing user_class_subject_links');

        // Note: Instructor-student relationships are inferred from shared cohort/subject assignments
        // We don't need to delete anything from teacher_assignments as that table is for
        // teacher-subject_offering relationships, not instructor-student relationships

        // Create student links for each cohort
        if (studentCohortIds.length > 0) {
          for (const cohortId of studentCohortIds) {
            console.log('🎓 [UPDATE ASSIGNMENTS API] Creating student link for cohort:', cohortId);
            await attachStudentLink({
              userId: id,
              orgId: user.org_id,
              cohortId: cohortId,
              subjectOfferingIds: subject_offering_ids || [],
              rollNo: roll_no || null,
              programNodeId: program_node_id || null,
            });
            console.log('🎓 [UPDATE ASSIGNMENTS API] ✅ Created student link for cohort:', cohortId);
          }
        }

        // Store instructor-student relationship in user_metadata for explicit tracking
        // The relationship is also inferred from shared cohort/subject assignments
        if (instructor_ids && Array.isArray(instructor_ids) && instructor_ids.length > 0) {
          console.log('🎓 [UPDATE ASSIGNMENTS API] Storing instructor-student assignments in metadata:', instructor_ids);
          
          // Verify all instructors exist
          const instructorChecks = await client.query(
            `SELECT id, org_id FROM users WHERE id = ANY($1::uuid[])`,
            [instructor_ids]
          );
          
          const validInstructorIds = instructorChecks.rows
            .filter(row => row.org_id === user.org_id || userRole === 'superadmin')
            .map(row => row.id);
          
          if (validInstructorIds.length !== instructor_ids.length) {
            console.warn('🎓 [UPDATE ASSIGNMENTS API] ⚠️ Some instructors not found or not in same org:', {
              requested: instructor_ids,
              valid: validInstructorIds
            });
          }
          
          // Store instructor assignments in user_metadata
          await client.query(
            `INSERT INTO user_metadata (user_id, key, value)
             VALUES ($1, 'assigned_instructors', $2::jsonb)
             ON CONFLICT (user_id, key) DO UPDATE SET
               value = EXCLUDED.value,
               updated_at = CURRENT_TIMESTAMP`,
            [id, JSON.stringify(validInstructorIds)]
          );
          console.log('🎓 [UPDATE ASSIGNMENTS API] ✅ Stored instructor assignments in metadata:', validInstructorIds);
        } else if (instructor_ids !== undefined && (!instructor_ids || instructor_ids.length === 0)) {
          // Clear instructor assignments if empty array provided
          await client.query(
            `DELETE FROM user_metadata WHERE user_id = $1 AND key = 'assigned_instructors'`,
            [id]
          );
          console.log('🎓 [UPDATE ASSIGNMENTS API] ✅ Cleared instructor assignments from metadata');
        }

        // Update parent links if parent_ids provided
        if (parent_ids && Array.isArray(parent_ids) && parent_ids.length > 0) {
          // Delete existing parent links for this student
          await client.query(
            `DELETE FROM parent_links WHERE student_user_id = $1`,
            [id]
          );
          await client.query(
            `DELETE FROM parent_student_links WHERE student_user_id = $1`,
            [id]
          );

          // Create new parent links
          for (const parentId of parent_ids) {
            await attachParentLink({
              parentUserId: parentId,
              studentUserId: id,
              orgId: user.org_id,
            });

            // Also create parent_student_links entry
            await client.query(
              `INSERT INTO parent_student_links (
                id, parent_user_id, student_user_id, org_id, 
                relationship_type, is_primary_contact, 
                can_view_grades, can_view_attendance, 
                created_at, updated_at
              )
              VALUES (
                uuid_generate_v4(), $1, $2, $3, 
                'parent', false, 
                true, true, 
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
              )
              ON CONFLICT (parent_user_id, student_user_id) DO UPDATE SET
                updated_at = CURRENT_TIMESTAMP`,
              [parentId, id, user.org_id]
            );
          }
        }
      }

      // Update instructor assignments
      if (isInstructor && (cohort_ids !== undefined || offering_ids !== undefined)) {
        // Delete existing instructor_classes
        await client.query(
          `DELETE FROM instructor_classes WHERE instructor_user_id = $1`,
          [id]
        );

        // Delete existing user_class_subject_links for this instructor
        await client.query(
          `DELETE FROM user_class_subject_links WHERE user_id = $1 AND link_type = 'instructor'`,
          [id]
        );

        // If new assignments provided, create new links
        if ((cohort_ids && cohort_ids.length > 0) || (offering_ids && offering_ids.length > 0)) {
          await attachInstructorLinks({
            userId: id,
            orgId: user.org_id,
            cohortIds: cohort_ids || [],
            offeringIds: offering_ids || [],
          });
        }
      }

      // Update parent links (if parent wants to link to different students)
      if (isParent && linked_student_ids !== undefined) {
        // Delete existing parent links
        await client.query(
          `DELETE FROM parent_links WHERE parent_user_id = $1`,
          [id]
        );
        await client.query(
          `DELETE FROM parent_student_links WHERE parent_user_id = $1`,
          [id]
        );

        // Create new parent links
        if (linked_student_ids && Array.isArray(linked_student_ids) && linked_student_ids.length > 0) {
          for (const studentId of linked_student_ids) {
            await attachParentLink({
              parentUserId: id,
              studentUserId: studentId,
              orgId: user.org_id,
            });

            // Also create parent_student_links entry
            await client.query(
              `INSERT INTO parent_student_links (
                id, parent_user_id, student_user_id, org_id, 
                relationship_type, is_primary_contact, 
                can_view_grades, can_view_attendance, 
                created_at, updated_at
              )
              VALUES (
                uuid_generate_v4(), $1, $2, $3, 
                'parent', false, 
                true, true, 
                CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
              )
              ON CONFLICT (parent_user_id, student_user_id) DO UPDATE SET
                updated_at = CURRENT_TIMESTAMP`,
              [id, studentId, user.org_id]
            );
          }
        }
      }

      // Sync metadata for futuristic access
      console.log('🔄 [UPDATE ASSIGNMENTS API] Syncing user cohort metadata...');
      await syncUserCohortMetadata(id);
      console.log('🔄 [UPDATE ASSIGNMENTS API] ✅ Metadata synced');

      // Create audit log
      await createAuditLog({
        actorId: session.user.id,
        targetUserId: id,
        action: 'update_user_assignments',
        resourceType: 'user',
        resourceId: id,
        newValues: {
          cohort_id,
          cohort_ids: studentCohortIds.length > 0 ? studentCohortIds : cohort_ids,
          subject_offering_ids,
          offering_ids,
          linked_student_ids,
          parent_ids,
          instructor_ids,
        },
        ipAddress,
        userAgent,
      });

      await client.query('COMMIT');
      console.log('🔄 [UPDATE ASSIGNMENTS API] ✅ Transaction committed successfully');

      // Revalidate cache
      revalidateTag("users");
      revalidateTag(`user-${id}`);

      console.log('🔄 [UPDATE ASSIGNMENTS API] ===== SUCCESS =====');
      return NextResponse.json({
        success: true,
        message: "User assignments updated successfully",
      });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('🔄 [UPDATE ASSIGNMENTS API] ❌ Transaction error:', error);
      console.error('🔄 [UPDATE ASSIGNMENTS API] ❌ Error stack:', error.stack);
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('🔄 [UPDATE ASSIGNMENTS API] ❌ ===== ERROR =====');
    console.error('🔄 [UPDATE ASSIGNMENTS API] ❌ Error message:', error.message);
    console.error('🔄 [UPDATE ASSIGNMENTS API] ❌ Error stack:', error.stack);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message || "Failed to update user assignments" },
      { status: 500 }
    );
  }
}

