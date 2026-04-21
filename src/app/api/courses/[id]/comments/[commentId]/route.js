/**
 * Course Comment Management API Route
 * 
 * GET /api/courses/:id/comments/:commentId - Get single comment
 * PUT /api/courses/:id/comments/:commentId - Update comment
 * DELETE /api/courses/:id/comments/:commentId - Delete comment
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { getCommentById, updateComment, deleteComment } from '@/lib/db/courses/comments.js';

/**
 * GET /api/courses/:id/comments/:commentId
 * 
 * Get a single comment
 */
export async function GET(request, { params }) {
  try {
    const { id: courseId, commentId } = params;
    const comment = await getCommentById(commentId);

    if (!comment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (comment.course_id !== courseId) {
      return NextResponse.json(
        { success: false, error: 'Comment does not belong to this course' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      comment: {
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
        updatedAt: comment.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch comment'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/courses/:id/comments/:commentId
 * 
 * Update a comment (user can update their own, admin can update any)
 * Body: { commentText?, status? }
 */
export async function PUT(request, { params }) {
  try {
    const { id: courseId, commentId } = params;
    
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
    const isAdmin = userRole === 'superadmin' || userRole === 'admin';
    const isVendor = userRole === 'vendor';

    // Get existing comment
    const existingComment = await getCommentById(commentId);
    if (!existingComment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (existingComment.course_id !== courseId) {
      return NextResponse.json(
        { success: false, error: 'Comment does not belong to this course' },
        { status: 400 }
      );
    }

    // Check if vendor owns the course
    let isVendorCourseOwner = false;
    if (isVendor) {
      const { query } = await import('@/lib/db/index.js');
      const courseCheck = await query(
        'SELECT created_by FROM courses WHERE id = $1',
        [courseId]
      );
      isVendorCourseOwner = courseCheck.rows[0]?.created_by === userId;
    }

    // Check permissions: user can only update their own comments (unless admin or vendor course owner)
    if (!isAdmin && !isVendorCourseOwner && existingComment.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You can only update your own comments' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { commentText, status } = body;

    // Build updates object
    const updates = {};
    if (commentText !== undefined) {
      if (commentText.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Comment text cannot be empty' },
          { status: 400 }
        );
      }
      if (commentText.trim().length > 5000) {
        return NextResponse.json(
          { success: false, error: 'Comment text must be less than 5000 characters' },
          { status: 400 }
        );
      }
      updates.commentText = commentText.trim();
    }

    // Only admins and vendor course owners can change status
    if (status !== undefined) {
      if (!isAdmin && !isVendorCourseOwner) {
        return NextResponse.json(
          { success: false, error: 'Forbidden - Only admins or course owners can change comment status' },
          { status: 403 }
        );
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    // Update comment
    const updatedComment = await updateComment(commentId, updates);

    // Fetch updated comment with user details
    const fullComment = await getCommentById(commentId);

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
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update comment'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/courses/:id/comments/:commentId
 * 
 * Delete a comment (user can delete their own, admin can delete any)
 */
export async function DELETE(request, { params }) {
  try {
    const { id: courseId, commentId } = params;
    
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
    const isAdmin = userRole === 'superadmin' || userRole === 'admin';
    const isVendor = userRole === 'vendor';

    // Get existing comment
    const existingComment = await getCommentById(commentId);
    if (!existingComment) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    if (existingComment.course_id !== courseId) {
      return NextResponse.json(
        { success: false, error: 'Comment does not belong to this course' },
        { status: 400 }
      );
    }

    // Check if vendor owns the course
    let isVendorCourseOwner = false;
    if (isVendor) {
      const { query } = await import('@/lib/db/index.js');
      const courseCheck = await query(
        'SELECT created_by FROM courses WHERE id = $1',
        [courseId]
      );
      isVendorCourseOwner = courseCheck.rows[0]?.created_by === userId;
    }

    // Check permissions: user can only delete their own comments (unless admin or vendor course owner)
    if (!isAdmin && !isVendorCourseOwner && existingComment.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - You can only delete your own comments' },
        { status: 403 }
      );
    }

    // Delete comment
    const deleted = await deleteComment(commentId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete comment'
      },
      { status: 500 }
    );
  }
}

