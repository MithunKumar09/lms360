/**
 * Clear Wishlist API Route
 * 
 * DELETE /api/wishlist/clear - Clear all items from wishlist
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { query } from '@/lib/db/index.js';

/**
 * DELETE /api/wishlist/clear
 * 
 * Clear all items from user's wishlist.
 */
export async function DELETE(request) {
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

    // Clear wishlist
    const deleteQuery = `
      DELETE FROM wishlist
      WHERE user_id = $1
      RETURNING id
    `;

    const result = await query(deleteQuery, [userId]);

    return NextResponse.json({
      success: true,
      message: 'Wishlist cleared',
      deletedCount: result.rows.length,
    });
  } catch (error) {
    console.error('Error clearing wishlist:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to clear wishlist',
      },
      { status: 500 }
    );
  }
}

