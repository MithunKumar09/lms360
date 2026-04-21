/**
 * Mentor Registration Analytics API Route
 * 
 * GET /api/mentors/analytics/registrations - Get registration analytics data
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/mentors/analytics/registrations
 * Get comprehensive registration analytics
 */
export async function GET(request) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days: 7, 30, 90, 365
    const eventId = searchParams.get('event_id'); // Filter by specific event
    const workshopId = searchParams.get('workshop_id'); // Filter by specific workshop
    const type = searchParams.get('type') || 'all'; // 'events', 'workshops', 'all'

    const days = parseInt(period, 10);
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Build date filter - use parameterized query for safety
    const dateFromISO = dateFrom.toISOString();

    // Build query parameters array
    let queryParams = [mentorId, dateFromISO];
    let eventParamIndex = null;
    let workshopParamIndex = null;

    if (eventId) {
      queryParams.push(eventId);
      eventParamIndex = queryParams.length;
    }
    if (workshopId) {
      queryParams.push(workshopId);
      workshopParamIndex = queryParams.length;
    }

    // Get all analytics in parallel
    const [
      overviewStats,
      trendsData,
      popularEvents,
      popularWorkshops,
      patternsData,
      capacityUtilization,
    ] = await Promise.all([
      // Overview statistics
      query(
        `SELECT 
          COUNT(DISTINCT er.id)::int as total_event_registrations,
          COUNT(DISTINCT wr.id)::int as total_workshop_registrations,
          COUNT(DISTINCT er.event_id)::int as events_with_registrations,
          COUNT(DISTINCT wr.workshop_id)::int as workshops_with_registrations,
          COUNT(DISTINCT er.user_id)::int as unique_event_registrants,
          COUNT(DISTINCT wr.user_id)::int as unique_workshop_registrants,
          COUNT(CASE WHEN er.registration_status = 'registered' THEN 1 END)::int as active_event_registrations,
          COUNT(CASE WHEN wr.registration_status = 'registered' THEN 1 END)::int as active_workshop_registrations,
          COUNT(CASE WHEN er.payment_status = 'paid' THEN 1 END)::int as paid_event_registrations,
          COUNT(CASE WHEN wr.payment_status = 'paid' THEN 1 END)::int as paid_workshop_registrations
         FROM events e
         LEFT JOIN event_registrations er ON er.event_id = e.id AND er.registered_at >= $2
         LEFT JOIN workshops w ON w.created_by = $1
         LEFT JOIN workshop_registrations wr ON wr.workshop_id = w.id AND wr.registered_at >= $2
         WHERE e.created_by = $1
           ${eventId ? `AND e.id = $${eventParamIndex}` : ''}
           ${workshopId ? `AND w.id = $${workshopParamIndex}` : ''}`,
        queryParams
      ),

      // Trends over time (daily)
      query(
        `SELECT 
          DATE(registered_at) as date,
          COUNT(*)::int as count,
          'event' as type
         FROM event_registrations er
         JOIN events e ON er.event_id = e.id
         WHERE e.created_by = $1
           AND er.registered_at >= $2
           ${eventId ? `AND e.id = $${eventParamIndex}` : ''}
           ${type === 'workshops' ? 'AND 1=0' : ''}
         GROUP BY DATE(registered_at)
         
         UNION ALL
         
         SELECT 
          DATE(registered_at) as date,
          COUNT(*)::int as count,
          'workshop' as type
         FROM workshop_registrations wr
         JOIN workshops w ON wr.workshop_id = w.id
         WHERE w.created_by = $1
           AND wr.registered_at >= $2
           ${workshopId ? `AND w.id = $${workshopParamIndex}` : ''}
           ${type === 'events' ? 'AND 1=0' : ''}
         GROUP BY DATE(registered_at)
         
         ORDER BY date ASC`,
        queryParams
      ),

      // Popular events (top 10 by registrations)
      query(
        `SELECT 
          e.id,
          e.title,
          e.start_date,
          e.capacity,
          COUNT(er.id)::int as registration_count,
          COUNT(CASE WHEN er.registration_status = 'registered' THEN 1 END)::int as active_registrations
         FROM events e
         LEFT JOIN event_registrations er ON er.event_id = e.id
         WHERE e.created_by = $1
           ${eventId ? `AND e.id = $${eventParamIndex}` : ''}
         GROUP BY e.id, e.title, e.start_date, e.capacity
         ORDER BY registration_count DESC
         LIMIT 10`,
        queryParams
      ),

      // Popular workshops (top 10 by registrations)
      query(
        `SELECT 
          w.id,
          w.title,
          w.start_date,
          w.capacity,
          COUNT(wr.id)::int as registration_count,
          COUNT(CASE WHEN wr.registration_status = 'registered' THEN 1 END)::int as active_registrations
         FROM workshops w
         LEFT JOIN workshop_registrations wr ON wr.workshop_id = w.id
         WHERE w.created_by = $1
           ${workshopId ? `AND w.id = $${workshopParamIndex}` : ''}
         GROUP BY w.id, w.title, w.start_date, w.capacity
         ORDER BY registration_count DESC
         LIMIT 10`,
        queryParams
      ),

      // Registration patterns (hour of day, day of week)
      query(
        `SELECT 
          EXTRACT(HOUR FROM registered_at)::int as hour_of_day,
          COUNT(*)::int as count,
          'event' as type
         FROM event_registrations er
         JOIN events e ON er.event_id = e.id
         WHERE e.created_by = $1
           AND er.registered_at >= $2
           ${eventId ? `AND e.id = $${eventParamIndex}` : ''}
           ${type === 'workshops' ? 'AND 1=0' : ''}
         GROUP BY EXTRACT(HOUR FROM registered_at)
         
         UNION ALL
         
         SELECT 
          EXTRACT(HOUR FROM registered_at)::int as hour_of_day,
          COUNT(*)::int as count,
          'workshop' as type
         FROM workshop_registrations wr
         JOIN workshops w ON wr.workshop_id = w.id
         WHERE w.created_by = $1
           AND wr.registered_at >= $2
           ${workshopId ? `AND w.id = $${workshopParamIndex}` : ''}
           ${type === 'events' ? 'AND 1=0' : ''}
         GROUP BY EXTRACT(HOUR FROM registered_at)
         
         ORDER BY hour_of_day ASC`,
        queryParams
      ),

      // Capacity utilization statistics
      query(
        `SELECT 
          AVG(
            CASE 
              WHEN e.capacity IS NOT NULL AND e.capacity > 0 THEN
                (SELECT COUNT(*)::float FROM event_registrations 
                 WHERE event_id = e.id AND registration_status = 'registered') / e.capacity * 100
              ELSE NULL
            END
          )::numeric(5,2) as avg_event_utilization,
          AVG(
            CASE 
              WHEN w.capacity IS NOT NULL AND w.capacity > 0 THEN
                (SELECT COUNT(*)::float FROM workshop_registrations 
                 WHERE workshop_id = w.id AND registration_status = 'registered') / w.capacity * 100
              ELSE NULL
            END
          )::numeric(5,2) as avg_workshop_utilization,
          COUNT(CASE WHEN e.capacity IS NOT NULL THEN 1 END)::int as events_with_capacity,
          COUNT(CASE WHEN w.capacity IS NOT NULL THEN 1 END)::int as workshops_with_capacity
         FROM events e
         FULL OUTER JOIN workshops w ON w.created_by = $1
         WHERE e.created_by = $1`,
        [mentorId]
      ),
    ]);

    // Format overview statistics
    const stats = overviewStats.rows[0] || {
      total_event_registrations: 0,
      total_workshop_registrations: 0,
      events_with_registrations: 0,
      workshops_with_registrations: 0,
      unique_event_registrants: 0,
      unique_workshop_registrants: 0,
      active_event_registrations: 0,
      active_workshop_registrations: 0,
      paid_event_registrations: 0,
      paid_workshop_registrations: 0,
    };

    // Format trends data
    const trends = trendsData.rows.map(row => ({
      date: row.date,
      count: row.count,
      type: row.type,
    }));

    // Format popular events
    const popularEventsData = popularEvents.rows.map(row => ({
      id: row.id,
      title: row.title,
      start_date: row.start_date,
      capacity: row.capacity,
      registration_count: row.registration_count,
      active_registrations: row.active_registrations,
      utilization_percentage: row.capacity && row.capacity > 0
        ? Math.round((row.active_registrations / row.capacity) * 100)
        : null,
    }));

    // Format popular workshops
    const popularWorkshopsData = popularWorkshops.rows.map(row => ({
      id: row.id,
      title: row.title,
      start_date: row.start_date,
      capacity: row.capacity,
      registration_count: row.registration_count,
      active_registrations: row.active_registrations,
      utilization_percentage: row.capacity && row.capacity > 0
        ? Math.round((row.active_registrations / row.capacity) * 100)
        : null,
    }));

    // Format patterns data (hour of day)
    const patterns = patternsData.rows.map(row => ({
      hour_of_day: row.hour_of_day,
      count: row.count,
      type: row.type,
    }));

    // Calculate day of week patterns
    const dayOfWeekPatterns = await query(
      `SELECT 
        EXTRACT(DOW FROM registered_at)::int as day_of_week,
        COUNT(*)::int as count,
        'event' as type
       FROM event_registrations er
       JOIN events e ON er.event_id = e.id
       WHERE e.created_by = $1
         AND er.registered_at >= $2
         ${eventId ? `AND e.id = $${eventParamIndex}` : ''}
         ${type === 'workshops' ? 'AND 1=0' : ''}
       GROUP BY EXTRACT(DOW FROM registered_at)
       
       UNION ALL
       
       SELECT 
        EXTRACT(DOW FROM registered_at)::int as day_of_week,
        COUNT(*)::int as count,
        'workshop' as type
       FROM workshop_registrations wr
       JOIN workshops w ON wr.workshop_id = w.id
       WHERE w.created_by = $1
         AND wr.registered_at >= $2
         ${workshopId ? `AND w.id = $${workshopParamIndex}` : ''}
         ${type === 'events' ? 'AND 1=0' : ''}
       GROUP BY EXTRACT(DOW FROM registered_at)
       
       ORDER BY day_of_week ASC`,
      queryParams
    );

    const dayOfWeek = dayOfWeekPatterns.rows.map(row => ({
      day_of_week: row.day_of_week, // 0 = Sunday, 1 = Monday, etc.
      count: row.count,
      type: row.type,
    }));

    // Format capacity utilization
    const capacity = capacityUtilization.rows[0] || {
      avg_event_utilization: null,
      avg_workshop_utilization: null,
      events_with_capacity: 0,
      workshops_with_capacity: 0,
    };

    // Calculate average registrations per event/workshop
    const avgEventRegistrations = stats.events_with_registrations > 0
      ? (stats.total_event_registrations / stats.events_with_registrations).toFixed(2)
      : 0;
    const avgWorkshopRegistrations = stats.workshops_with_registrations > 0
      ? (stats.total_workshop_registrations / stats.workshops_with_registrations).toFixed(2)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total_registrations: stats.total_event_registrations + stats.total_workshop_registrations,
          total_event_registrations: stats.total_event_registrations,
          total_workshop_registrations: stats.total_workshop_registrations,
          events_with_registrations: stats.events_with_registrations,
          workshops_with_registrations: stats.workshops_with_registrations,
          unique_registrants: stats.unique_event_registrants + stats.unique_workshop_registrants,
          active_registrations: stats.active_event_registrations + stats.active_workshop_registrations,
          paid_registrations: stats.paid_event_registrations + stats.paid_workshop_registrations,
          avg_event_registrations: parseFloat(avgEventRegistrations),
          avg_workshop_registrations: parseFloat(avgWorkshopRegistrations),
        },
        trends: {
          daily: trends,
          period: days,
          date_from: dateFrom.toISOString(),
        },
        popular: {
          events: popularEventsData,
          workshops: popularWorkshopsData,
        },
        patterns: {
          hour_of_day: patterns,
          day_of_week: dayOfWeek,
        },
        capacity_utilization: {
          avg_event_utilization: capacity.avg_event_utilization
            ? parseFloat(capacity.avg_event_utilization)
            : null,
          avg_workshop_utilization: capacity.avg_workshop_utilization
            ? parseFloat(capacity.avg_workshop_utilization)
            : null,
          events_with_capacity: capacity.events_with_capacity,
          workshops_with_capacity: capacity.workshops_with_capacity,
        },
      },
    });
  } catch (error) {
    console.error('Get registration analytics error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch registration analytics' },
      { status: 500 }
    );
  }
}
