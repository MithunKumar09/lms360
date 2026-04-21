/**
 * Mentor Dashboard Statistics API Route
 * 
 * GET /api/mentors/dashboard-stats - Get comprehensive dashboard statistics for mentor
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/mentors/dashboard-stats
 * Get comprehensive dashboard statistics
 */
export async function GET(request) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Get all statistics in parallel for better performance
    const [
      eventsStats,
      workshopsStats,
      jobsStats,
      classroomStats,
      upcomingEvents,
      upcomingWorkshops,
      recentRegistrations,
      recentApplications,
    ] = await Promise.all([
      // Events statistics
      query(
        `SELECT 
          COUNT(*)::int as total,
          COUNT(CASE WHEN status = 'published' THEN 1 END)::int as published,
          COUNT(CASE WHEN status = 'draft' THEN 1 END)::int as draft,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int as cancelled,
          COALESCE((
            SELECT COUNT(*)::int
            FROM event_registrations er
            JOIN events e ON er.event_id = e.id
            WHERE e.created_by = $1 AND er.registration_status = 'registered'
          ), 0) as total_registrations
         FROM events
         WHERE created_by = $1`,
        [mentorId]
      ),

      // Workshops statistics
      query(
        `SELECT 
          COUNT(*)::int as total,
          COUNT(CASE WHEN status = 'published' THEN 1 END)::int as published,
          COUNT(CASE WHEN status = 'draft' THEN 1 END)::int as draft,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int as cancelled,
          COALESCE((
            SELECT COUNT(*)::int
            FROM workshop_registrations wr
            JOIN workshops w ON wr.workshop_id = w.id
            WHERE w.created_by = $1 AND wr.registration_status = 'registered'
          ), 0) as total_registrations
         FROM workshops
         WHERE created_by = $1`,
        [mentorId]
      ),

      // Jobs statistics
      query(
        `SELECT 
          COUNT(*)::int as total,
          COUNT(CASE WHEN status = 'published' THEN 1 END)::int as published,
          COUNT(CASE WHEN status = 'draft' THEN 1 END)::int as draft,
          COUNT(CASE WHEN status = 'closed' THEN 1 END)::int as closed,
          COALESCE((
            SELECT COUNT(*)::int
            FROM job_applications ja
            JOIN jobs j ON ja.job_id = j.id
            WHERE j.created_by = $1
          ), 0) as total_applications
         FROM jobs
         WHERE created_by = $1`,
        [mentorId]
      ),

      // Classroom statistics
      query(
        `SELECT 
          COUNT(DISTINCT msa.cohort_id)::int as total_groups,
          COUNT(DISTINCT msa.student_id)::int as total_students
         FROM mentor_student_assignments msa
         WHERE msa.mentor_id = $1`,
        [mentorId]
      ),

      // Upcoming events (next 7 days)
      query(
        `SELECT 
          id,
          title,
          start_date,
          end_date,
          mode,
          capacity,
          external_link,
          (
            SELECT COUNT(*)::int
            FROM event_registrations
            WHERE event_id = events.id AND registration_status = 'registered'
          ) as current_registrations
         FROM events
         WHERE created_by = $1
           AND status = 'published'
           AND start_date >= CURRENT_DATE
           AND start_date <= CURRENT_DATE + INTERVAL '7 days'
         ORDER BY start_date ASC
         LIMIT 5`,
        [mentorId]
      ),

      // Upcoming workshops (next 7 days)
      query(
        `SELECT 
          id,
          title,
          start_date,
          end_date,
          mode,
          capacity,
          external_link,
          (
            SELECT COUNT(*)::int
            FROM workshop_registrations
            WHERE workshop_id = workshops.id AND registration_status = 'registered'
          ) as current_registrations
         FROM workshops
         WHERE created_by = $1
           AND status = 'published'
           AND start_date >= CURRENT_DATE
           AND start_date <= CURRENT_DATE + INTERVAL '7 days'
         ORDER BY start_date ASC
         LIMIT 5`,
        [mentorId]
      ),

      // Recent registrations (last 10)
      query(
        `SELECT * FROM (
          SELECT 
            er.id,
            er.event_id as item_id,
            er.registered_at,
            er.registration_status,
            e.title as event_title,
            NULL::text as workshop_title,
            u.first_name,
            u.last_name,
            u.email,
            'event' as type
           FROM event_registrations er
           JOIN events e ON er.event_id = e.id
           JOIN users u ON er.user_id = u.id
           WHERE e.created_by = $1
           ORDER BY er.registered_at DESC
           LIMIT 5
        ) AS event_regs
         
         UNION ALL
         
         SELECT * FROM (
          SELECT 
            wr.id,
            wr.workshop_id as item_id,
            wr.registered_at,
            wr.registration_status,
            NULL::text as event_title,
            w.title as workshop_title,
            u.first_name,
            u.last_name,
            u.email,
            'workshop' as type
           FROM workshop_registrations wr
           JOIN workshops w ON wr.workshop_id = w.id
           JOIN users u ON wr.user_id = u.id
           WHERE w.created_by = $1
           ORDER BY wr.registered_at DESC
           LIMIT 5
        ) AS workshop_regs
         
         ORDER BY registered_at DESC
         LIMIT 10`,
        [mentorId]
      ),

      // Recent applications (last 10)
      query(
        `SELECT 
          ja.id,
          ja.job_id,
          ja.applied_at,
          ja.application_status,
          j.title as job_title,
          j.company as job_company,
          u.first_name,
          u.last_name,
          u.email
         FROM job_applications ja
         JOIN jobs j ON ja.job_id = j.id
         JOIN users u ON ja.user_id = u.id
         WHERE j.created_by = $1
         ORDER BY ja.applied_at DESC
         LIMIT 10`,
        [mentorId]
      ),
    ]);

    // Format events statistics
    const eventsData = eventsStats.rows[0] || {
      total: 0,
      published: 0,
      draft: 0,
      cancelled: 0,
      total_registrations: 0,
    };

    // Format workshops statistics
    const workshopsData = workshopsStats.rows[0] || {
      total: 0,
      published: 0,
      draft: 0,
      cancelled: 0,
      total_registrations: 0,
    };

    // Format jobs statistics
    const jobsData = jobsStats.rows[0] || {
      total: 0,
      published: 0,
      draft: 0,
      closed: 0,
      total_applications: 0,
    };

    // Format classroom statistics
    const classroomData = classroomStats.rows[0] || {
      total_groups: 0,
      total_students: 0,
    };

    // Format upcoming events
    // #region agent edit
    const upcomingEventsData = Array.isArray(upcomingEvents?.rows) ? upcomingEvents.rows
      .filter(row => row && typeof row === 'object' && row.id)
      .map(row => ({
        id: row.id,
        title: row.title || 'Untitled Event',
        start_date: row.start_date,
        end_date: row.end_date,
        location: null, // Location column doesn't exist in events table
        mode: row.mode || null,
        capacity: typeof row.capacity === 'number' ? row.capacity : null,
        external_link: row.external_link || null,
        current_registrations: typeof row.current_registrations === 'number' ? row.current_registrations : 0,
        available_slots: typeof row.capacity === 'number' && typeof row.current_registrations === 'number' ? row.capacity - row.current_registrations : null,
      })) : [];
    // #endregion

    // Format upcoming workshops
    // #region agent edit
    const upcomingWorkshopsData = Array.isArray(upcomingWorkshops?.rows) ? upcomingWorkshops.rows
      .filter(row => row && typeof row === 'object' && row.id)
      .map(row => ({
        id: row.id,
        title: row.title || 'Untitled Workshop',
        start_date: row.start_date,
        end_date: row.end_date,
        location: null, // Location column doesn't exist in workshops table
        mode: row.mode || null,
        capacity: typeof row.capacity === 'number' ? row.capacity : null,
        external_link: row.external_link || null,
        current_registrations: typeof row.current_registrations === 'number' ? row.current_registrations : 0,
        available_slots: typeof row.capacity === 'number' && typeof row.current_registrations === 'number' ? row.capacity - row.current_registrations : null,
      })) : [];
    // #endregion

    // Format recent registrations
    // #region agent edit
    const recentRegistrationsData = Array.isArray(recentRegistrations?.rows) ? recentRegistrations.rows
      .filter(row => row && typeof row === 'object' && row.id)
      .map(row => ({
        id: row.id,
        type: row.type || 'event',
        registered_at: row.registered_at,
        registration_status: row.registration_status || 'registered',
        title: row.event_title || row.workshop_title || 'Unknown',
        user: {
          first_name: row.first_name || '',
          last_name: row.last_name || '',
          email: row.email || '',
        },
      })) : [];
    // #endregion

    // Format recent applications
    // #region agent edit
    const recentApplicationsData = Array.isArray(recentApplications?.rows) ? recentApplications.rows
      .filter(row => row && typeof row === 'object' && row.id)
      .map(row => ({
        id: row.id,
        applied_at: row.applied_at,
        application_status: row.application_status || 'pending',
        job: {
          title: row.job_title || 'Unknown Job',
          company: row.job_company || '',
        },
        applicant: {
          first_name: row.first_name || '',
          last_name: row.last_name || '',
          email: row.email || '',
        },
      })) : [];
    // #endregion

    // Combine recent activity
    // #region agent edit
    const recentActivity = [
      ...recentRegistrationsData.map(r => ({ ...r, activity_type: 'registration' })),
      ...recentApplicationsData.map(a => ({ ...a, activity_type: 'application' })),
    ]
      .filter(item => item && typeof item === 'object')
      .sort((a, b) => {
        const dateA = a.registered_at || a.applied_at;
        const dateB = b.registered_at || b.applied_at;
        if (!dateA || !dateB) return 0;
        const dateAObj = new Date(dateA);
        const dateBObj = new Date(dateB);
        if (isNaN(dateAObj.getTime()) || isNaN(dateBObj.getTime())) return 0;
        return dateBObj - dateAObj;
      })
      .slice(0, 10);
    // #endregion

    return NextResponse.json({
      success: true,
      data: {
        events: {
          total: eventsData.total,
          published: eventsData.published,
          draft: eventsData.draft,
          cancelled: eventsData.cancelled,
          totalRegistrations: eventsData.total_registrations,
        },
        workshops: {
          total: workshopsData.total,
          published: workshopsData.published,
          draft: workshopsData.draft,
          cancelled: workshopsData.cancelled,
          totalRegistrations: workshopsData.total_registrations,
        },
        jobs: {
          total: jobsData.total,
          published: jobsData.published,
          draft: jobsData.draft,
          closed: jobsData.closed,
          totalApplications: jobsData.total_applications,
        },
        classroom: {
          totalGroups: classroomData.total_groups,
          totalStudents: classroomData.total_students,
        },
        upcoming: {
          events: upcomingEventsData,
          workshops: upcomingWorkshopsData,
        },
        recentActivity,
      },
    });
  } catch (error) {
    console.error('Get mentor dashboard stats error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
