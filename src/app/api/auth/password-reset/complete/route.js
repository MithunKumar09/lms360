import { NextResponse } from "next/server";
import { query, getClient } from "@/lib/db/index.js";
import { validatePasswordStrength } from "@/lib/security/passwordGenerator.js";
import { logAuditEvent } from "@/lib/audit/logger.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * POST /api/auth/password-reset/complete
 * 
 * Public endpoint to complete password reset
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "MISSING_FIELDS", message: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { 
          error: "WEAK_PASSWORD", 
          message: "Password does not meet strength requirements",
          feedback: passwordValidation.feedback
        },
        { status: 400 }
      );
    }

    // Hash the token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Verify token and get user
      const userRes = await client.query(
        `SELECT u.id, u.email, u.org_id, u.role, ua.password_reset_expires
         FROM users u
         JOIN user_auth ua ON ua.user_id = u.id
         WHERE ua.password_reset_token = $1
           AND ua.password_reset_expires > CURRENT_TIMESTAMP
         FOR UPDATE`,
        [tokenHash]
      );

      if (userRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: "INVALID_TOKEN", message: "Invalid or expired password reset token" },
          { status: 400 }
        );
      }

      const user = userRes.rows[0];

      // Hash the new password (align with BCRYPT_SALT_ROUNDS env var, default 12)
      const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10));

      // Update password and clear reset token
      await client.query(
        `UPDATE user_auth 
         SET password_hash = $1,
             password_reset_token = NULL,
             password_reset_expires = NULL,
             must_reset_password = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [passwordHash, user.id]
      );

      // Invalidate all active sessions so compromised sessions cannot persist
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [user.id]);

      // Increment revocation_version to invalidate all in-flight JWTs
      await client.query(
        'UPDATE users SET revocation_version = revocation_version + 1 WHERE id = $1',
        [user.id]
      );

      await client.query('COMMIT');

      // Audit log — outside the transaction so a logging failure never rolls back the reset
      try {
        await logAuditEvent({
          userId: user.id,
          userEmail: user.email,
          userRole: user.role,
          orgId: user.org_id ?? null,
          eventType: 'password_reset',
          request,
        });
      } catch (_) { /* audit failure must not block the user */ }

      return NextResponse.json({
        success: true,
        message: "Password has been reset successfully. You can now log in with your new password.",
        redirect: "/login",
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Password reset complete error:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message || "Failed to reset password" },
      { status: 500 }
    );
  }
}

