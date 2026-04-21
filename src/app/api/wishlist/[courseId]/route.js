/**
 * Wishlist Item API Route
 * 
 * DELETE /api/wishlist/:courseId - Remove course from wishlist
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { query } from '@/lib/db/index.js';

/**
 * DELETE /api/wishlist/:courseId
 * 
 * Remove course from wishlist.
 */
export async function DELETE(request, { params }) {
  try {
    // Authentication required
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { courseId } = params;

    if (!courseId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course ID is required',
        },
        { status: 400 }
      );
    }

    // Check if wishlist table exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'wishlist'
      ) as table_exists
    `;
    
    const tableCheck = await query(checkQuery);
    const hasWishlistTable = tableCheck.rows[0]?.table_exists;

    if (!hasWishlistTable) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wishlist feature not yet implemented in database',
        },
        { status: 501 }
      );
    }

    // Remove from wishlist
    const deleteQuery = `
      DELETE FROM wishlist
      WHERE user_id = $1 AND course_id = $2
      RETURNING id
    `;

    const result = await query(deleteQuery, [userId, courseId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course not found in wishlist',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Course removed from wishlist',
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to remove from wishlist',
      },
      { status: 500 }
    );
  }
}

