/**
 * Mentor Notifications API Route
 * 
 * GET /api/mentors/notifications - List notifications for mentor
 * POST /api/mentors/notifications - Mark notifications as read (bulk)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/mentors/notifications
 * List notifications for mentor
 */
export async function GET(request) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const type = searchParams.get('type'); // Filter by notification type
    const read = searchParams.get('read'); // Filter by read status (true/false)
    const sort = searchParams.get('sort') || 'created_at_desc'; // Sort order

    const offset = (page - 1) * limit;

    // Build query with filters
    let whereConditions = ['mn.mentor_id = $1'];
    const queryParams = [mentorId];
    let paramIndex = 2;

    if (type) {
      whereConditions.push(`mn.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (read !== null && read !== undefined) {
      whereConditions.push(`mn.read = $${paramIndex}`);
      queryParams.push(read === 'true');
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    let orderBy = 'mn.created_at DESC';
    if (sort === 'created_at_asc') {
      orderBy = 'mn.created_at ASC';
    } else if (sort === 'read_first') {
      orderBy = 'mn.read ASC, mn.created_at DESC';
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*)::int as total
       FROM mentor_notifications mn
       ${whereClause}`,
      queryParams
    );
    const total = countResult.rows[0]?.total || 0;

    // Get notifications
    const notificationsResult = await query(
      `SELECT 
        mn.id,
        mn.mentor_id,
        mn.type,
        mn.title,
        mn.message,
        mn.data,
        mn.read,
        mn.read_at,
        mn.created_at
       FROM mentor_notifications mn
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const notifications = notificationsResult.rows.map(row => ({
      id: row.id,
      mentor_id: row.mentor_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data,
      read: row.read,
      read_at: row.read_at,
      created_at: row.created_at,
    }));

    // Get unread count
    const unreadCountResult = await query(
      `SELECT COUNT(*)::int as count
       FROM mentor_notifications
       WHERE mentor_id = $1 AND read = FALSE`,
      [mentorId]
    );
    const unreadCount = unreadCountResult.rows[0]?.count || 0;

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        unread_count: unreadCount,
      },
    });
  } catch (error) {
    console.error('Get mentor notifications error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mentors/notifications
 * Mark notifications as read (bulk)
 */
export async function POST(request) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const body = await request.json();
    const { notification_ids, mark_all_read } = body;

    if (mark_all_read) {
      // Mark all notifications as read
      await query(
        `UPDATE mentor_notifications
         SET read = TRUE, read_at = CURRENT_TIMESTAMP
         WHERE mentor_id = $1 AND read = FALSE`,
        [mentorId]
      );

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
      });
    }

    if (!notification_ids || !Array.isArray(notification_ids) || notification_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Notification IDs array is required' },
        { status: 400 }
      );
    }

    // Verify all notifications belong to mentor
    const verifyResult = await query(
      `SELECT COUNT(*)::int as count
       FROM mentor_notifications
       WHERE id = ANY($1::uuid[]) AND mentor_id = $2`,
      [notification_ids, mentorId]
    );

    if (verifyResult.rows[0]?.count !== notification_ids.length) {
      return NextResponse.json(
        { success: false, error: 'Some notifications not found or you do not have permission' },
        { status: 403 }
      );
    }

    // Mark notifications as read
    await query(
      `UPDATE mentor_notifications
       SET read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE id = ANY($1::uuid[]) AND mentor_id = $2`,
      [notification_ids, mentorId]
    );

    return NextResponse.json({
      success: true,
      message: `${notification_ids.length} notification(s) marked as read`,
    });
  } catch (error) {
    console.error('Mark notifications as read error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}
