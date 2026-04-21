/**
 * Mark Notification as Read API Route
 * 
 * PATCH /api/notifications/[id]/read
 * Mark a notification as read
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';

export async function PATCH(request, { params }) {
  try {
    console.log('✅ [NOTIFICATION] ===== MARK READ STARTED =====');
    
    const { id } = params;
    
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Verify notification belongs to user
    const notificationResult = await query(
      `SELECT id, user_id, read FROM notifications WHERE id = $1`,
      [id]
    );

    if (notificationResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    const notification = notificationResult.rows[0];

    // Check ownership
    if (notification.user_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // If already read, return success
    if (notification.read) {
      return NextResponse.json(
        {
          success: true,
          message: 'Notification already marked as read'
        },
        { status: 200 }
      );
    }

    // Mark as read
    await query(
      `UPDATE notifications 
       SET read = true, 
           read_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    console.log('✅ [NOTIFICATION] ✅ Notification marked as read');

    return NextResponse.json(
      {
        success: true,
        message: 'Notification marked as read'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('✅ [NOTIFICATION] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to mark notification as read' 
      },
      { status: 500 }
    );
  }
}

