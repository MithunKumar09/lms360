/**
 * User Update API Route
 * 
 * Updates current authenticated user's profile information
 * PUT /api/user/update
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { getUserById, updateUser } from '@/lib/db/users.js';
import { updateProfileSchema, validateForm } from '@/lib/validation/schemas.js';
import { query } from '@/lib/db/index.js';

/**
 * PUT /api/user/update
 * 
 * Updates current user's profile information
 */
export async function PUT(request) {
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

    // Validate input
    const validation = validateForm(updateProfileSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    const updates = {};

    // Map frontend field names to database column names
    if (validation.data.firstName !== undefined) {
      updates.first_name = validation.data.firstName || null;
    }
    if (validation.data.lastName !== undefined) {
      updates.last_name = validation.data.lastName || null;
    }
    if (validation.data.avatar_url !== undefined) {
      updates.avatar_url = validation.data.avatar_url || null;
    }
    
    // New fields - check if columns exist before adding to updates
    const checkColumns = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('username', 'phone', 'skill', 'display_name', 'bio')
    `);
    const existingColumns = new Set(checkColumns.rows.map(row => row.column_name));
    
    if (validation.data.username !== undefined && existingColumns.has('username')) {
      updates.username = validation.data.username || null;
    }
    if (validation.data.phone !== undefined && existingColumns.has('phone')) {
      updates.phone = validation.data.phone || null;
    }
    if (validation.data.skill !== undefined && existingColumns.has('skill')) {
      updates.skill = validation.data.skill || null;
    }
    if (validation.data.displayName !== undefined && existingColumns.has('display_name')) {
      updates.display_name = validation.data.displayName || null;
    }
    if (validation.data.bio !== undefined && existingColumns.has('bio')) {
      updates.bio = validation.data.bio || null;
    }

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      // No updates, return current user data
      const user = await getUserById(userId);
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: 'User not found',
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name || null,
          lastName: user.last_name || null,
          username: user.username || null,
          phone: user.phone || null,
          skill: user.skill || null,
          displayName: user.display_name || null,
          bio: user.bio || null,
          profileImage: user.avatar_url || null,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
      });
    }

    // Check if username is being updated and if it's unique (if provided)
    if (updates.username !== null && updates.username !== undefined) {
      const existingUser = await query(
        `SELECT id FROM users WHERE username = $1 AND id != $2`,
        [updates.username, userId]
      );
      if (existingUser.rows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Username already exists',
          },
          { status: 409 }
        );
      }
    }

    // Update user
    const updatedUser = await updateUser(userId, updates);

    if (!updatedUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update user',
        },
        { status: 500 }
      );
    }

      // Fetch updated user with all fields
      const finalUser = await getUserById(userId);
      
      if (!finalUser) {
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to fetch updated user',
          },
          { status: 500 }
        );
      }

      // Return updated user data
      return NextResponse.json({
        success: true,
        user: {
          id: finalUser.id,
          email: finalUser.email,
          firstName: finalUser.first_name || null,
          lastName: finalUser.last_name || null,
          username: finalUser.username || null,
          phone: finalUser.phone || null,
          skill: finalUser.skill || null,
          displayName: finalUser.display_name || null,
          bio: finalUser.bio || null,
          profileImage: finalUser.avatar_url || null,
          createdAt: finalUser.created_at,
          updatedAt: finalUser.updated_at,
        },
      });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update user profile',
      },
      { status: 500 }
    );
  }
}

