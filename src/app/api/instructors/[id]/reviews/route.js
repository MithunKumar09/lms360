/**
 * Instructor Reviews API Route
 * 
 * GET /api/instructors/[id]/reviews - Get reviews for an instructor with pagination
 * POST /api/instructors/[id]/reviews - Create or update a review (student only)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { 
  getInstructorReviews, 
  createInstructorReview, 
  getInstructorReviewStats
} from '@/lib/db/instructors/reviews.js';
import { instructorReviewCreateSchema } from '@/lib/validation/instructorReviewSchemas.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/instructors/[id]/reviews
 * 
 * Get reviews for an instructor with pagination
 * Query params: page, limit, rating (optional filter)
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
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const rating = searchParams.get('rating') ? parseInt(searchParams.get('rating'), 10) : null;

    // Validate pagination params
    if (page < 1) {
      return NextResponse.json(
        { success: false, error: 'Page must be greater than 0' },
        { status: 400 }
      );
    }
    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 50' },
        { status: 400 }
      );
    }

    // Validate rating filter if provided
    if (rating !== null && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { success: false, error: 'Rating filter must be between 1 and 5' },
        { status: 400 }
      );
    }

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

    // Get reviews
    const data = await getInstructorReviews(instructorId, { page, limit, rating });

    // Get statistics
    const statistics = await getInstructorReviewStats(instructorId);

    // Transform reviews for response
    const transformedReviews = data.reviews.map(review => ({
      id: review.id,
      instructorId: review.instructor_id,
      studentId: review.student_id,
      rating: review.rating,
      feedbackText: review.feedback_text || '',
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      student: {
        id: review.student_id,
        name: review.student_name,
        email: review.student_email,
        photoUrl: review.student_photo_url,
        firstName: review.student_first_name,
        lastName: review.student_last_name
      }
    }));

    return NextResponse.json({
      success: true,
      reviews: transformedReviews,
      pagination: data.pagination,
      statistics
    });
  } catch (error) {
    console.error('Error fetching instructor reviews:', error);
    
    // Handle specific error types
    let statusCode = 500;
    let errorMessage = 'Failed to fetch instructor reviews';
    
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

/**
 * POST /api/instructors/[id]/reviews
 * 
 * Create or update a review for an instructor (student only)
 * Body: { rating, feedbackText? }
 */
export async function POST(request, { params }) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Only students can submit reviews
    if (userRole !== 'student' && userRole !== 'orgstudent') {
      return NextResponse.json(
        { success: false, error: 'Only students can submit instructor reviews' },
        { status: 403 }
      );
    }

    const { id: instructorId } = params;
    const body = await request.json();
    const { rating, feedbackText } = body;

    // Validate input using Zod schema
    try {
      instructorReviewCreateSchema.parse({ rating, feedbackText });
    } catch (validationError) {
      return NextResponse.json(
        { 
          success: false, 
          error: validationError.errors?.[0]?.message || 'Invalid input data' 
        },
        { status: 400 }
      );
    }

    // Verify instructor exists and is actually an instructor
    const instructorCheck = await query(
      `SELECT id, role FROM users WHERE id = $1`,
      [instructorId]
    );

    if (instructorCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Instructor not found' },
        { status: 404 }
      );
    }

    const instructorRole = instructorCheck.rows[0].role;
    if (instructorRole !== 'instructor' && instructorRole !== 'orginstructor') {
      return NextResponse.json(
        { success: false, error: 'User is not an instructor' },
        { status: 400 }
      );
    }

    // Prevent self-review
    if (userId === instructorId) {
      return NextResponse.json(
        { success: false, error: 'Cannot review yourself' },
        { status: 400 }
      );
    }

    // Create or update review (upsert)
    const review = await createInstructorReview(
      instructorId, 
      userId, 
      rating, 
      feedbackText || null
    );

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        instructorId: review.instructor_id,
        studentId: review.student_id,
        rating: review.rating,
        feedbackText: review.feedback_text,
        createdAt: review.created_at,
        updatedAt: review.updated_at
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating instructor review:', error);
    
    // Handle specific error types
    let statusCode = 500;
    let errorMessage = 'Failed to create/update review';
    
    if (error.message?.includes('not found')) {
      statusCode = 404;
      errorMessage = 'Instructor not found';
    } else if (error.message?.includes('Cannot review yourself')) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message?.includes('Only students')) {
      statusCode = 403;
      errorMessage = error.message;
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
