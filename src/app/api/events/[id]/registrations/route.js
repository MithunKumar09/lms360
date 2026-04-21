/**
 * Event Registrations API Route
 * 
 * GET /api/events/[id]/registrations - List all registrations for an event (Mentor only)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/events/[id]/registrations
 * List all registrations for an event
 * Only the mentor who created the event can view registrations
 */
export async function GET(request, { params }) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;
    const eventId = params.id;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Verify event exists and belongs to mentor
    const eventCheck = await query(
      `SELECT id, title, capacity, created_by,
              (SELECT COUNT(*) FROM event_registrations 
               WHERE event_id = events.id AND registration_status = 'registered') as current_registrations
       FROM events 
       WHERE id = $1`,
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const event = eventCheck.rows[0];

    if (event.created_by !== mentorId) {
      return NextResponse.json(
        { success: false, error: 'You can only view registrations for your own events' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status'); // Filter by registration_status
    const paymentStatus = searchParams.get('payment_status'); // Filter by payment_status
    const search = searchParams.get('search'); // Search by user name/email

    const offset = (page - 1) * limit;

    // Build query with filters
    let whereConditions = ['er.event_id = $1'];
    const queryParams = [eventId];
    let paramIndex = 2;

    if (status) {
      whereConditions.push(`er.registration_status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (paymentStatus) {
      whereConditions.push(`er.payment_status = $${paramIndex}`);
      queryParams.push(paymentStatus);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        u.first_name ILIKE $${paramIndex} OR 
        u.last_name ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*)::int as total
       FROM event_registrations er
       JOIN users u ON er.user_id = u.id
       ${whereClause}`,
      queryParams
    );
    const total = countResult.rows[0]?.total || 0;

    // Get registrations with user details
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
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url
       FROM event_registrations er
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
      user: {
        id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        avatar_url: row.avatar_url,
      },
    }));

    const totalPages = Math.ceil(total / limit);

    // Calculate capacity utilization
    const capacity = event.capacity ? parseInt(event.capacity) : null;
    const currentRegistrations = parseInt(event.current_registrations) || 0;
    const availableSlots = capacity ? capacity - currentRegistrations : null;
    const utilizationPercentage = capacity ? Math.round((currentRegistrations / capacity) * 100) : null;

    return NextResponse.json({
      success: true,
      data: {
        event: {
          id: event.id,
          title: event.title,
          capacity,
          current_registrations: currentRegistrations,
          available_slots: availableSlots,
          utilization_percentage: utilizationPercentage,
        },
        registrations,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get event registrations error:', error);
    
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
