/**
 * Change Password API Route
 * 
 * Changes current authenticated user's password
 * POST /api/user/change-password
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { query } from '@/lib/db/index.js';
import bcrypt from 'bcryptjs';
import { passwordSchema, validateForm } from '@/lib/validation/schemas.js';

/**
 * POST /api/user/change-password
 * 
 * Changes user password
 */
export async function POST(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Current password and new password are required',
        },
        { status: 400 }
      );
    }

    // Validate new password strength
    const passwordValidation = passwordSchema.safeParse(newPassword);
    if (!passwordValidation.success) {
      const errorMessage = passwordValidation.error.errors[0]?.message || 'Invalid password';
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Get user's current password hash
    const userResult = await query(
      `SELECT ua.password_hash 
       FROM user_auth ua 
       WHERE ua.user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'User authentication data not found',
        },
        { status: 404 }
      );
    }

    const passwordHash = userResult.rows[0].password_hash;

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Current password is incorrect',
        },
        { status: 401 }
      );
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, passwordHash);
    if (isSamePassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'New password must be different from current password',
        },
        { status: 400 }
      );
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await query(
      `UPDATE user_auth 
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $2`,
      [newPasswordHash, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to change password',
      },
      { status: 500 }
    );
  }
}

