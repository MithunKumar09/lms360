/**
 * Notification Details API Route
 * 
 * Handles individual notification operations:
 * - DELETE: Delete notification
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';

/**
 * DELETE /api/notifications/[id]
 * Delete notification
 */
export async function DELETE(request, { params }) {
  try {
    console.log('🗑️ [NOTIFICATION] ===== DELETE NOTIFICATION STARTED =====');
    
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
      `SELECT id, user_id FROM notifications WHERE id = $1`,
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

    // Delete notification
    await query(
      `DELETE FROM notifications WHERE id = $1`,
      [id]
    );

    console.log('🗑️ [NOTIFICATION] ✅ Notification deleted');

    return NextResponse.json(
      {
        success: true,
        message: 'Notification deleted successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('🗑️ [NOTIFICATION] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete notification' 
      },
      { status: 500 }
    );
  }
}

