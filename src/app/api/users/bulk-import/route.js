import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { query, getClient } from "@/lib/db/index.js";
import { createUserWithRole, attachStudentLink, attachInstructorLinks, attachParentLink, getRoleByCode } from "@/lib/db/users.js";
import { hashPassword } from "@/lib/security/passwords.js";
import { generateTemporaryPassword } from "@/lib/security/passwordGenerator.js";
import { createAuditLog, extractRequestInfo } from "@/lib/db/auditLogs.js";
import { revalidateTag } from "next/cache";
import { validateCreateWithActor } from "@/lib/validation/userSchemas.js";

/**
 * POST /api/users/bulk-import
 * 
 * Bulk import users from CSV/JSON data
 */
export async function POST(request) {
  try {
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

    // Tenant-isolation guard: an admin must have a resolved organization. Without this, a null
    // session orgId would skip org enforcement below and let payload org_id pass through unchecked.
    if (userRole === "admin" && !session.user.orgId) {
      return NextResponse.json(
        { error: "NO_ORG", message: "Your account is not linked to an organization, so you cannot import users. Contact a super admin." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { users: usersData, options = {} } = body;

    if (!usersData || !Array.isArray(usersData) || usersData.length === 0) {
      return NextResponse.json(
        { error: "MISSING_DATA", message: "users array is required" },
        { status: 400 }
      );
    }

    // Limit batch size
    const MAX_BATCH_SIZE = 100;
    if (usersData.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: "BATCH_TOO_LARGE", message: `Maximum ${MAX_BATCH_SIZE} users per batch` },
        { status: 400 }
      );
    }

    const actor = {
      role: userRole,
      orgId: session.user.orgId || null,
    };

    // Enforce organization for admin
    if (userRole === "admin" && session.user.orgId) {
      // Ensure all users are for the admin's organization
      for (const userData of usersData) {
        if (userData.org_id && userData.org_id !== session.user.orgId) {
          return NextResponse.json(
            { error: "FORBIDDEN", message: "You can only import users for your own organization" },
            { status: 403 }
          );
        }
        userData.org_id = session.user.orgId;
      }
    }

    const client = await getClient();
    const { ipAddress, userAgent } = extractRequestInfo(request);
    const results = {
      success: [],
      errors: [],
    };

    try {
      await client.query('BEGIN');

      for (let i = 0; i < usersData.length; i++) {
        const userData = usersData[i];
        
        try {
          // Validate user data
          let validatedData;
          try {
            validatedData = validateCreateWithActor(userData, actor);
          } catch (e) {
            results.errors.push({
              index: i,
              email: userData.email || 'unknown',
              error: e.message || 'Validation error',
            });
            continue;
          }

          // Duplicate guard: email is globally unique and createUserWithRole upserts on conflict,
          // which would silently overwrite an existing account. Report it as an error instead.
          const existing = await client.query(
            'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
            [validatedData.email]
          );
          if (existing.rows.length > 0) {
            results.errors.push({
              index: i,
              email: validatedData.email,
              error: 'User with this email already exists',
            });
            continue;
          }

          // Generate temporary password if not provided
          const tempPassword = validatedData.temp_password || generateTemporaryPassword(16);
          const passwordHash = await hashPassword(tempPassword);

          // Create user
          const user = await createUserWithRole({
            email: validatedData.email,
            first_name: validatedData.first_name || null,
            last_name: validatedData.last_name || null,
            avatar_url: validatedData.avatar_url || null,
            status: validatedData.status || "active",
            password_hash: passwordHash,
            mfa_required: validatedData.mfa_required || false,
            mfa_method: validatedData.mfa_method || "none",
            must_reset_password: true,
            roleCode: validatedData.role,
            orgId: validatedData.org_id || null,
          });

          // Handle role-specific links
          if (validatedData.role === "student" && validatedData.cohort_id) {
            await attachStudentLink({
              userId: user.id,
              orgId: validatedData.org_id || null,
              cohortId: validatedData.cohort_id,
              sectionId: validatedData.section_id || null,
              rollNo: validatedData.roll_no || null,
              programNodeId: validatedData.program_node_id || null,
            });
          }

          if (validatedData.role === "instructor") {
            await attachInstructorLinks({
              userId: user.id,
              orgId: validatedData.org_id || null,
              cohortIds: validatedData.cohort_ids || [],
              offeringIds: validatedData.offering_ids || [],
            });
          }

          if (validatedData.role === "parent" && validatedData.linked_student_ids?.length > 0) {
            for (const studentId of validatedData.linked_student_ids) {
              await attachParentLink({
                parentUserId: user.id,
                studentUserId: studentId,
                orgId: validatedData.org_id || null,
              });
            }
          }

          // Create audit log
          await createAuditLog({
            actorId: session.user.id,
            targetUserId: user.id,
            action: 'create_user',
            resourceType: 'user',
            resourceId: user.id,
            newValues: {
              email: user.email,
              role: validatedData.role,
              org_id: validatedData.org_id,
            },
            metadata: {
              bulk_import: true,
              import_index: i,
            },
            ipAddress,
            userAgent,
          });

          results.success.push({
            index: i,
            email: user.email,
            id: user.id,
            temp_password: options.return_passwords ? tempPassword : undefined,
          });

        } catch (error) {
          results.errors.push({
            index: i,
            email: userData.email || 'unknown',
            error: error.message || 'Unknown error',
          });
        }
      }

      await client.query('COMMIT');

      // Revalidate cache
      revalidateTag("users");
      revalidateTag("users-list");

      return NextResponse.json({
        success: true,
        message: `Bulk import completed: ${results.success.length} succeeded, ${results.errors.length} failed`,
        results: {
          total: usersData.length,
          succeeded: results.success.length,
          failed: results.errors.length,
          success: results.success,
          errors: results.errors,
        },
      }, { status: 200 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Bulk import error:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
