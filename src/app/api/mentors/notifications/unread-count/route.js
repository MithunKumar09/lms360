/**
 * Unread Notification Count API Route
 * 
 * GET /api/mentors/notifications/unread-count - Get unread notification count
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/mentors/notifications/unread-count
 * Get unread notification count for mentor
 */
export async function GET(request) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Get unread count
    const result = await query(
      `SELECT COUNT(*)::int as count
       FROM mentor_notifications
       WHERE mentor_id = $1 AND read = FALSE`,
      [mentorId]
    );

    const unreadCount = result.rows[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        unread_count: unreadCount,
      },
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch unread count' },
      { status: 500 }
    );
  }
}
