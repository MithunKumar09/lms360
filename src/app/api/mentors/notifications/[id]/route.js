/**
 * Single Notification API Route
 * 
 * GET /api/mentors/notifications/[id] - Get single notification
 * PUT /api/mentors/notifications/[id] - Update notification (mark as read)
 * DELETE /api/mentors/notifications/[id] - Delete notification
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/mentors/notifications/[id]
 * Get single notification
 */
export async function GET(request, { params }) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;
    const notificationId = params.id;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Get notification
    const result = await query(
      `SELECT 
        id,
        mentor_id,
        type,
        title,
        message,
        data,
        read,
        read_at,
        created_at
       FROM mentor_notifications
       WHERE id = $1 AND mentor_id = $2`,
      [notificationId, mentorId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    const notification = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: notification.id,
        mentor_id: notification.mentor_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: notification.read,
        read_at: notification.read_at,
        created_at: notification.created_at,
      },
    });
  } catch (error) {
    console.error('Get notification error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch notification' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mentors/notifications/[id]
 * Update notification (mark as read/unread)
 */
export async function PUT(request, { params }) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;
    const notificationId = params.id;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { read } = body;

    if (read === undefined) {
      return NextResponse.json(
        { success: false, error: 'Read status is required' },
        { status: 400 }
      );
    }

    // Verify notification belongs to mentor
    const verifyResult = await query(
      'SELECT id FROM mentor_notifications WHERE id = $1 AND mentor_id = $2',
      [notificationId, mentorId]
    );

    if (verifyResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Update notification
    await query(
      `UPDATE mentor_notifications
       SET read = $1, read_at = CASE WHEN $1 = TRUE THEN CURRENT_TIMESTAMP ELSE NULL END
       WHERE id = $2 AND mentor_id = $3`,
      [read, notificationId, mentorId]
    );

    return NextResponse.json({
      success: true,
      message: `Notification marked as ${read ? 'read' : 'unread'}`,
    });
  } catch (error) {
    console.error('Update notification error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mentors/notifications/[id]
 * Delete notification
 */
export async function DELETE(request, { params }) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;
    const notificationId = params.id;

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // Verify notification belongs to mentor
    const verifyResult = await query(
      'SELECT id FROM mentor_notifications WHERE id = $1 AND mentor_id = $2',
      [notificationId, mentorId]
    );

    if (verifyResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Delete notification
    await query(
      'DELETE FROM mentor_notifications WHERE id = $1 AND mentor_id = $2',
      [notificationId, mentorId]
    );

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete notification' },
      { status: 500 }
    );
  }
}
