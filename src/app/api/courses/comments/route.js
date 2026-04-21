/**
 * All Course Comments API Route (Admin/Superadmin)
 * 
 * GET /api/courses/comments - Get all comments across all courses
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { getAllComments, getVendorCourseComments } from '@/lib/db/courses/comments.js';

/**
 * GET /api/courses/comments
 * 
 * Get comments:
 * - Admin/Superadmin: All comments across all courses
 * - Vendor: Only comments for vendor's courses
 * Query params: courseId, status, page, limit
 */
export async function GET(request) {
  try {
    // Check authentication and authorization
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = session.user.role;
    const userId = session.user.id;

    // Allow admin, superadmin, and vendor roles
    if (userRole !== 'superadmin' && userRole !== 'admin' && userRole !== 'vendor') {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin or Vendor access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId') || null;
    const status = searchParams.get('status') || null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

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

    // Get comments based on role
    let data;
    if (userRole === 'vendor') {
      // Vendor: Only get comments for their courses
      data = await getVendorCourseComments(userId, courseId, status, page, limit);
    } else {
      // Admin/Superadmin: Get all comments
      data = await getAllComments(courseId, status, page, limit);
    }

    // Transform comments for response
    const transformedComments = data.comments.map(comment => ({
      id: comment.id,
      courseId: comment.course_id,
      courseTitle: comment.course_title,
      courseSlug: comment.course_slug,
      userId: comment.user_id,
      parentId: comment.parent_id,
      userName: comment.user_name,
      userEmail: comment.user_email,
      userAvatar: comment.user_avatar,
      commentText: comment.comment_text,
      status: comment.status,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at
    }));

    return NextResponse.json({
      success: true,
      comments: transformedComments,
      pagination: data.pagination
    });
  } catch (error) {
    console.error('Error fetching all course comments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch comments'
      },
      { status: 500 }
    );
  }
}

