/**
 * Wishlist Check API Route
 * 
 * Checks if a course is in the user's wishlist.
 * GET /api/wishlist/check/:courseId
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/wishlist/check/:courseId
 * 
 * Checks if a course is in the user's wishlist.
 */
export async function GET(request, { params }) {
  try {
    // Authentication required
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          inWishlist: false,
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
          inWishlist: false,
        },
        { status: 400 }
      );
    }

    // Check if wishlist table exists, if not return false (wishlist not implemented in DB yet)
    // For now, return false to prevent errors
    // TODO: Implement wishlist table and proper check
    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'wishlist'
      ) as table_exists
    `;
    
    const tableCheck = await query(checkQuery);
    const hasWishlistTable = tableCheck.rows[0]?.table_exists;

    if (!hasWishlistTable) {
      // Wishlist table doesn't exist yet, return false
      return NextResponse.json({
        success: true,
        inWishlist: false,
        message: 'Wishlist feature not yet implemented in database',
      });
    }

    // Check if course is in wishlist
    const wishlistQuery = `
      SELECT EXISTS (
        SELECT 1 FROM wishlist
        WHERE user_id = $1 AND course_id = $2
      ) as in_wishlist
    `;

    const result = await query(wishlistQuery, [userId, courseId]);
    const inWishlist = result.rows[0]?.in_wishlist || false;

    return NextResponse.json({
      success: true,
      inWishlist,
    });
  } catch (error) {
    console.error('Error checking wishlist:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to check wishlist',
        inWishlist: false,
      },
      { status: 500 }
    );
  }
}

