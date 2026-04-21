import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { query, getClient } from "@/lib/db/index.js";
import { getRoleByCode, createInvite } from "@/lib/db/users.js";
import { generateTokenHex, sha256 } from "@/lib/security/tokens.js";
import { generateTemporaryPassword } from "@/lib/security/passwordGenerator.js";
import { validateInviteWithActor } from "@/lib/validation/userSchemas.js";
import { sendEmail } from "@/lib/email/send.js";
import { inviteTemplate } from "@/lib/email/templates/invite.js";
import { createAuditLog, extractRequestInfo } from "@/lib/db/auditLogs.js";
import { revalidateTag } from "next/cache";
import bcrypt from "bcryptjs";

/**
 * POST /api/users/bulk-invite
 * 
 * Bulk invite users
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

    const body = await request.json();
    const { invites: invitesData, options = {} } = body;

    if (!invitesData || !Array.isArray(invitesData) || invitesData.length === 0) {
      return NextResponse.json(
        { error: "MISSING_DATA", message: "invites array is required" },
        { status: 400 }
      );
    }

    // Limit batch size
    const MAX_BATCH_SIZE = 50; // Smaller for invites due to email sending
    if (invitesData.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: "BATCH_TOO_LARGE", message: `Maximum ${MAX_BATCH_SIZE} invites per batch` },
        { status: 400 }
      );
    }

    const actor = {
      role: userRole,
      orgId: session.user.orgId || null,
    };

    // Enforce organization for admin
    if (userRole === "admin" && session.user.orgId) {
      for (const inviteData of invitesData) {
        if (inviteData.org_id && inviteData.org_id !== session.user.orgId) {
          return NextResponse.json(
            { error: "FORBIDDEN", message: "You can only invite users for your own organization" },
            { status: 403 }
          );
        }
        inviteData.org_id = session.user.orgId;
      }
    }

    const { ipAddress, userAgent } = extractRequestInfo(request);
    const results = {
      success: [],
      errors: [],
    };

    const expiryHours = options.expiry_hours || 24;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    for (let i = 0; i < invitesData.length; i++) {
      const inviteData = invitesData[i];
      
      try {
        // Validate invite data
        let validatedData;
        try {
          validatedData = validateInviteWithActor(inviteData, actor);
        } catch (e) {
          results.errors.push({
            index: i,
            email: inviteData.email || 'unknown',
            error: e.message || 'Validation error',
          });
          continue;
        }

        // Get or create role
        let role = await getRoleByCode(validatedData.role);
        if (!role) {
          const roleTitles = {
            superadmin: "Super Admin",
            admin: "Admin",
            instructor: "Instructor",
            student: "Student",
            vendor: "Vendor",
            parent: "Parent",
            alumni: "Alumni",
          };
          
          const roleRes = await query(
            `INSERT INTO roles (id, code, title, created_at, updated_at)
             VALUES (uuid_generate_v4(), $1::role_code_enum, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (code) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
             RETURNING id, code, title`,
            [validatedData.role, roleTitles[validatedData.role] || validatedData.role]
          );
          
          if (roleRes.rows.length > 0) {
            role = roleRes.rows[0];
          } else {
            throw new Error(`Role '${validatedData.role}' not found and could not be created`);
          }
        }

        // Generate invitation token
        const token = generateTokenHex(32);
        const tokenHash = sha256(token);
        const tokenHashHex = tokenHash.toString("hex");

        // Generate temporary password if mode is temp_password_email
        let temporaryPassword = null;
        let temporaryPasswordHash = null;
        const inviteMode = validatedData.delivery === "invite_link" ? "invite_link" : "temp_password_email";
        
        if (inviteMode === "temp_password_email") {
          temporaryPassword = generateTemporaryPassword(16);
          temporaryPasswordHash = await bcrypt.hash(temporaryPassword, 10);
        }

        // Build payload
        const payload = {
          first_name: validatedData.first_name || null,
          last_name: validatedData.last_name || null,
          avatar_url: validatedData.avatar_url || null,
          temporary_password_hash: temporaryPasswordHash || null,
        };

        // Add role-specific fields
        if (validatedData.role === "student") {
          if (validatedData.cohort_id) payload.cohort_id = validatedData.cohort_id;
          if (validatedData.section_id) payload.section_id = validatedData.section_id;
          if (validatedData.roll_no) payload.roll_no = validatedData.roll_no;
        }

        if (validatedData.role === "instructor") {
          if (validatedData.cohort_ids) payload.cohort_ids = validatedData.cohort_ids;
          if (validatedData.offering_ids) payload.offering_ids = validatedData.offering_ids;
        }

        if (validatedData.role === "parent" && validatedData.linked_student_ids) {
          payload.linked_student_ids = validatedData.linked_student_ids;
        }

        // Create invitation
        const invite = await createInvite({
          email: validatedData.email,
          orgId: validatedData.org_id || null,
          roleId: role.id,
          creatorId: session.user.id,
          mode: inviteMode,
          mfa_required: validatedData.mfa_required || false,
          mfa_method: validatedData.mfa_method || "none",
          payload,
          expiresAt,
          tokenHash: tokenHashHex,
        });

        // Build invite URL using centralized helper
        const { getBaseUrl } = await import('@/lib/utils/url.js');
        const baseUrl = getBaseUrl(request);
        const inviteUrl = `${baseUrl}/invite/accept?token=${token}`;

        // Get organization label
        let orgLabel = "the organization";
        if (validatedData.org_id) {
          const orgRes = await query('SELECT name, display_name FROM organizations WHERE id = $1', [validatedData.org_id]);
          if (orgRes.rows.length > 0) {
            orgLabel = orgRes.rows[0].display_name || orgRes.rows[0].name || orgLabel;
          }
        }

        // Send email (non-blocking - continue even if email fails)
        try {
          const emailTemplate = inviteTemplate({
            orgLabel,
            roleTitle: role.title || validatedData.role,
            expiryHours,
            acceptUrl: inviteUrl,
            temporaryPassword: temporaryPassword,
            mode: inviteMode,
          });

          await sendEmail({
            to: validatedData.email,
            subject: emailTemplate.subject,
            text: emailTemplate.text,
            html: emailTemplate.html,
            category: 'user_invite_bulk',
          });
        } catch (emailError) {
          console.error(`Failed to send email to ${validatedData.email}:`, emailError);
          // Continue - invitation is still created
        }

        // Create audit log
        await createAuditLog({
          actorId: session.user.id,
          action: 'invite_user',
          resourceType: 'invitation',
          resourceId: invite.id,
          newValues: {
            email: validatedData.email,
            role: validatedData.role,
            org_id: validatedData.org_id,
          },
          metadata: {
            bulk_invite: true,
            invite_index: i,
          },
          ipAddress,
          userAgent,
        });

        results.success.push({
          index: i,
          email: validatedData.email,
          invite_id: invite.id,
          invite_url: inviteUrl,
        });

      } catch (error) {
        results.errors.push({
          index: i,
          email: inviteData.email || 'unknown',
          error: error.message || 'Unknown error',
        });
      }
    }

    // Revalidate cache
    revalidateTag("users");
    revalidateTag("users-list");

    return NextResponse.json({
      success: true,
      message: `Bulk invite completed: ${results.success.length} succeeded, ${results.errors.length} failed`,
      results: {
        total: invitesData.length,
        succeeded: results.success.length,
        failed: results.errors.length,
        success: results.success,
        errors: results.errors,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Bulk invite error:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

