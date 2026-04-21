import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { query, getClient } from "@/lib/db/index.js";
import { getUserById } from "@/lib/db/users.js";
import { createAuditLog, extractRequestInfo } from "@/lib/db/auditLogs.js";
import { revalidateTag } from "next/cache";

/**
 * POST /api/users/[id]/assign-class-subject
 * 
 * Assign classes and subjects to a user (student, instructor, or alumni)
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { cohort_ids = [], subject_offering_ids = [], link_type = null } = body;

    if (cohort_ids.length === 0 && subject_offering_ids.length === 0) {
      return NextResponse.json(
        { error: "MISSING_ASSIGNMENTS", message: "At least one cohort_id or subject_offering_id is required" },
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

    // Get user
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's roles to determine link_type
    const userRolesRes = await query(
      `SELECT r.code, ur.org_id
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1
       ORDER BY CASE r.code
         WHEN 'student' THEN 1
         WHEN 'instructor' THEN 2
         WHEN 'alumni' THEN 3
         ELSE 4
       END
       LIMIT 1`,
      [id]
    );

    if (userRolesRes.rows.length === 0) {
      return NextResponse.json(
        { error: "NO_VALID_ROLE", message: "User must have student, instructor, or alumni role" },
        { status: 400 }
      );
    }

    const userRoleData = userRolesRes.rows[0];
    const determinedLinkType = link_type || userRoleData.code;
    const orgId = userRoleData.org_id;

    if (!['student', 'instructor', 'alumni'].includes(determinedLinkType)) {
      return NextResponse.json(
        { error: "INVALID_LINK_TYPE", message: "link_type must be student, instructor, or alumni" },
        { status: 400 }
      );
    }

    // Organization access control
    if (userRole === "admin" && session.user.orgId) {
      if (orgId !== session.user.orgId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const client = await getClient();
    const { ipAddress, userAgent } = extractRequestInfo(request);
    const assignedLinks = [];

    try {
      await client.query('BEGIN');

      // Assign cohorts
      for (const cohortId of cohort_ids) {
        // Verify cohort exists and is in the same organization
        const cohortCheck = await query(
          `SELECT id, org_id FROM cohorts WHERE id = $1`,
          [cohortId]
        );

        if (cohortCheck.rows.length === 0) {
          throw new Error(`Cohort ${cohortId} not found`);
        }

        const cohort = cohortCheck.rows[0];
        if (cohort.org_id !== orgId && userRole !== "superadmin") {
          throw new Error(`Cohort must be in the same organization as user`);
        }

        // For cohorts, we need to get subject offerings for that cohort
        // For now, create a link with NULL subject_offering_id
        await client.query(
          `INSERT INTO user_class_subject_links (
            id, user_id, org_id, cohort_id, subject_offering_id, link_type,
            created_at, updated_at
          )
          VALUES (
            uuid_generate_v4(), $1, $2, $3, NULL, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (user_id, cohort_id, subject_offering_id) DO UPDATE SET
            updated_at = CURRENT_TIMESTAMP`,
          [id, orgId, cohortId, determinedLinkType]
        );

        assignedLinks.push({ cohort_id: cohortId, type: 'cohort' });
      }

      // Assign subject offerings
      for (const offeringId of subject_offering_ids) {
        // Verify subject offering exists and get its cohort
        const offeringCheck = await query(
          `SELECT so.id, so.cohort_id, c.org_id
           FROM subject_offerings so
           JOIN cohorts c ON c.id = so.cohort_id
           WHERE so.id = $1`,
          [offeringId]
        );

        if (offeringCheck.rows.length === 0) {
          throw new Error(`Subject offering ${offeringId} not found`);
        }

        const offering = offeringCheck.rows[0];
        if (offering.org_id !== orgId && userRole !== "superadmin") {
          throw new Error(`Subject offering must be in the same organization as user`);
        }

        // Create link with both cohort and subject offering
        await client.query(
          `INSERT INTO user_class_subject_links (
            id, user_id, org_id, cohort_id, subject_offering_id, link_type,
            created_at, updated_at
          )
          VALUES (
            uuid_generate_v4(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
          ON CONFLICT (user_id, cohort_id, subject_offering_id) DO UPDATE SET
            updated_at = CURRENT_TIMESTAMP`,
          [id, orgId, offering.cohort_id, offeringId, determinedLinkType]
        );

        assignedLinks.push({ subject_offering_id: offeringId, cohort_id: offering.cohort_id, type: 'subject_offering' });
      }

      // Create audit log
      await createAuditLog({
        actorId: session.user.id,
        targetUserId: id,
        action: 'assign_class_subject',
        resourceType: 'user',
        resourceId: id,
        newValues: {
          link_type: determinedLinkType,
          assignments: assignedLinks,
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
        message: `Class/subject assignments completed successfully`,
        assignments: assignedLinks,
        link_type: determinedLinkType,
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error assigning class/subject:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

