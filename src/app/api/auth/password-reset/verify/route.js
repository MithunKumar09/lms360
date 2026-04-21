import { NextResponse } from "next/server";
import { query } from "@/lib/db/index.js";
import crypto from "crypto";

/**
 * POST /api/auth/password-reset/verify
 * 
 * Public endpoint to verify a password reset token
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: "MISSING_TOKEN", message: "Token is required" },
        { status: 400 }
      );
    }

    // Hash the token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Verify token
    const res = await query(
      `SELECT u.id, u.email, ua.password_reset_expires
       FROM users u
       JOIN user_auth ua ON ua.user_id = u.id
       WHERE ua.password_reset_token = $1
         AND ua.password_reset_expires > CURRENT_TIMESTAMP`,
      [tokenHash]
    );

    if (res.rows.length === 0) {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "Invalid or expired password reset token" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Token is valid",
      expires_at: res.rows[0].password_reset_expires,
    });

  } catch (error) {
    console.error('Password reset verify error:', error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to verify token" },
      { status: 500 }
    );
  }
}

