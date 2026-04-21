/**
 * Instructor Review Statistics API Route
 * 
 * GET /api/instructors/[id]/reviews/statistics - Get rating statistics only
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { getInstructorReviewStats } from '@/lib/db/instructors/reviews.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/instructors/[id]/reviews/statistics
 * 
 * Get rating statistics for an instructor
 * Returns: average rating, total count, rating distribution
 */
export async function GET(request, { params }) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: instructorId } = params;

    // Verify instructor exists
    const instructorCheck = await query(
      `SELECT id FROM users WHERE id = $1`,
      [instructorId]
    );

    if (instructorCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Instructor not found' },
        { status: 404 }
      );
    }

    // Get statistics
    const statistics = await getInstructorReviewStats(instructorId);

    return NextResponse.json({
      success: true,
      statistics
    });
  } catch (error) {
    console.error('Error fetching instructor review statistics:', error);
    
    // Handle specific error types
    let statusCode = 500;
    let errorMessage = 'Failed to fetch instructor review statistics';
    
    if (error.message?.includes('not found')) {
      statusCode = 404;
      errorMessage = 'Instructor not found';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage
      },
      { status: statusCode }
    );
  }
}
