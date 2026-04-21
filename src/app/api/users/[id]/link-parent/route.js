import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { query, getClient } from "@/lib/db/index.js";
import { getUserById } from "@/lib/db/users.js";
import { createAuditLog, extractRequestInfo } from "@/lib/db/auditLogs.js";
import { revalidateTag } from "next/cache";

/**
 * POST /api/users/[id]/link-parent
 * 
 * Link a parent user to student(s)
 */
export async function POST(request, { params }) {
  try {
    const { id } = params; // parent user ID
    const body = await request.json();
    const { student_ids, relationship_type = 'parent', is_primary_contact = false, can_view_grades = true, can_view_attendance = true } = body;

    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json(
        { error: "MISSING_STUDENT_IDS", message: "student_ids array is required" },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization (superadmin or admin only)
    const userRole = session.user.role;
    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get parent user
    const parentUser = await getUserById(id);
    if (!parentUser) {
      return NextResponse.json({ error: "Parent user not found" }, { status: 404 });
    }

    // Verify parent user has parent role
    const parentRoleCheck = await query(
      `SELECT r.code FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND r.code = 'parent'
       LIMIT 1`,
      [id]
    );

    if (parentRoleCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "NOT_PARENT", message: "User is not a parent" },
        { status: 400 }
      );
    }

    // Organization access control
    if (userRole === "admin" && session.user.orgId) {
      const parentOrgRes = await query(
        `SELECT org_id FROM user_roles WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
        [id, session.user.orgId]
      );
      
      if (parentOrgRes.rows.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const client = await getClient();
    const { ipAddress, userAgent } = extractRequestInfo(request);
    const linkedStudents = [];

    try {
      await client.query('BEGIN');

      for (const studentId of student_ids) {
        // Verify student exists and has student role
        const studentCheck = await query(
          `SELECT u.id, ur.org_id
           FROM users u
           JOIN user_roles ur ON ur.user_id = u.id
           JOIN roles r ON r.id = ur.role_id
           WHERE u.id = $1 AND r.code = 'student'
           LIMIT 1`,
          [studentId]
        );

        if (studentCheck.rows.length === 0) {
          throw new Error(`Student ${studentId} not found or is not a student`);
        }

        const student = studentCheck.rows[0];
        const orgId = student.org_id;

        // Verify parent and student are in the same organization
        const parentOrgRes = await query(
          `SELECT org_id FROM user_roles WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
          [id, orgId]
        );

        if (parentOrgRes.rows.length === 0 && userRole !== "superadmin") {
          throw new Error(`Parent and student must be in the same organization`);
        }

        // Create parent-student link
        await client.query(
          `INSERT INTO parent_student_links (
            id, parent_user_id, student_user_id, org_id,
            relationship_type, is_primary_contact, can_view_grades, can_view_attendance,
            created_at, updated_at
          )
          VALUES (
            uuid_generate_v4(), $1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (parent_user_id, student_user_id) DO UPDATE SET
            relationship_type = EXCLUDED.relationship_type,
            is_primary_contact = EXCLUDED.is_primary_contact,
            can_view_grades = EXCLUDED.can_view_grades,
            can_view_attendance = EXCLUDED.can_view_attendance,
            updated_at = CURRENT_TIMESTAMP`,
          [id, studentId, orgId, relationship_type, is_primary_contact, can_view_grades, can_view_attendance]
        );

        // Also create basic parent_links entry for backward compatibility
        await client.query(
          `INSERT INTO parent_links (id, parent_user_id, student_user_id, org_id, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (parent_user_id, student_user_id) DO NOTHING`,
          [id, studentId, orgId]
        );

        linkedStudents.push(studentId);
      }

      // Create audit log
      await createAuditLog({
        actorId: session.user.id,
        targetUserId: id,
        action: 'link_parent',
        resourceType: 'user',
        resourceId: id,
        newValues: {
          student_ids: linkedStudents,
          relationship_type,
          is_primary_contact,
        },
        ipAddress,
        userAgent,
      });

      await client.query('COMMIT');

      // Revalidate cache
      revalidateTag("users");
      revalidateTag(`user-${id}`);

      return NextResponse.json({
        success: true,
        message: `Parent linked to ${linkedStudents.length} student(s) successfully`,
        linked_students: linkedStudents,
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error linking parent:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

