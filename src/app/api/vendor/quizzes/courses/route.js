/**
 * Vendor Courses for Quizzes API Route
 * 
 * GET /api/vendor/quizzes/courses - Get vendor's published courses for quiz creation
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getVendorCoursesForQuiz } from '@/lib/db/vendor/quizzes.js';

export async function GET(request) {
  try {
    // Authentication: Only vendors
    const session = await requireRole(request, ['vendor']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    const vendorId = session.user.id;

    // Get vendor's published courses
    const courses = await getVendorCoursesForQuiz(vendorId);

    return NextResponse.json({
      success: true,
      courses,
    });
  } catch (error) {
    console.error('Error fetching vendor courses:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch courses',
      },
      { status: error.status || 500 }
    );
  }
}
