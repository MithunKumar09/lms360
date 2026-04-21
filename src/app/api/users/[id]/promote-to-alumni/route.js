import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { query, getClient } from "@/lib/db/index.js";
import { getUserById, getRoleByCode, assignRole, removeRole } from "@/lib/db/users.js";
import { createAuditLog, extractRequestInfo } from "@/lib/db/auditLogs.js";
import { revalidateTag } from "next/cache";

/**
 * POST /api/users/[id]/promote-to-alumni
 * 
 * Promote a student to alumni role
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { preserve_links = true } = body;

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

    // Get user
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Organization access control
    if (userRole === "admin" && session.user.orgId) {
      const userOrgRes = await query(
        `SELECT org_id FROM user_roles WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
        [id, session.user.orgId]
      );
      
      if (userOrgRes.rows.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Check if user has student role
    const userRolesRes = await query(
      `SELECT r.code, ur.org_id
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND r.code = 'student'`,
      [id]
    );

    if (userRolesRes.rows.length === 0) {
      return NextResponse.json(
        { error: "NOT_STUDENT", message: "User is not a student" },
        { status: 400 }
      );
    }

    const studentRole = userRolesRes.rows[0];
    const orgId = studentRole.org_id;

    const client = await getClient();
    const { ipAddress, userAgent } = extractRequestInfo(request);

    try {
      await client.query('BEGIN');

      // Get alumni role
      const alumniRole = await getRoleByCode('alumni');
      if (!alumniRole) {
        throw new Error('Alumni role not found');
      }

      // Remove student role
      await removeRole({ userId: id, roleCode: 'student', orgId });

      // Add alumni role
      await assignRole({ userId: id, roleCode: 'alumni', orgId });

      // Update user's primary role column
      await client.query(
        `UPDATE users SET role = 'alumni', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );

      // Preserve student links if requested
      if (preserve_links) {
        // Copy student_links to user_class_subject_links with link_type='alumni'
        await client.query(
          `INSERT INTO user_class_subject_links (id, user_id, org_id, cohort_id, subject_offering_id, link_type, created_at, updated_at)
           SELECT uuid_generate_v4(), sl.user_id, sl.org_id, sl.cohort_id, NULL, 'alumni', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
           FROM student_links sl
           WHERE sl.user_id = $1
           ON CONFLICT DO NOTHING`,
          [id]
        );
      }

      // Create audit log
      await createAuditLog({
        actorId: session.user.id,
        targetUserId: id,
        action: 'promote_to_alumni',
        resourceType: 'user',
        resourceId: id,
        oldValues: { role: 'student', org_id: orgId },
        newValues: { role: 'alumni', org_id: orgId },
        metadata: { preserve_links },
        ipAddress,
        userAgent,
      });

      await client.query('COMMIT');

      // Revalidate cache
      revalidateTag("users");
      revalidateTag(`user-${id}`);

      return NextResponse.json({
        success: true,
        message: "Student promoted to alumni successfully",
        user: {
          id,
          role: 'alumni',
        },
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error promoting to alumni:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

