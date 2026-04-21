import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import {
  suspendUser,
  activateUser,
  revokeSessions,
  listSessions,
  assignRole,
  removeRole,
  getUserById,
} from "@/lib/db/users.js";
import { query, getClient } from "@/lib/db/index.js";
import { generateTokenHex, sha256 } from "@/lib/security/tokens.js";
import { sendEmail } from "@/lib/email/send.js";
import { inviteTemplate } from "@/lib/email/templates/invite.js";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { createAuditLog, extractRequestInfo } from "@/lib/db/auditLogs.js";

export async function GET(_request, { params }) {
  try {
    const { id } = params;
    
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user basic info
    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Organization access control: Admin can only access users from their organization
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || null;
    
    if (userRole === "admin" && userOrgId) {
      // Get user's organization
      const userOrgRes = await query(
        `SELECT org_id FROM user_roles WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
        [id, userOrgId]
      );
      
      if (userOrgRes.rows.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (userRole !== "superadmin") {
      // Other roles (instructor, student, etc.) can only access users from their organization
      if (userOrgId) {
        const userOrgRes = await query(
          `SELECT org_id FROM user_roles WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
          [id, userOrgId]
        );
        
        if (userOrgRes.rows.length === 0) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    // Get user roles
    const rolesRes = await query(
      `SELECT r.code, r.title, ur.org_id, o.name AS org_label
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       LEFT JOIN organizations o ON o.id = ur.org_id
       WHERE ur.user_id = $1
       ORDER BY r.code, o.name`,
      [id]
    );
    const roles = rolesRes.rows.map(r => ({
      id: r.code + (r.org_id || ''),
      code: r.code,
      title: r.title,
      org_id: r.org_id,
      org_label: r.org_label || (r.org_id ? null : 'Global')
    }));

    // Get user links (student, instructor, parent)
    // Note: These tables may not exist, so we handle errors gracefully
    let links = { student: [], instructor: [], parent: [], parent_students: [] };
    
    try {
      const studentLinksRes = await query(
        `SELECT 
          sl.id, 
          sl.cohort_id,
          sl.roll_no,
          sl.program_node_id,
          c.code as cohort_code,
          c.level as cohort_level
         FROM student_links sl
         LEFT JOIN cohorts c ON c.id = sl.cohort_id
         WHERE sl.user_id = $1`,
        [id]
      );
      
      // Get subject offerings for each student link
      const studentLinksWithSubjects = await Promise.all(
        studentLinksRes.rows.map(async (link) => {
          try {
            const subjectLinksRes = await query(
              `SELECT 
                ucsl.subject_offering_id,
                so.subject_id,
                sc.title as subject_title,
                sc.code as subject_code
               FROM user_class_subject_links ucsl
               LEFT JOIN subject_offerings so ON so.id = ucsl.subject_offering_id
               LEFT JOIN subject_catalog sc ON sc.id = so.subject_id
               WHERE ucsl.user_id = $1 
                 AND ucsl.cohort_id = $2 
                 AND ucsl.link_type = 'student'`,
              [id, link.cohort_id]
            );
            
            // Find assigned instructor(s) for this student's cohort/subjects
            let assignedInstructors = [];
            try {
              const instructorRes = await query(
                `SELECT DISTINCT
                  ta.teacher_id as instructor_id,
                  u.id,
                  u.first_name,
                  u.last_name,
                  u.email
                 FROM teacher_assignments ta
                 JOIN users u ON u.id = ta.teacher_id
                 JOIN user_class_subject_links ucsl2 ON ucsl2.subject_offering_id = ta.subject_offering_id
                 WHERE ucsl2.user_id = $1 
                   AND ucsl2.cohort_id = $2
                   AND ucsl2.link_type = 'student'
                 UNION
                 SELECT DISTINCT
                  ic.instructor_user_id as instructor_id,
                  u.id,
                  u.first_name,
                  u.last_name,
                  u.email
                 FROM instructor_classes ic
                 JOIN users u ON u.id = ic.instructor_user_id
                 WHERE ic.cohort_id = $2
                   AND (ic.subject_offering_id IN (
                     SELECT ucsl3.subject_offering_id 
                     FROM user_class_subject_links ucsl3 
                     WHERE ucsl3.user_id = $1 
                       AND ucsl3.cohort_id = $2 
                       AND ucsl3.link_type = 'student'
                   ) OR ic.subject_offering_id IS NULL)
                 LIMIT 1`,
                [id, link.cohort_id]
              );
              assignedInstructors = instructorRes.rows;
            } catch (err) {
              console.log('Error fetching assigned instructors:', err.message);
            }
            
            return {
              ...link,
              subject_offerings: subjectLinksRes.rows.map(row => ({
                subject_offering_id: row.subject_offering_id,
                subject_id: row.subject_id,
                subject_title: row.subject_title,
                subject_code: row.subject_code,
              })),
              assigned_instructors: assignedInstructors
            };
          } catch (err) {
            return { ...link, subject_offerings: [], assigned_instructors: [] };
          }
        })
      );
      
      links.student = studentLinksWithSubjects;
      links.student_subjects = studentLinksWithSubjects.flatMap(link => link.subject_offerings || []);
      
      // Get assigned instructors from user_metadata (explicitly assigned)
      // This takes precedence over inferred instructors from cohorts/subjects
      try {
        const metadataResult = await query(
          `SELECT value FROM user_metadata 
           WHERE user_id = $1 AND key = 'assigned_instructors'`,
          [id]
        );
        
        if (metadataResult.rows.length > 0) {
          const instructorIds = JSON.parse(metadataResult.rows[0].value);
          if (Array.isArray(instructorIds) && instructorIds.length > 0) {
            // Fetch instructor details
            const instructorDetails = await query(
              `SELECT id, email, first_name, last_name 
               FROM users 
               WHERE id = ANY($1::uuid[])`,
              [instructorIds]
            );
            
            links.assigned_instructors = instructorDetails.rows.map(row => ({
              instructor_id: row.id,
              id: row.id,
              email: row.email,
              first_name: row.first_name,
              last_name: row.last_name,
            }));
            
            // Set primary assigned instructor (first one)
            if (links.assigned_instructors.length > 0) {
              links.assigned_instructor_id = links.assigned_instructors[0].instructor_id;
            }
          }
        } else {
          // Fallback: Get primary assigned instructor from inferred relationships (first one found)
          if (studentLinksWithSubjects.length > 0 && studentLinksWithSubjects[0].assigned_instructors?.length > 0) {
            links.assigned_instructor_id = studentLinksWithSubjects[0].assigned_instructors[0].instructor_id;
            links.assigned_instructors = studentLinksWithSubjects[0].assigned_instructors;
          }
        }
      } catch (metadataErr) {
        console.log('Error fetching assigned instructors from metadata:', metadataErr.message);
        // Fallback: Get primary assigned instructor from inferred relationships (first one found)
        if (studentLinksWithSubjects.length > 0 && studentLinksWithSubjects[0].assigned_instructors?.length > 0) {
          links.assigned_instructor_id = studentLinksWithSubjects[0].assigned_instructors[0].instructor_id;
          links.assigned_instructors = studentLinksWithSubjects[0].assigned_instructors;
        }
      }
    } catch (err) {
      // Table doesn't exist or other error - return empty array
      console.log('Student links table not available:', err.message);
      links.student = [];
      links.student_subjects = [];
    }
    
    try {
      const instructorLinksRes = await query(
        `SELECT 
          ic.id, 
          ic.cohort_id,
          ic.subject_offering_id,
          c.code as cohort_code,
          c.level as cohort_level
         FROM instructor_classes ic
         LEFT JOIN cohorts c ON c.id = ic.cohort_id
         WHERE ic.instructor_user_id = $1
         UNION
         SELECT 
          ucsl.id,
          ucsl.cohort_id,
          ucsl.subject_offering_id,
          c.code as cohort_code,
          c.level as cohort_level
         FROM user_class_subject_links ucsl
         LEFT JOIN cohorts c ON c.id = ucsl.cohort_id
         WHERE ucsl.user_id = $1 AND ucsl.link_type = 'instructor'`,
        [id]
      );
      links.instructor = instructorLinksRes.rows;
    } catch (err) {
      // Table doesn't exist or other error - return empty array
      console.log('Instructor links table not available:', err.message);
      links.instructor = [];
    }
    
    try {
      // Get parent links (where this user is a parent)
      const parentLinksRes = await query(
        `SELECT 
          pl.id, 
          pl.student_user_id,
          u.email as student_email
         FROM parent_links pl
         LEFT JOIN users u ON u.id = pl.student_user_id
         WHERE pl.parent_user_id = $1`,
        [id]
      );
      links.parent = parentLinksRes.rows;
      
      // Get parent links (where this user is a student)
      const parentStudentsRes = await query(
        `SELECT 
          pl.id, 
          pl.parent_user_id,
          u.email as parent_email
         FROM parent_links pl
         LEFT JOIN users u ON u.id = pl.parent_user_id
         WHERE pl.student_user_id = $1`,
        [id]
      );
      links.parent_students = parentStudentsRes.rows;
    } catch (err) {
      console.log('Parent links table not available:', err.message);
      links.parent = [];
      links.parent_students = [];
    }

    // Get active sessions
    const sessions = await listSessions(id);

    // Get login/logout audit logs only (filter for login_success and logout events)
    const auditRes = await query(
      `SELECT id, event, ip, ua, at
       FROM login_audit
       WHERE user_id = $1 
         AND event IN ('login_success', 'logout')
       ORDER BY at DESC
       LIMIT 100`,
      [id]
    );
    const audits = auditRes.rows.map(a => ({
      id: a.id,
      event: a.event,
      ip: a.ip,
      ua: a.ua,
      at: a.at
    }));

    // Get MFA status from user_auth
    const mfaRes = await query(
      `SELECT mfa_required, mfa_method
       FROM user_auth
       WHERE user_id = $1`,
      [id]
    );
    const mfaInfo = mfaRes.rows[0] || { mfa_required: false, mfa_method: 'none' };

    return NextResponse.json({
      user: {
        ...user,
        mfa_required: mfaInfo.mfa_required,
        mfa_method: mfaInfo.mfa_method
      },
      roles,
      links,
      sessions,
      audits
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  const id = params.id;
  const body = await request.json();
  const action = body?.action;
  
  console.log('🔄 [USER_ACTION] ===== USER ACTION REQUEST STARTED =====');
  console.log('🔄 [USER_ACTION] User ID:', id);
  console.log('🔄 [USER_ACTION] Action:', action);
  console.log('🔄 [USER_ACTION] Request body:', body);

  try {
    // Check authentication
    console.log('🔄 [USER_ACTION] Checking authentication...');
    const session = await auth();
    if (!session?.user) {
      console.log('🔄 [USER_ACTION] ❌ Unauthorized - No session');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log('🔄 [USER_ACTION] ✅ Authenticated user:', session.user.email, 'Role:', session.user.role);

    // Get user before actions for audit logging
    const targetUser = await getUserById(id);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Organization access control
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || null;
    
    if (userRole === "admin" && userOrgId) {
      const userOrgRes = await query(
        `SELECT org_id FROM user_roles WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
        [id, userOrgId]
      );
      
      if (userOrgRes.rows.length === 0) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (userRole !== "superadmin") {
      if (userOrgId) {
        const userOrgRes = await query(
          `SELECT org_id FROM user_roles WHERE user_id = $1 AND org_id = $2 LIMIT 1`,
          [id, userOrgId]
        );
        
        if (userOrgRes.rows.length === 0) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      }
    }

    const { ipAddress, userAgent } = extractRequestInfo(request);

    switch (action) {
      case "suspend":
        console.log('🔄 [USER_ACTION] Suspending user:', id);
        const oldStatusSuspend = targetUser.status;
        await suspendUser(id);
        await createAuditLog({
          actorId: session.user.id,
          targetUserId: id,
          action: 'suspend_user',
          resourceType: 'user',
          resourceId: id,
          oldValues: { status: oldStatusSuspend },
          newValues: { status: 'suspended' },
          ipAddress,
          userAgent,
        });
        console.log('🔄 [USER_ACTION] ✅ User suspended successfully');
        break;
      case "activate":
        console.log('🔄 [USER_ACTION] Activating user:', id);
        const oldStatusActivate = targetUser.status;
        await activateUser(id);
        await createAuditLog({
          actorId: session.user.id,
          targetUserId: id,
          action: 'activate_user',
          resourceType: 'user',
          resourceId: id,
          oldValues: { status: oldStatusActivate },
          newValues: { status: 'active' },
          ipAddress,
          userAgent,
        });
        console.log('🔄 [USER_ACTION] ✅ User activated successfully');
        break;
      case "revoke_sessions":
      case "revoke_session":
        console.log('🔄 [USER_ACTION] Revoking sessions for user:', id);
        await revokeSessions(id);
        await createAuditLog({
          actorId: session.user.id,
          targetUserId: id,
          action: 'revoke_sessions',
          resourceType: 'user',
          resourceId: id,
          metadata: { all_sessions: true },
          ipAddress,
          userAgent,
        });
        console.log('🔄 [USER_ACTION] ✅ Sessions revoked successfully');
        break;
      case "add_role":
        console.log('🔄 [USER_ACTION] Adding role to user:', id, 'Role:', body.roleCode);
        await assignRole({ userId: id, roleCode: body.roleCode, orgId: body.orgId || null });
        await createAuditLog({
          actorId: session.user.id,
          targetUserId: id,
          action: 'assign_role',
          resourceType: 'role',
          resourceId: id,
          newValues: { role_code: body.roleCode, org_id: body.orgId || null },
          ipAddress,
          userAgent,
        });
        console.log('🔄 [USER_ACTION] ✅ Role added successfully');
        break;
      case "remove_role":
        console.log('🔄 [USER_ACTION] Removing role from user:', id, 'Role:', body.roleCode);
        await removeRole({ userId: id, roleCode: body.roleCode, orgId: body.orgId || null });
        await createAuditLog({
          actorId: session.user.id,
          targetUserId: id,
          action: 'remove_role',
          resourceType: 'role',
          resourceId: id,
          oldValues: { role_code: body.roleCode, org_id: body.orgId || null },
          ipAddress,
          userAgent,
        });
        console.log('🔄 [USER_ACTION] ✅ Role removed successfully');
        break;
      case "force_reset_password":
        console.log('🔄 [USER_ACTION] Force reset password');
        // Inline force password reset logic
        try {
          // Get user with auth info
          const userRes = await query(
            `SELECT u.id, u.email, u.org_id, ua.user_id
             FROM users u
             LEFT JOIN user_auth ua ON ua.user_id = u.id
             WHERE u.id = $1`,
            [id]
          );

          if (userRes.rows.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
          }

          const user = userRes.rows[0];

          // Check organization access (admin can only reset passwords for own org users)
          if (userRole === "admin" && session.user.orgId && user.org_id !== session.user.orgId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
          }

          // Generate reset token
          const { generatePasswordResetToken } = await import('@/lib/security/passwordGenerator.js');
          const resetToken = generatePasswordResetToken();
          const crypto = await import('crypto');
          const resetTokenHash = crypto.default.createHash('sha256').update(resetToken).digest('hex');

          // Set expiration (24 hours)
          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 24);

          // Store reset token in user_auth
          if (user.user_id) {
            await query(
              `UPDATE user_auth 
               SET password_reset_token = $1, 
                   password_reset_expires = $2,
                   must_reset_password = true,
                   updated_at = CURRENT_TIMESTAMP
               WHERE user_id = $3`,
              [resetTokenHash, expiresAt, user.id]
            );
          } else {
            await query(
              `INSERT INTO user_auth (user_id, password_hash, password_reset_token, password_reset_expires, must_reset_password, created_at, updated_at)
               VALUES ($1, '', $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               ON CONFLICT (user_id) DO UPDATE SET
                 password_reset_token = EXCLUDED.password_reset_token,
                 password_reset_expires = EXCLUDED.password_reset_expires,
                 must_reset_password = true,
                 updated_at = CURRENT_TIMESTAMP`,
              [user.id, resetTokenHash, expiresAt]
            );
          }

          // Build reset URL using centralized helper
          const { getBaseUrl } = await import('@/lib/utils/url.js');
          const baseUrl = getBaseUrl(request);
          const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}`;

          // Send email
          try {
            const { passwordResetTemplate } = await import('@/lib/email/templates/passwordReset.js');
            const emailTemplate = passwordResetTemplate({
              resetUrl,
              expiryHours: 24,
              forced: true,
            });

            await sendEmail({
              to: user.email,
              subject: emailTemplate.subject,
              text: emailTemplate.text,
              html: emailTemplate.html,
              category: 'password_reset_forced',
            });
          } catch (emailError) {
            console.error('🔄 [USER_ACTION] Failed to send forced password reset email:', emailError);
            // Continue - token is still generated
          }

          await createAuditLog({
            actorId: session.user.id,
            targetUserId: id,
            action: 'force_password_reset',
            resourceType: 'user',
            resourceId: id,
            ipAddress,
            userAgent,
          });

          console.log('🔄 [USER_ACTION] ✅ Password reset forced successfully');
          return NextResponse.json({
            success: true,
            message: "Password reset email sent successfully",
            expires_at: expiresAt.toISOString(),
          });
        } catch (resetError) {
          console.error('🔄 [USER_ACTION] Force password reset error:', resetError);
          return NextResponse.json(
            { error: "SERVER_ERROR", message: resetError.message || "Failed to force password reset" },
            { status: 500 }
          );
        }
      case "toggle_mfa":
        console.log('🔄 [USER_ACTION] Toggle MFA');
        const { enabled, method } = body;
        if (typeof enabled !== 'boolean') {
          return NextResponse.json({ error: "INVALID_INPUT", message: "enabled must be a boolean" }, { status: 400 });
        }
        
        const mfaMethod = method || (enabled ? 'totp' : 'none');
        await query(
          `UPDATE user_auth 
           SET mfa_required = $1, mfa_method = $2::mfa_method_enum, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $3`,
          [enabled, mfaMethod, id]
        );
        
        await createAuditLog({
          actorId: session.user.id,
          targetUserId: id,
          action: 'toggle_mfa',
          resourceType: 'user',
          resourceId: id,
          oldValues: { mfa_required: !enabled },
          newValues: { mfa_required: enabled, mfa_method: mfaMethod },
          ipAddress,
          userAgent,
        });
        console.log('🔄 [USER_ACTION] ✅ MFA toggled successfully');
        break;
      case "update_profile":
        console.log('🔄 [USER_ACTION] Updating profile');
        const { first_name, last_name, avatar_url } = body;
        const updates = {};
        if (first_name !== undefined) updates.first_name = first_name;
        if (last_name !== undefined) updates.last_name = last_name;
        if (avatar_url !== undefined) updates.avatar_url = avatar_url;
        
        if (Object.keys(updates).length === 0) {
          return NextResponse.json({ error: "INVALID_INPUT", message: "No fields to update" }, { status: 400 });
        }
        
        const oldValues = {
          first_name: targetUser.first_name,
          last_name: targetUser.last_name,
          avatar_url: targetUser.avatar_url,
        };
        
        await query(
          `UPDATE users 
           SET ${Object.keys(updates).map((k, i) => `${k} = $${i + 1}`).join(', ')}, updated_at = CURRENT_TIMESTAMP
           WHERE id = $${Object.keys(updates).length + 1}`,
          [...Object.values(updates), id]
        );
        
        await createAuditLog({
          actorId: session.user.id,
          targetUserId: id,
          action: 'update_user_profile',
          resourceType: 'user',
          resourceId: id,
          oldValues,
          newValues: { ...oldValues, ...updates },
          ipAddress,
          userAgent,
        });
        console.log('🔄 [USER_ACTION] ✅ Profile updated successfully');
        break;
      case "resend_invite":
        console.log('📧 [RESEND_INVITE] Starting resend invite process...');
        
        // Get user by ID
        const user = await getUserById(id);
        if (!user) {
          console.log('📧 [RESEND_INVITE] ❌ User not found:', id);
          return NextResponse.json({ error: "USER_NOT_FOUND", message: "User not found" }, { status: 404 });
        }
        console.log('📧 [RESEND_INVITE] User found:', user.email);

        // Check if user is already verified
        if (user.email_verified_at) {
          console.log('📧 [RESEND_INVITE] ⚠️ User already verified - no need to resend invite');
          return NextResponse.json({ error: "USER_ALREADY_VERIFIED", message: "User email is already verified" }, { status: 400 });
        }

        // Get the latest invite for this user
        const inviteRes = await query(
          `SELECT it.*, r.code AS role_code, r.title AS role_title
           FROM invite_tokens it
           JOIN roles r ON r.id = it.role_id
           WHERE LOWER(it.email) = LOWER($1) AND it.used_at IS NULL
           ORDER BY it.created_at DESC
           LIMIT 1`,
          [user.email]
        );

        if (inviteRes.rows.length === 0) {
          console.log('📧 [RESEND_INVITE] ❌ No active invite found for user:', user.email);
          return NextResponse.json({ error: "NO_INVITE_FOUND", message: "No active invite found for this user" }, { status: 404 });
        }

        const existingInvite = inviteRes.rows[0];
        console.log('📧 [RESEND_INVITE] Found existing invite:', existingInvite.id);

        // Generate new token for resend
        const newToken = generateTokenHex(32);
        const newTokenHash = sha256(newToken);
        
        // Update invite with new token and extend expiry if needed
        const expiryHours = 72; // Default 72 hours
        const newExpiresAt = new Date();
        newExpiresAt.setHours(newExpiresAt.getHours() + expiryHours);

        await query(
          `UPDATE invite_tokens 
           SET token_hash = $1, expires_at = $2
           WHERE id = $3`,
          [newTokenHash.toString("hex"), newExpiresAt, existingInvite.id]
        );
        console.log('📧 [RESEND_INVITE] ✅ Invite token updated with new token');

        // Build invite URL using centralized helper
        const { getBaseUrl } = await import('@/lib/utils/url.js');
        const baseUrl = getBaseUrl(request);
        const inviteUrl = `${baseUrl}/invite/accept?token=${newToken}`;
        console.log('📧 [RESEND_INVITE] Invite URL generated:', inviteUrl);

        // Get organization label for email
        let orgLabel = "the organization";
        if (existingInvite.org_id) {
          try {
            const orgRes = await query('SELECT name, display_name FROM organizations WHERE id = $1', [existingInvite.org_id]);
            if (orgRes.rows.length > 0) {
              orgLabel = orgRes.rows[0].display_name || orgRes.rows[0].name || orgLabel;
            }
          } catch (orgError) {
            console.log('📧 [RESEND_INVITE] ⚠️ Could not fetch org label:', orgError.message);
          }
        }

        // Send email
        console.log('📧 [RESEND_INVITE] Preparing to send email...');
        console.log('📧 [RESEND_INVITE] Email config check:');
        console.log('📧 [RESEND_INVITE]   - SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'Set (' + process.env.SENDGRID_API_KEY.substring(0, 10) + '...)' : '❌ NOT SET');
        console.log('📧 [RESEND_INVITE]   - EMAIL_FROM:', process.env.EMAIL_FROM || 'not set');
        console.log('📧 [RESEND_INVITE]   - NODE_ENV:', process.env.NODE_ENV);

        try {
          const emailTemplate = inviteTemplate({
            orgLabel,
            roleTitle: existingInvite.role_title || existingInvite.role_code,
            expiryHours,
            acceptUrl: inviteUrl,
          });

          console.log('📧 [RESEND_INVITE] Email template generated:', {
            to: user.email,
            subject: emailTemplate.subject,
            hasText: !!emailTemplate.text,
            hasHtml: !!emailTemplate.html,
          });

          const emailResult = await sendEmail({
            to: user.email,
            subject: emailTemplate.subject,
            text: emailTemplate.text,
            html: emailTemplate.html,
            category: 'user_invite_resend',
          });

          console.log('📧 [RESEND_INVITE] ✅ Email sent successfully:', {
            messageId: emailResult.id,
            testMode: emailResult.test || false,
          });

          if (emailResult.test) {
            console.log('📧 [RESEND_INVITE] ⚠️ Email sent in TEST mode - actual email not sent');
            console.log('📧 [RESEND_INVITE] Email content (test):', emailTemplate.text?.substring(0, 200));
          }
        } catch (emailError) {
          console.error('📧 [RESEND_INVITE] ❌ Failed to send email:', emailError);
          console.error('📧 [RESEND_INVITE] Email error details:', {
            message: emailError.message,
            stack: emailError.stack,
            code: emailError.code,
          });
          // Return error since resending invite requires email
          return NextResponse.json(
            { error: "EMAIL_SEND_FAILED", message: "Failed to send invite email: " + emailError.message },
            { status: 500 }
          );
        }

        console.log('📧 [RESEND_INVITE] ✅ Resend invite completed successfully');
        break;
      default:
        console.log('🔄 [USER_ACTION] ❌ Invalid action:', action);
        return NextResponse.json({ error: "INVALID_ACTION", message: `Unknown action: ${action}` }, { status: 400 });
    }
    
    revalidateTag("users");
    console.log('🔄 [USER_ACTION] ✅ Action completed successfully');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('🔄 [USER_ACTION] ❌ ===== USER ACTION FAILED =====');
    console.error('🔄 [USER_ACTION] Error:', e.message);
    console.error('🔄 [USER_ACTION] Error stack:', e.stack);
    console.error('🔄 [USER_ACTION] Error code:', e.code);
    return NextResponse.json({ error: "SERVER_ERROR", message: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id]
 * 
 * Soft delete a user (set status to suspended and mark as deleted)
 */
export async function DELETE(request, { params }) {
  console.log('🗑️ [API DELETE] ===== DELETE USER API ROUTE CALLED =====');
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const softDelete = searchParams.get("soft") === "true"; // Soft delete option (default is hard delete)
    
    console.log('🗑️ [API DELETE] User ID to delete:', id);
    console.log('🗑️ [API DELETE] Soft delete mode:', softDelete);
    console.log('🗑️ [API DELETE] Will perform:', softDelete ? 'SOFT DELETE' : 'HARD DELETE (permanent)');

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      console.log('🗑️ [API DELETE] ❌ Unauthorized - No session');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log('🗑️ [API DELETE] ✅ Authenticated user:', session.user.email, 'Role:', session.user.role);

    // Check authorization (superadmin or admin only)
    const userRole = session.user.role;
    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent self-deletion
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "CANNOT_DELETE_SELF", message: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Get user before deletion for audit logging
    console.log('🗑️ [API DELETE] Fetching user data before deletion...');
    const targetUser = await getUserById(id);
    if (!targetUser) {
      console.log('🗑️ [API DELETE] ❌ User not found:', id);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    console.log('🗑️ [API DELETE] User found:', {
      id: targetUser.id,
      email: targetUser.email,
      status: targetUser.status
    });

    // Organization access control
    // Superadmin can delete ANY user globally (org users or global users) - no restrictions
    if (userRole === "superadmin") {
      console.log('🗑️ [API DELETE] ✅ Superadmin detected - bypassing organization access control');
      console.log('🗑️ [API DELETE] Superadmin can delete any user globally (org or global users)');
    } else if (userRole === "admin") {
      // Admin users can only delete users from their own organization
      console.log('🗑️ [API DELETE] Admin user detected - checking organization access control...');
      
      if (!session.user.orgId) {
        console.log('🗑️ [API DELETE] ⚠️ Admin user has no orgId - this should not happen');
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Check both users.org_id and user_roles.org_id for organization membership
      // Use EXISTS with OR to check both sources
      const userOrgRes = await query(
        `SELECT 1 
         FROM users u 
         WHERE u.id = $1 
           AND (
             u.org_id = $2 
             OR EXISTS (
               SELECT 1 FROM user_roles ur 
               WHERE ur.user_id = u.id AND ur.org_id = $2
             )
           )
         LIMIT 1`,
        [id, session.user.orgId]
      );
      
      if (!userOrgRes || userOrgRes.rows.length === 0) {
        console.log('🗑️ [API DELETE] ❌ Organization access control failed - admin can only delete users from their org');
        console.log('🗑️ [API DELETE] Admin orgId:', session.user.orgId);
        console.log('🗑️ [API DELETE] Target user ID:', id);
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      console.log('🗑️ [API DELETE] ✅ Organization access control passed - admin can delete this user');
    }

    const { ipAddress, userAgent } = extractRequestInfo(request);
    console.log('🗑️ [API DELETE] Getting database client...');
    const client = await getClient();
    
    try {
      console.log('🗑️ [API DELETE] Starting database transaction...');
      await client.query('BEGIN');

      if (softDelete) {
        // Soft delete - suspend user and mark for deletion (only if explicitly requested)
        await client.query(
          `UPDATE users 
           SET status = 'suspended', updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [id]
        );
        
        // Add deleted_at timestamp if column exists
        try {
          await client.query(
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL`
          );
          await client.query(
            `UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [id]
          );
        } catch (err) {
          // Column might already exist or other error - continue
          console.log('Note: deleted_at column handling:', err.message);
        }
      } else {
        // Hard delete - permanently delete user and all related data (default behavior)
        console.log('🗑️ [API DELETE] 🗑️ Performing HARD DELETE (permanent removal)...');
        console.log('🗑️ [API DELETE] Step 1: Deleting related data that might have RESTRICT constraints...');
        
        // Helper function to safely execute a query with SAVEPOINT for error isolation
        const safeDelete = async (name, queryFn) => {
          const savepointName = `sp_${name.replace(/[^a-z0-9]/gi, '_')}`;
          try {
            await client.query(`SAVEPOINT ${savepointName}`);
            await queryFn();
            await client.query(`RELEASE SAVEPOINT ${savepointName}`);
            return true;
          } catch (error) {
            try {
              await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
            } catch (rollbackError) {
              // Ignore rollback errors
            }
            console.warn(`🗑️ [API DELETE] ⚠️ Could not delete ${name} (table/column may not exist):`, error.message);
            return false;
          }
        };
        
        // Handle tables with RESTRICT constraints first
        // 1. Delete announcements created by this user
        await safeDelete('announcements', async () => {
          const announcementsRes = await client.query(
            `SELECT id FROM announcements WHERE created_by_user_id = $1`,
            [id]
          );
          if (announcementsRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${announcementsRes.rows.length} announcements created by user, deleting them...`);
            await client.query(
              `DELETE FROM announcements WHERE created_by_user_id = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Announcements deleted');
          }
        });
        
        // 2. Delete teacher_assignments where this user is the teacher
        await safeDelete('teacher_assignments', async () => {
          const teacherAssignmentsRes = await client.query(
            `SELECT id FROM teacher_assignments WHERE teacher_id = $1`,
            [id]
          );
          if (teacherAssignmentsRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${teacherAssignmentsRes.rows.length} teacher assignments, deleting them...`);
            await client.query(
              `DELETE FROM teacher_assignments WHERE teacher_id = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Teacher assignments deleted');
          }
        });
        
        // 3. Update cohorts where this user is the teacher (set to NULL)
        await safeDelete('cohorts_teacher', async () => {
          const cohortsRes = await client.query(
            `SELECT id FROM cohorts WHERE teacher_id = $1`,
            [id]
          );
          if (cohortsRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${cohortsRes.rows.length} cohorts with this user as teacher, updating...`);
            await client.query(
              `UPDATE cohorts SET teacher_id = NULL WHERE teacher_id = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Cohorts updated (teacher_id set to NULL)');
          }
        });
        
        // 4. Delete invite_tokens created by this user
        await safeDelete('invite_tokens', async () => {
          const invitesRes = await client.query(
            `SELECT id FROM invite_tokens WHERE creator_id = $1`,
            [id]
          );
          if (invitesRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${invitesRes.rows.length} invite tokens created by user, deleting them...`);
            await client.query(
              `DELETE FROM invite_tokens WHERE creator_id = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Invite tokens deleted');
          }
        });
        
        // 5. Delete courses created by this user (has RESTRICT constraint)
        await safeDelete('courses', async () => {
          const coursesRes = await client.query(
            `SELECT id FROM courses WHERE created_by = $1`,
            [id]
          );
          if (coursesRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${coursesRes.rows.length} courses created by user, deleting them...`);
            // Delete course modules, chapters, lessons, etc. will cascade
            await client.query(
              `DELETE FROM courses WHERE created_by = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Courses deleted (cascade will handle modules, chapters, lessons)');
          }
        });
        
        // 6. Delete course drafts created by this user
        await safeDelete('course_drafts', async () => {
          const draftsRes = await client.query(
            `SELECT id FROM course_drafts WHERE user_id = $1`,
            [id]
          );
          if (draftsRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${draftsRes.rows.length} course drafts created by user, deleting them...`);
            await client.query(
              `DELETE FROM course_drafts WHERE user_id = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Course drafts deleted');
          }
        });
        
        // 7. Delete course categories, subcategories, types, etc. created by this user
        await safeDelete('course_categories', async () => {
          const categoriesRes = await client.query(
            `SELECT id FROM course_categories WHERE created_by = $1`,
            [id]
          );
          if (categoriesRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${categoriesRes.rows.length} course categories created by user, deleting them...`);
            await client.query(
              `DELETE FROM course_categories WHERE created_by = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Course categories deleted');
          }
        });
        
        await safeDelete('course_subcategories', async () => {
          const subcategoriesRes = await client.query(
            `SELECT id FROM course_subcategories WHERE created_by = $1`,
            [id]
          );
          if (subcategoriesRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${subcategoriesRes.rows.length} course subcategories created by user, deleting them...`);
            await client.query(
              `DELETE FROM course_subcategories WHERE created_by = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Course subcategories deleted');
          }
        });
        
        await safeDelete('course_types', async () => {
          const typesRes = await client.query(
            `SELECT id FROM course_types WHERE created_by = $1`,
            [id]
          );
          if (typesRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${typesRes.rows.length} course types created by user, deleting them...`);
            await client.query(
              `DELETE FROM course_types WHERE created_by = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Course types deleted');
          }
        });
        
        await safeDelete('course_levels', async () => {
          const levelsRes = await client.query(
            `SELECT id FROM course_levels WHERE created_by = $1`,
            [id]
          );
          if (levelsRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${levelsRes.rows.length} course levels created by user, deleting them...`);
            await client.query(
              `DELETE FROM course_levels WHERE created_by = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Course levels deleted');
          }
        });
        
        await safeDelete('course_program_types', async () => {
          const programTypesRes = await client.query(
            `SELECT id FROM course_program_types WHERE created_by = $1`,
            [id]
          );
          if (programTypesRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${programTypesRes.rows.length} course program types created by user, deleting them...`);
            await client.query(
              `DELETE FROM course_program_types WHERE created_by = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Course program types deleted');
          }
        });
        
        await safeDelete('certificate_templates', async () => {
          const templatesRes = await client.query(
            `SELECT id FROM certificate_templates WHERE created_by = $1`,
            [id]
          );
          if (templatesRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${templatesRes.rows.length} certificate templates created by user, deleting them...`);
            await client.query(
              `DELETE FROM certificate_templates WHERE created_by = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Certificate templates deleted');
          }
        });
        
        await safeDelete('course_tags', async () => {
          const tagsRes = await client.query(
            `SELECT id FROM course_tags WHERE created_by = $1`,
            [id]
          );
          if (tagsRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${tagsRes.rows.length} course tags created by user, deleting them...`);
            await client.query(
              `DELETE FROM course_tags WHERE created_by = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Course tags deleted');
          }
        });
        
        await safeDelete('course_skills', async () => {
          const skillsRes = await client.query(
            `SELECT id FROM course_skills WHERE created_by = $1`,
            [id]
          );
          if (skillsRes.rows.length > 0) {
            console.log(`🗑️ [API DELETE] Found ${skillsRes.rows.length} course skills created by user, deleting them...`);
            await client.query(
              `DELETE FROM course_skills WHERE created_by = $1`,
              [id]
            );
            console.log('🗑️ [API DELETE] ✅ Course skills deleted');
          }
        });
        
        console.log('🗑️ [API DELETE] Step 2: Deleting user (CASCADE will handle other related records)...');
        console.log('🗑️ [API DELETE] CASCADE will automatically delete:');
        console.log('🗑️ [API DELETE]   - user_auth (if exists)');
        console.log('🗑️ [API DELETE]   - user_roles');
        console.log('🗑️ [API DELETE]   - user_metadata');
        console.log('🗑️ [API DELETE]   - sessions');
        console.log('🗑️ [API DELETE]   - login_audit');
        console.log('🗑️ [API DELETE]   - student_links');
        console.log('🗑️ [API DELETE]   - instructor_links');
        console.log('🗑️ [API DELETE]   - instructor_classes');
        console.log('🗑️ [API DELETE]   - parent_links');
        console.log('🗑️ [API DELETE]   - user_class_subject_links');
        console.log('🗑️ [API DELETE]   - parent_student_links');
        console.log('🗑️ [API DELETE]   - user_social_links');
        console.log('🗑️ [API DELETE]   - mfa_backup_codes');
        console.log('🗑️ [API DELETE]   - user_sessions');
        console.log('🗑️ [API DELETE]   - audit_logs (user_id references)');
        console.log('🗑️ [API DELETE]   - course_instructors (instructor_id references)');
        
        const startTime = Date.now();
        const userResult = await client.query('DELETE FROM users WHERE id = $1', [id]);
        const duration = Date.now() - startTime;
        console.log(`🗑️ [API DELETE] ✅ Deleted user rows: ${userResult.rowCount} (took ${duration}ms)`);
        
        if (userResult.rowCount === 0) {
          console.error('🗑️ [API DELETE] ⚠️ WARNING: No rows deleted from users table!');
          throw new Error('User was not deleted from database - no rows affected. User may not exist or was already deleted.');
        }
        
        console.log('🗑️ [API DELETE] ✅ User permanently deleted from database');
        console.log('🗑️ [API DELETE] ✅ All related records have been deleted via CASCADE or manual cleanup');
      }

      console.log('🗑️ [API DELETE] Committing transaction...');
      await client.query('COMMIT');
      console.log('🗑️ [API DELETE] ✅ Transaction committed successfully');
      
      // Create audit log AFTER successful deletion (outside transaction to avoid deadlocks)
      console.log('🗑️ [API DELETE] Creating audit log after successful deletion...');
      try {
        await createAuditLog({
          actorId: session.user.id,
          targetUserId: id,
          action: softDelete ? 'delete_user' : 'delete_user_hard',
          resourceType: 'user',
          resourceId: id,
          oldValues: {
            email: targetUser.email,
            status: targetUser.status,
          },
          newValues: softDelete ? {
            status: 'suspended',
            deleted_at: new Date().toISOString(),
          } : null,
          metadata: { hard_delete: !softDelete, soft_delete: softDelete },
          ipAddress,
          userAgent,
        });
        console.log('🗑️ [API DELETE] ✅ Audit log created');
      } catch (auditError) {
        console.warn('🗑️ [API DELETE] ⚠️ Failed to create audit log (non-critical):', auditError.message);
        // Don't throw - audit logging failure shouldn't break the delete operation
      }

      // Revalidate cache
      console.log('🗑️ [API DELETE] Revalidating cache tags...');
      revalidateTag("users");
      revalidateTag("users-list");
      revalidateTag(`user-${id}`);

      const response = {
        success: true,
        message: softDelete ? "User deleted (soft delete)" : "User permanently deleted",
      };
      console.log('🗑️ [API DELETE] ✅ Returning success response:', response);
      console.log('🗑️ [API DELETE] ===== DELETE API ROUTE COMPLETE =====');
      return NextResponse.json(response);

    } catch (error) {
      console.error('🗑️ [API DELETE] ❌ Database transaction error:', error);
      console.error('🗑️ [API DELETE] Error message:', error.message);
      
      // Try to rollback transaction if connection is still alive
      try {
        console.error('🗑️ [API DELETE] Attempting to rollback transaction...');
        await client.query('ROLLBACK');
        console.error('🗑️ [API DELETE] Transaction rolled back');
      } catch (rollbackError) {
        console.warn('🗑️ [API DELETE] ⚠️ Could not rollback transaction (connection may be dead):', rollbackError.message);
      }
      
      throw error;
    } finally {
      // Always try to release the client, even if there was an error
      try {
        console.log('🗑️ [API DELETE] Releasing database client...');
        client.release();
      } catch (releaseError) {
        console.warn('🗑️ [API DELETE] ⚠️ Could not release client:', releaseError.message);
      }
    }

  } catch (error) {
    console.error('🗑️ [API DELETE] ❌ ===== DELETE USER API ERROR =====');
    console.error('🗑️ [API DELETE] Error:', error);
    console.error('🗑️ [API DELETE] Error message:', error.message);
    console.error('🗑️ [API DELETE] Error stack:', error.stack);
    console.error('🗑️ [API DELETE] ===== END DELETE API ERROR =====');
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}


