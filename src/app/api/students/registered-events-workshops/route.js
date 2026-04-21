/**
 * Student Registered Events & Workshops API Route
 * 
 * GET /api/students/registered-events-workshops - Get registered events and workshops (upcoming and ongoing only)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/students/registered-events-workshops
 * Get registered events and workshops that are upcoming or ongoing
 */
export async function GET(request) {
  try {
    // Authentication: Only students and alumni can access
    const session = await requireRole(request, ['student', 'alumni']);
    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const type = searchParams.get('type') || 'all'; // 'events', 'workshops', or 'all'

    const now = new Date().toISOString();

    // Fetch registered events (upcoming or ongoing)
    let events = [];
    if (type === 'all' || type === 'events') {
      const eventsQuery = `
        SELECT 
          e.id,
          e.title,
          e.description,
          e.banner_url as cover_image_url,
          e.start_date,
          e.end_date,
          e.mode,
          e.external_link,
          e.is_free,
          e.price,
          e.status,
          er.registered_at,
          er.registration_status,
          'event' as type
        FROM event_registrations er
        JOIN events e ON er.event_id = e.id
        WHERE er.user_id = $1 
          AND er.registration_status = 'registered'
          AND e.status = 'published'
          AND (
            (e.start_date > $2::timestamp) OR 
            (e.start_date <= $2::timestamp AND e.end_date >= $2::timestamp)
          )
        ORDER BY e.start_date ASC
        LIMIT $3
      `;

      const eventsResult = await query(eventsQuery, [userId, now, limit]);
      events = eventsResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        coverImageUrl: row.cover_image_url,
        startDate: row.start_date,
        endDate: row.end_date,
        mode: row.mode,
        externalLink: row.external_link,
        location: null, // Location field not in schema
        isFree: row.is_free,
        price: row.price ? parseFloat(row.price) : null,
        status: row.status,
        registeredAt: row.registered_at,
        registrationStatus: row.registration_status,
        type: 'event',
      }));
    }

    // Fetch registered workshops (upcoming or ongoing)
    let workshops = [];
    if (type === 'all' || type === 'workshops') {
      const workshopsQuery = `
        SELECT 
          w.id,
          w.title,
          w.description,
          w.banner_url as cover_image_url,
          w.start_date,
          w.end_date,
          w.mode,
          w.external_link,
          w.is_free,
          w.price,
          w.status,
          wr.registered_at,
          wr.registration_status,
          'workshop' as type
        FROM workshop_registrations wr
        JOIN workshops w ON wr.workshop_id = w.id
        WHERE wr.user_id = $1 
          AND wr.registration_status = 'registered'
          AND w.status = 'published'
          AND (
            (w.start_date > $2::timestamp) OR 
            (w.start_date <= $2::timestamp AND w.end_date >= $2::timestamp)
          )
        ORDER BY w.start_date ASC
        LIMIT $3
      `;

      const workshopsResult = await query(workshopsQuery, [userId, now, limit]);
      workshops = workshopsResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        coverImageUrl: row.cover_image_url,
        startDate: row.start_date,
        endDate: row.end_date,
        mode: row.mode,
        externalLink: row.external_link,
        location: null, // Location field not in schema
        isFree: row.is_free,
        price: row.price ? parseFloat(row.price) : null,
        status: row.status,
        registeredAt: row.registered_at,
        registrationStatus: row.registration_status,
        type: 'workshop',
      }));
    }

    // Combine and sort by start date
    const allItems = [...events, ...workshops].sort((a, b) => {
      return new Date(a.startDate) - new Date(b.startDate);
    });

    return NextResponse.json({
      success: true,
      data: {
        events,
        workshops,
        items: allItems,
        total: allItems.length,
      },
    });
  } catch (error) {
    console.error('Error fetching registered events/workshops:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch registered events and workshops',
      },
      { status: error.status || 500 }
    );
  }
}
