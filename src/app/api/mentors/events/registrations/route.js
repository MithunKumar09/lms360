/**
 * Mentor Event Registrations API Route
 * 
 * GET /api/mentors/events/registrations - Get all registrations across all mentor's events
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/mentors/events/registrations
 * Get all registrations across all mentor's events
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
    const eventId = searchParams.get('event_id'); // Filter by specific event
    const status = searchParams.get('status'); // Filter by registration_status
    const dateFrom = searchParams.get('date_from'); // Filter by registration date from
    const dateTo = searchParams.get('date_to'); // Filter by registration date to
    const search = searchParams.get('search'); // Search by user name/email or event title

    const offset = (page - 1) * limit;

    // Build query with filters
    let whereConditions = ['e.created_by = $1'];
    const queryParams = [mentorId];
    let paramIndex = 2;

    if (eventId) {
      whereConditions.push(`er.event_id = $${paramIndex}`);
      queryParams.push(eventId);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`er.registration_status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`er.registered_at >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`er.registered_at <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        u.first_name ILIKE $${paramIndex} OR 
        u.last_name ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR
        e.title ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*)::int as total
       FROM event_registrations er
       JOIN events e ON er.event_id = e.id
       JOIN users u ON er.user_id = u.id
       ${whereClause}`,
      queryParams
    );
    const total = countResult.rows[0]?.total || 0;

    // Get registrations with event and user details
    const registrationsResult = await query(
      `SELECT 
        er.id,
        er.event_id,
        er.user_id,
        er.order_id,
        er.registered_at,
        er.registration_status,
        er.payment_status,
        er.created_at,
        er.updated_at,
        e.title as event_title,
        e.start_date as event_start_date,
        e.end_date as event_end_date,
        e.capacity as event_capacity,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url
       FROM event_registrations er
       JOIN events e ON er.event_id = e.id
       JOIN users u ON er.user_id = u.id
       ${whereClause}
       ORDER BY er.registered_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const registrations = registrationsResult.rows.map(row => ({
      id: row.id,
      event_id: row.event_id,
      user_id: row.user_id,
      order_id: row.order_id,
      registered_at: row.registered_at,
      registration_status: row.registration_status,
      payment_status: row.payment_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      event: {
        id: row.event_id,
        title: row.event_title,
        start_date: row.event_start_date,
        end_date: row.event_end_date,
        capacity: row.event_capacity,
      },
      user: {
        id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        avatar_url: row.avatar_url,
      },
    }));

    // Get summary statistics
    const statsResult = await query(
      `SELECT 
        COUNT(*)::int as total_registrations,
        COUNT(DISTINCT er.event_id)::int as events_with_registrations,
        COUNT(CASE WHEN er.registration_status = 'registered' THEN 1 END)::int as registered_count,
        COUNT(CASE WHEN er.registration_status = 'cancelled' THEN 1 END)::int as cancelled_count,
        COUNT(CASE WHEN er.registration_status = 'attended' THEN 1 END)::int as attended_count,
        COUNT(CASE WHEN er.payment_status = 'paid' THEN 1 END)::int as paid_count
       FROM event_registrations er
       JOIN events e ON er.event_id = e.id
       WHERE e.created_by = $1`,
      [mentorId]
    );

    const stats = statsResult.rows[0] || {
      total_registrations: 0,
      events_with_registrations: 0,
      registered_count: 0,
      cancelled_count: 0,
      attended_count: 0,
      paid_count: 0,
    };

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        registrations,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        statistics: {
          total_registrations: stats.total_registrations,
          events_with_registrations: stats.events_with_registrations,
          by_status: {
            registered: stats.registered_count,
            cancelled: stats.cancelled_count,
            attended: stats.attended_count,
          },
          by_payment: {
            paid: stats.paid_count,
          },
        },
      },
    });
  } catch (error) {
    console.error('Get mentor event registrations error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}
