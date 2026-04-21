/**
 * Dashboard Reviews API Route
 * 
 * GET /api/reviews/dashboard - Get reviews for dashboard based on user role
 * 
 * Role-based logic:
 * - Superadmin: Reviews for courses they created (global courses where org_id IS NULL)
 * - Admin: Reviews for all courses in their org (excluding global courses), grouped by course
 * - Instructor: Reviews for courses they created
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/reviews/dashboard
 * 
 * Get reviews for dashboard based on user role
 * Query params: page, limit
 */
export async function GET(request) {
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
    const userOrgId = session.user.orgId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // Validate pagination params
    if (page < 1) {
      return NextResponse.json(
        { success: false, error: 'Page must be greater than 0' },
        { status: 400 }
      );
    }
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Role-based query logic
    if (userRole === 'superadmin') {
      // Superadmin: Reviews for courses they created (global courses where org_id IS NULL)
      const reviewsQuery = `
        SELECT 
          cr.id,
          cr.course_id,
          cr.user_id,
          cr.rating,
          cr.review_text,
          cr.created_at,
          cr.updated_at,
          u.email,
          u.first_name,
          u.last_name,
          u.avatar_url as photo_url,
          COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            u.email
          ) as user_name,
          c.id as course_id_full,
          c.title as course_title
        FROM course_reviews cr
        JOIN users u ON cr.user_id = u.id
        JOIN courses c ON cr.course_id = c.id
        WHERE c.created_by = $1 AND c.org_id IS NULL
        ORDER BY cr.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM course_reviews cr
        JOIN courses c ON cr.course_id = c.id
        WHERE c.created_by = $1 AND c.org_id IS NULL
      `;

      const [reviewsResult, countResult] = await Promise.all([
        query(reviewsQuery, [userId, limit, offset]),
        query(countQuery, [userId])
      ]);

      const reviews = Array.isArray(reviewsResult?.rows) ? reviewsResult.rows : [];
      const total = parseInt(
        (Array.isArray(countResult?.rows) && countResult.rows[0]?.total) || 0,
        10
      );

      const transformedReviews = Array.isArray(reviews)
        ? reviews
            .filter(review => review && typeof review === 'object')
            .map(review => ({
              id: review.id,
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
              },
              course: {
                id: review.course_id_full,
                title: review.course_title
              }
            }))
        : [];

      return NextResponse.json({
        success: true,
        reviews: transformedReviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + reviews.length < total
        }
      });

    } else if (userRole === 'admin') {
      // Admin: Reviews for all courses in their org (excluding global courses), grouped by course
      const reviewsQuery = `
        SELECT 
          cr.id,
          cr.course_id,
          cr.user_id,
          cr.rating,
          cr.review_text,
          cr.created_at,
          cr.updated_at,
          u.email,
          u.first_name,
          u.last_name,
          u.avatar_url as photo_url,
          COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            u.email
          ) as user_name,
          c.id as course_id_full,
          c.title as course_title,
          c.created_by as course_created_by,
          instructor.id as instructor_id,
          instructor.first_name as instructor_first_name,
          instructor.last_name as instructor_last_name,
          instructor.email as instructor_email,
          COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(instructor.first_name, ''), ' ', COALESCE(instructor.last_name, ''))), ''),
            instructor.email
          ) as instructor_name
        FROM course_reviews cr
        JOIN users u ON cr.user_id = u.id
        JOIN courses c ON cr.course_id = c.id
        LEFT JOIN users instructor ON c.created_by = instructor.id
        WHERE c.org_id = $1 AND c.org_id IS NOT NULL
        ORDER BY c.title, cr.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM course_reviews cr
        JOIN courses c ON cr.course_id = c.id
        WHERE c.org_id = $1 AND c.org_id IS NOT NULL
      `;

      const [reviewsResult, countResult] = await Promise.all([
        query(reviewsQuery, [userOrgId, limit, offset]),
        query(countQuery, [userOrgId])
      ]);

      const reviews = Array.isArray(reviewsResult?.rows) ? reviewsResult.rows : [];
      const total = parseInt(
        (Array.isArray(countResult?.rows) && countResult.rows[0]?.total) || 0,
        10
      );

      // Group reviews by course
      const courseReviewsMap = {};
      
      Array.isArray(reviews) && reviews.forEach(review => {
        if (!review || typeof review !== 'object') return;
        const courseId = review.course_id_full;
        if (!courseReviewsMap[courseId]) {
          courseReviewsMap[courseId] = {
            course: {
              id: courseId,
              title: review.course_title,
              instructor: {
                id: review.instructor_id,
                name: review.instructor_name,
                email: review.instructor_email,
                firstName: review.instructor_first_name,
                lastName: review.instructor_last_name
              }
            },
            reviews: []
          };
        }

        courseReviewsMap[courseId].reviews.push({
          id: review.id,
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
        });
      });

      return NextResponse.json({
        success: true,
        courseReviewsMap,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + reviews.length < total
        }
      });

    } else if (userRole === 'instructor') {
      // Instructor: Reviews for courses they created
      const reviewsQuery = `
        SELECT 
          cr.id,
          cr.course_id,
          cr.user_id,
          cr.rating,
          cr.review_text,
          cr.created_at,
          cr.updated_at,
          u.email,
          u.first_name,
          u.last_name,
          u.avatar_url as photo_url,
          COALESCE(
            NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
            u.email
          ) as user_name,
          c.id as course_id_full,
          c.title as course_title
        FROM course_reviews cr
        JOIN users u ON cr.user_id = u.id
        JOIN courses c ON cr.course_id = c.id
        WHERE c.created_by = $1
        ORDER BY cr.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM course_reviews cr
        JOIN courses c ON cr.course_id = c.id
        WHERE c.created_by = $1
      `;

      const [reviewsResult, countResult] = await Promise.all([
        query(reviewsQuery, [userId, limit, offset]),
        query(countQuery, [userId])
      ]);

      const reviews = Array.isArray(reviewsResult?.rows) ? reviewsResult.rows : [];
      const total = parseInt(
        (Array.isArray(countResult?.rows) && countResult.rows[0]?.total) || 0,
        10
      );

      const transformedReviews = Array.isArray(reviews)
        ? reviews
            .filter(review => review && typeof review === 'object')
            .map(review => ({
              id: review.id,
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
              },
              course: {
                id: review.course_id_full,
                title: review.course_title
              }
            }))
        : [];

      return NextResponse.json({
        success: true,
        reviews: transformedReviews,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: offset + reviews.length < total
        }
      });

    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid role for dashboard reviews' },
        { status: 403 }
      );
    }

  } catch (error) {
    console.error('Error fetching dashboard reviews:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch dashboard reviews'
      },
      { status: 500 }
    );
  }
}

