/**
 * Notifications API Route
 * 
 * Handles user notifications:
 * - GET: List notifications with filters and pagination
 * - PATCH: Mark all notifications as read
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';

/**
 * GET /api/notifications
 * Get user notifications
 * 
 * Query params:
 * - page?: number (default: 1)
 * - limit?: number (default: 20, max: 50)
 * - read?: boolean (filter by read status)
 * - type?: string (filter by notification type)
 * - start_date?: string (ISO date)
 * - end_date?: string (ISO date)
 */
export async function GET(request) {
  try {
    // console.log('🔔 [NOTIFICATIONS] ===== GET NOTIFICATIONS STARTED =====');
    
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    
    const readParam = searchParams.get('read');
    const read = readParam === 'true' ? true : readParam === 'false' ? false : null;
    const type = searchParams.get('type') || null;
    const startDate = searchParams.get('start_date') || null;
    const endDate = searchParams.get('end_date') || null;

    // Build WHERE clause
    const whereConditions = ['user_id = $1'];
    const queryParams = [userId];
    let paramIndex = 2;

    if (read !== null) {
      whereConditions.push(`read = $${paramIndex}`);
      queryParams.push(read);
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM notifications ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get unread count (for all user notifications, not filtered)
    const unreadCountResult = await query(
      `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1 AND read = false`,
      [userId]
    );
    const unreadCount = parseInt(unreadCountResult.rows[0].total, 10);

    // Get notifications
    const notificationsQuery = `
      SELECT 
        id,
        type,
        title,
        message,
        data,
        read,
        read_at,
        action_url,
        created_at
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const notificationsResult = await query(notificationsQuery, queryParams);

    const notifications = notificationsResult.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: row.data,
      read: row.read,
      read_at: row.read_at,
      action_url: row.action_url,
      created_at: row.created_at
    }));

    const totalPages = Math.ceil(total / limit);

    // console.log('🔔 [NOTIFICATIONS] ✅ Notifications fetched:', notifications.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          notifications,
          unread_count: unreadCount,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('🔔 [NOTIFICATIONS] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch notifications' 
      },
      { status: 500 }
    );
  }
}


