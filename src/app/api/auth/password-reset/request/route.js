import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/security/rateLimiter.js";
import { handleApiError } from "@/lib/errors/apiErrorHandler.js";
import { query } from "@/lib/db/index.js";
import { generatePasswordResetToken } from "@/lib/security/passwordGenerator.js";
import { sendEmail } from "@/lib/email/send.js";
import { passwordResetTemplate } from "@/lib/email/templates/passwordReset.js";
import crypto from "crypto";

/**
 * POST /api/auth/password-reset/request
 * 
 * Public endpoint to request a password reset
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: "MISSING_EMAIL", message: "Email is required" },
        { status: 400 }
      );
    }

    // Rate limiting (by email to prevent enumeration)
    const rateLimitResult = rateLimit(request, 'passwordReset', email.toLowerCase().trim());
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: true, // Always return success to prevent enumeration
          message: "If an account exists with this email, a password reset link has been sent.",
        },
        { 
          status: 200,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          }
        }
      );
    }

    // Tenant scope: if request originates from a tenant domain, only look up
    // users that belong to that org. Prevents leaking reset tokens across orgs.
    const resolvedOrgId = request.headers.get('x-tenant-org-id') || null;
    const tenantMode = request.headers.get('x-tenant-mode') || 'control_plane';

    // Find user by email (scoped to org when on a tenant domain)
    const userRes = await query(
      resolvedOrgId && tenantMode === 'tenant'
        ? `SELECT u.id, u.email, u.org_id, ua.user_id
           FROM users u
           LEFT JOIN user_auth ua ON ua.user_id = u.id
           WHERE u.email = $1 AND u.org_id = $2`
        : `SELECT u.id, u.email, u.org_id, ua.user_id
           FROM users u
           LEFT JOIN user_auth ua ON ua.user_id = u.id
           WHERE u.email = $1`,
      resolvedOrgId && tenantMode === 'tenant'
        ? [email.toLowerCase().trim(), resolvedOrgId]
        : [email.toLowerCase().trim()]
    );

    // Always return success (don't reveal if email exists)
    // This prevents email enumeration attacks
    if (userRes.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, a password reset link has been sent.",
      });
    }

    const user = userRes.rows[0];

    // Generate reset token
    const resetToken = generatePasswordResetToken();
    const resetTokenHash = await import('crypto').then(m => m.default.createHash('sha256').update(resetToken).digest('hex'));

    // Set expiration (24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store reset token in user_auth
    if (user.user_id) {
      // Update existing user_auth record
      await query(
        `UPDATE user_auth 
         SET password_reset_token = $1, password_reset_expires = $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $3`,
        [resetTokenHash, expiresAt, user.id]
      );
    } else {
      // Create user_auth record if it doesn't exist
      await query(
        `INSERT INTO user_auth (user_id, password_hash, password_reset_token, password_reset_expires, must_reset_password, created_at, updated_at)
         VALUES ($1, '', $2, $3, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
           password_reset_token = EXCLUDED.password_reset_token,
           password_reset_expires = EXCLUDED.password_reset_expires,
           updated_at = CURRENT_TIMESTAMP`,
        [user.id, resetTokenHash, expiresAt]
      );
    }

    // Build the reset URL using the user's org domain, not the request domain.
    // This ensures a superadmin-initiated reset still sends to the correct
    // tenant subdomain (e.g., acme.edurock.com/auth/reset-password?token=…).
    let orgBaseUrl;
    if (user.org_id) {
      const orgRes = await query(
        `SELECT subdomain, custom_domain, domain_verified
         FROM organizations
         WHERE id = $1`,
        [user.org_id]
      );
      const org = orgRes.rows[0];
      const baseDomain = process.env.NEXTAUTH_BASE_DOMAIN ?? 'edurock.com';
      if (org?.custom_domain && org.domain_verified) {
        orgBaseUrl = `https://${org.custom_domain}`;
      } else if (org?.subdomain) {
        orgBaseUrl = `https://${org.subdomain}.${baseDomain}`;
      }
    }
    // Fallback: control-plane users (superadmin/brand) or no org found
    if (!orgBaseUrl) {
      const { getBaseUrl } = await import('@/lib/utils/url.js');
      orgBaseUrl = getBaseUrl(request);
    }
    const resetUrl = `${orgBaseUrl}/auth/reset-password?token=${resetToken}`;

    // Send email
    try {
      const emailTemplate = passwordResetTemplate({
        resetUrl,
        expiryHours: 24,
      });

      await sendEmail({
        to: user.email,
        subject: emailTemplate.subject,
        text: emailTemplate.text,
        html: emailTemplate.html,
        category: 'password_reset',
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Continue - token is still generated
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, a password reset link has been sent.",
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    const errorResponse = handleApiError(error, request);
    return NextResponse.json(
      errorResponse.body,
      { status: errorResponse.status }
    );
  }
}

