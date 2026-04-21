import { NextResponse } from "next/server";
import { query } from "@/lib/db/index.js";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { generatePasswordResetToken } from "@/lib/security/passwordGenerator.js";
import { sendEmail } from "@/lib/email/send.js";
import { passwordResetTemplate } from "@/lib/email/templates/passwordReset.js";
import { revalidateTag } from "next/cache";

/**
 * POST /api/users/[id]/force-password-reset
 * 
 * Force a password reset for a user (admin only)
 */
export async function POST(request, { params }) {
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

    // Get user
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
    const resetToken = generatePasswordResetToken();
    const resetTokenHash = await import('crypto').then(m => m.default.createHash('sha256').update(resetToken).digest('hex'));

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
      console.error('Failed to send forced password reset email:', emailError);
      // Continue - token is still generated
    }

    // Revalidate cache
    revalidateTag("users");
    revalidateTag(`user-${id}`);

    return NextResponse.json({
      success: true,
      message: "Password reset email sent successfully",
      expires_at: expiresAt.toISOString(),
    });

  } catch (error) {
    console.error('Force password reset error:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message || "Failed to force password reset" },
      { status: 500 }
    );
  }
}

