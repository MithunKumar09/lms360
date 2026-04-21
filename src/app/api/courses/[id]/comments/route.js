/**
 * Course Comments API Route
 * 
 * GET /api/courses/:id/comments - Get comments for a course
 * POST /api/courses/:id/comments - Create a new comment
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { getCourseComments, createCourseComment, getCommentStatistics } from '@/lib/db/courses/comments.js';

/**
 * GET /api/courses/:id/comments
 * 
 * Get comments for a course with pagination
 * Query params: status, page, limit
 */
export async function GET(request, { params }) {
  try {
    const { id: courseId } = params;
    const { searchParams } = new URL(request.url);
    
    // For public access, only show approved comments
    // For authenticated users, they can see their own pending comments
    const session = await auth();
    const status = searchParams.get('status') || (session?.user ? null : 'approved');
    
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

    // Get comments
    const data = await getCourseComments(courseId, status, page, limit);
    
    // Get statistics (only for authenticated users)
    let statistics = null;
    if (session?.user) {
      statistics = await getCommentStatistics(courseId);
    }

    // Transform comments for response
    const transformComment = (comment) => ({
      id: comment.id,
      courseId: comment.course_id,
      userId: comment.user_id,
      parentId: comment.parent_id,
      userName: comment.user_name,
      userEmail: comment.user_email,
      userAvatar: comment.user_avatar,
      commentText: comment.comment_text,
      status: comment.status,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      replies: comment.replies ? comment.replies.map(transformComment) : []
    });

    const transformedComments = data.comments.map(transformComment);

    return NextResponse.json({
      success: true,
      comments: transformedComments,
      pagination: data.pagination,
      ...(statistics && { statistics })
    });
  } catch (error) {
    console.error('Error fetching course comments:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch comments'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses/:id/comments
 * 
 * Create a new comment (requires authentication)
 * Body: { commentText, parentId? }
 */
export async function POST(request, { params }) {
  try {
    const { id: courseId } = params;
    
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in to comment' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { commentText, parentId } = body;

    // Validate input
    if (!commentText || commentText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment text is required' },
        { status: 400 }
      );
    }

    if (commentText.trim().length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Comment text must be less than 5000 characters' },
        { status: 400 }
      );
    }

    // If parentId is provided, validate it exists and belongs to the same course
    if (parentId) {
      const { getCommentById } = await import('@/lib/db/courses/comments.js');
      const parentComment = await getCommentById(parentId);
      
      if (!parentComment) {
        return NextResponse.json(
          { success: false, error: 'Parent comment not found' },
          { status: 404 }
        );
      }
      
      if (parentComment.course_id !== courseId) {
        return NextResponse.json(
          { success: false, error: 'Parent comment does not belong to this course' },
          { status: 400 }
        );
      }
    }

    // Create comment
    const comment = await createCourseComment(
      courseId,
      userId,
      commentText.trim(),
      parentId || null
    );

    // Fetch the created comment with user details
    const { getCommentById } = await import('@/lib/db/courses/comments.js');
    const fullComment = await getCommentById(comment.id);

    return NextResponse.json({
      success: true,
      comment: {
        id: fullComment.id,
        courseId: fullComment.course_id,
        userId: fullComment.user_id,
        parentId: fullComment.parent_id,
        userName: fullComment.user_name,
        userEmail: fullComment.user_email,
        userAvatar: fullComment.user_avatar,
        commentText: fullComment.comment_text,
        status: fullComment.status,
        createdAt: fullComment.created_at,
        updatedAt: fullComment.updated_at
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating course comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create comment'
      },
      { status: 500 }
    );
  }
}

