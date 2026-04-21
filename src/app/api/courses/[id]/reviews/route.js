/**
 * Course Reviews API Route
 * 
 * GET /api/courses/:id/reviews - Get reviews for a course with pagination
 * POST /api/courses/:id/reviews - Create a new review
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { getCourseReviews, createCourseReview, hasUserReviewed } from '@/lib/db/courses/reviews.js';

/**
 * GET /api/courses/:id/reviews
 * 
 * Get reviews for a course with pagination
 * Query params: page, limit
 */
export async function GET(request, { params }) {
  try {
    const { id: courseId } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

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

    // Get reviews
    const data = await getCourseReviews(courseId, page, limit);

    // Transform reviews for response
    const transformedReviews = data.reviews.map(review => ({
      id: review.id,
      courseId: review.course_id,
      userId: review.user_id,
      rating: review.rating,
      reviewText: review.review_text || '',
      createdAt: review.created_at,
      updatedAt: review.updated_at,
      user: {
        id: review.user_id,
        name: review.user_name,
        email: review.email,
        photoUrl: review.photo_url,
        firstName: review.first_name,
        lastName: review.last_name
      }
    }));

    return NextResponse.json({
      success: true,
      reviews: transformedReviews,
      pagination: data.pagination,
      statistics: data.statistics
    });
  } catch (error) {
    console.error('Error fetching course reviews:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch course reviews'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses/:id/reviews
 * 
 * Create a new review for a course
 * Body: { rating, reviewText }
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

    const { id: courseId } = params;
    const body = await request.json();
    const { rating, reviewText } = body;

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Check if user has already reviewed (will update if exists due to ON CONFLICT)
    const userId = session.user.id;
    const orgId = session.user.orgId || null;
    const role = session.user.role || null;

    // Create or update review
    const review = await createCourseReview(courseId, userId, rating, reviewText || null, orgId, role);

    return NextResponse.json({
      success: true,
      review: {
        id: review.id,
        courseId: review.course_id,
        userId: review.user_id,
        rating: review.rating,
        reviewText: review.review_text,
        createdAt: review.created_at,
        updatedAt: review.updated_at
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating course review:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create review'
      },
      { status: 500 }
    );
  }
}

