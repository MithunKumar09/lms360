/**
 * Mark All Notifications as Read API Route
 * 
 * PATCH /api/notifications/read-all
 * Mark all user notifications as read
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';

export async function PATCH(request) {
  try {
    console.log('✅ [NOTIFICATIONS] ===== MARK ALL READ STARTED =====');
    
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Update all unread notifications for the user
    const result = await query(
      `UPDATE notifications 
       SET read = true, 
           read_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND read = false
       RETURNING id`,
      [userId]
    );

    const updatedCount = result.rows.length;

    console.log('✅ [NOTIFICATIONS] ✅ Marked all as read:', updatedCount);

    return NextResponse.json(
      {
        success: true,
        data: {
          updated_count: updatedCount
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('✅ [NOTIFICATIONS] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to mark all notifications as read' 
      },
      { status: 500 }
    );
  }
}

