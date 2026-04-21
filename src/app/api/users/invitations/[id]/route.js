import { NextResponse } from "next/server";
import { query } from "@/lib/db/index.js";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { sha256 } from "@/lib/security/tokens.js";
import { getInviteByTokenHash, markInviteUsed } from "@/lib/db/users.js";
import { sendEmail } from "@/lib/email/send.js";
import { inviteTemplate } from "@/lib/email/templates/invite.js";
import { generateTokenHex } from "@/lib/security/tokens.js";
import { generateTemporaryPassword } from "@/lib/security/passwordGenerator.js";
import bcrypt from "bcryptjs";

/**
 * GET /api/users/invitations/[id]
 * 
 * Get invitation details by ID
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
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

    // Get invitation details
    const res = await query(
      `SELECT 
        it.id,
        it.email,
        it.org_id,
        it.role_id,
        it.creator_id,
        it.mode,
        it.mfa_required,
        it.mfa_method,
        it.payload,
        it.expires_at,
        it.used_at,
        it.created_at,
        r.code AS role_code,
        r.title AS role_title,
        o.name AS org_name,
        u.email AS creator_email,
        CASE 
          WHEN it.used_at IS NOT NULL THEN 'accepted'
          WHEN it.expires_at < CURRENT_TIMESTAMP THEN 'expired'
          ELSE 'pending'
        END AS status
       FROM invite_tokens it
       JOIN roles r ON r.id = it.role_id
       LEFT JOIN organizations o ON o.id = it.org_id
       LEFT JOIN users u ON u.id = it.creator_id
       WHERE it.id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const invitation = res.rows[0];

    // Check organization access (admin can only see own org invitations)
    if (userRole === "admin" && session.user.orgId && invitation.org_id !== session.user.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        org_id: invitation.org_id,
        org_name: invitation.org_name,
        role_code: invitation.role_code,
        role_title: invitation.role_title,
        mode: invitation.mode,
        mfa_required: invitation.mfa_required,
        mfa_method: invitation.mfa_method,
        payload: invitation.payload,
        expires_at: invitation.expires_at,
        used_at: invitation.used_at,
        created_at: invitation.created_at,
        status: invitation.status,
        creator_email: invitation.creator_email,
      },
    });

  } catch (error) {
    console.error('Error fetching invitation:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/invitations/[id]/resend
 * 
 * Resend invitation email (regenerate token if expired)
 */
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { regenerate = false } = body;

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

    // Get invitation
    const res = await query(
      `SELECT 
        it.*,
        r.code AS role_code,
        r.title AS role_title,
        o.name AS org_name,
        o.display_name AS org_display_name
       FROM invite_tokens it
       JOIN roles r ON r.id = it.role_id
       LEFT JOIN organizations o ON o.id = it.org_id
       WHERE it.id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    let invite = res.rows[0];

    // Check organization access
    if (userRole === "admin" && session.user.orgId && invite.org_id !== session.user.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if already used
    if (invite.used_at) {
      return NextResponse.json(
        { error: "INVITATION_USED", message: "This invitation has already been accepted" },
        { status: 400 }
      );
    }

    // Regenerate token if expired or if regenerate flag is set
    let token = null;
    let tokenHash = null;
    let expiresAt = new Date(invite.expires_at);

    if (regenerate || new Date() > expiresAt) {
      // Generate new token
      token = generateTokenHex(32);
      tokenHash = sha256(token);
      const tokenHashHex = tokenHash.toString("hex");

      // Update expiration (24 hours from now)
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      // Update invitation in database
      await query(
        `UPDATE invite_tokens 
         SET token_hash = decode($1, 'hex'), expires_at = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [tokenHashHex, expiresAt, id]
      );

      invite.expires_at = expiresAt.toISOString();
    } else {
      // Use existing token (we can't retrieve it, so we'll need to generate a new one for the email)
      // Actually, we can't retrieve the original token, so we must regenerate
      token = generateTokenHex(32);
      tokenHash = sha256(token);
      const tokenHashHex = tokenHash.toString("hex");

      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await query(
        `UPDATE invite_tokens 
         SET token_hash = decode($1, 'hex'), expires_at = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [tokenHashHex, expiresAt, id]
      );

      invite.expires_at = expiresAt.toISOString();
    }

    // Generate temporary password if mode is temp_password_email
    let temporaryPassword = null;
    let temporaryPasswordHash = null;
    
    if (invite.mode === 'temp_password_email') {
      temporaryPassword = generateTemporaryPassword(16);
      temporaryPasswordHash = await bcrypt.hash(temporaryPassword, 10);
      
      // Update payload with new temp password hash
      const payload = invite.payload || {};
      payload.temporary_password_hash = temporaryPasswordHash;
      
      await query(
        `UPDATE invite_tokens SET payload = $1::jsonb WHERE id = $2`,
        [JSON.stringify(payload), id]
      );
    }

    // Build invite URL using centralized helper
    const { getBaseUrl } = await import('@/lib/utils/url.js');
    const baseUrl = getBaseUrl(request);
    const inviteUrl = `${baseUrl}/invite/accept?token=${token}`;

    // Get organization label
    const orgLabel = invite.org_display_name || invite.org_name || "the organization";

    // Send email
    try {
      const emailTemplate = inviteTemplate({
        orgLabel,
        roleTitle: invite.role_title || invite.role_code,
        expiryHours: 24,
        acceptUrl: inviteUrl,
        temporaryPassword: temporaryPassword,
        mode: invite.mode,
      });

      await sendEmail({
        to: invite.email,
        subject: emailTemplate.subject,
        text: emailTemplate.text,
        html: emailTemplate.html,
        category: 'user_invite_resend',
      });

      return NextResponse.json({
        success: true,
        message: "Invitation email resent successfully",
        invite: {
          id: invite.id,
          email: invite.email,
          expires_at: expiresAt.toISOString(),
        },
      });

    } catch (emailError) {
      console.error('Failed to send resend email:', emailError);
      // Still return success since token was regenerated
      return NextResponse.json({
        success: true,
        message: "Invitation token regenerated, but email sending failed",
        invite: {
          id: invite.id,
          email: invite.email,
          expires_at: expiresAt.toISOString(),
        },
        warning: "Email sending failed",
      });
    }

  } catch (error) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/invitations/[id]
 * 
 * Delete an invitation
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
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

    // Get invitation to check if it exists and for organization access control
    const res = await query(
      `SELECT id, org_id, used_at FROM invite_tokens WHERE id = $1`,
      [id]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    const invitation = res.rows[0];

    // Check organization access (admin can only delete own org invitations)
    if (userRole === "admin" && session.user.orgId && invitation.org_id !== session.user.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the invitation (even if it has been used/accepted)
    // This allows cleanup of old invitation records
    await query(
      `DELETE FROM invite_tokens WHERE id = $1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: "Invitation deleted successfully",
    });

  } catch (error) {
    console.error('Error deleting invitation:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}