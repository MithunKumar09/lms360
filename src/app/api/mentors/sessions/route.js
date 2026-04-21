/**
 * Mentor Sessions API Route
 * 
 * GET /api/mentors/sessions - List sessions
 * POST /api/mentors/sessions - Create session
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import { createSessionScheduledActivity } from '@/lib/db/mentorActivityFeed.js';

/**
 * GET /api/mentors/sessions
 * List sessions for mentor with optional filters
 */
export async function GET(request) {
  try {
    console.log('📅 [MENTOR SESSIONS] ===== LIST SESSIONS STARTED =====');
    
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const cohortId = searchParams.get('cohort_id') || null;
    const status = searchParams.get('status') || null;
    const startDate = searchParams.get('start_date') || null;
    const endDate = searchParams.get('end_date') || null;

    // Build WHERE conditions
    const whereConditions = ['ms.mentor_id = $1'];
    const queryParams = [mentorId];
    let paramIndex = 2;

    if (cohortId) {
      whereConditions.push(`ms.cohort_id = $${paramIndex}`);
      queryParams.push(cohortId);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`ms.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`ms.scheduled_at >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`ms.scheduled_at <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM mentor_sessions ms
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get sessions
    const sessionsQuery = `
      SELECT 
        ms.id,
        ms.mentor_id,
        ms.cohort_id,
        ms.session_type,
        ms.title,
        ms.description,
        ms.scheduled_at,
        ms.duration_minutes,
        ms.status,
        ms.meeting_link,
        ms.location,
        ms.created_at,
        ms.updated_at,
        c.code as cohort_code
      FROM mentor_sessions ms
      LEFT JOIN cohorts c ON ms.cohort_id = c.id
      ${whereClause}
      ORDER BY ms.scheduled_at ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const sessionsResult = await query(sessionsQuery, queryParams);

    // Get students for each session
    const sessionIds = sessionsResult.rows.map(row => row.id);
    let studentsMap = {};
    if (sessionIds.length > 0) {
      const studentsQuery = `
        SELECT 
          mss.session_id,
          mss.student_id,
          mss.attendance_status,
          u.id as user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.avatar_url
        FROM mentor_session_students mss
        INNER JOIN users u ON mss.student_id = u.id
        WHERE mss.session_id = ANY($1)
      `;
      const studentsResult = await query(studentsQuery, [sessionIds]);
      
      studentsResult.rows.forEach(row => {
        if (!studentsMap[row.session_id]) {
          studentsMap[row.session_id] = [];
        }
        studentsMap[row.session_id].push({
          id: row.user_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          avatarUrl: row.avatar_url,
          attendanceStatus: row.attendance_status,
        });
      });
    }

    const sessions = sessionsResult.rows.map(row => ({
      id: row.id,
      mentorId: row.mentor_id,
      cohortId: row.cohort_id,
      sessionType: row.session_type,
      title: row.title,
      description: row.description,
      scheduledAt: row.scheduled_at,
      durationMinutes: row.duration_minutes,
      status: row.status,
      meetingLink: row.meeting_link,
      location: row.location,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      cohort: row.cohort_code ? { code: row.cohort_code } : null,
      students: studentsMap[row.id] || [],
    }));

    console.log('📅 [MENTOR SESSIONS] ✅ Sessions fetched:', sessions.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          sessions,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📅 [MENTOR SESSIONS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch sessions' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mentors/sessions
 * Create a new session
 */
export async function POST(request) {
  try {
    console.log('📅 [MENTOR SESSIONS] ===== CREATE SESSION STARTED =====');
    
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const body = await request.json();
    const {
      cohort_id,
      session_type = 'one_on_one',
      title,
      description,
      scheduled_at,
      duration_minutes = 60,
      meeting_link,
      location,
      student_ids = [],
    } = body;

    // Validation
    if (!title || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'title is required' },
        { status: 400 }
      );
    }

    if (!scheduled_at) {
      return NextResponse.json(
        { success: false, error: 'scheduled_at is required' },
        { status: 400 }
      );
    }

    const validSessionTypes = ['one_on_one', 'group', 'virtual', 'in_person'];
    if (!validSessionTypes.includes(session_type)) {
      return NextResponse.json(
        { success: false, error: `session_type must be one of: ${validSessionTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (duration_minutes <= 0) {
      return NextResponse.json(
        { success: false, error: 'duration_minutes must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate scheduled_at is in the future
    const scheduledDate = new Date(scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid scheduled_at format. Use ISO timestamp.' },
        { status: 400 }
      );
    }

    // Validate student_ids if provided
    if (student_ids.length > 0) {
      // Verify mentor-student relationships exist
      const relationshipQuery = `
        SELECT student_id
        FROM mentor_student_assignments
        WHERE mentor_id = $1 AND student_id = ANY($2)
      `;
      const relationshipResult = await query(relationshipQuery, [mentorId, student_ids]);
      const validStudentIds = relationshipResult.rows.map(row => row.student_id);
      const invalidIds = student_ids.filter(id => !validStudentIds.includes(id));
      
      if (invalidIds.length > 0) {
        return NextResponse.json(
          { success: false, error: `Invalid student_ids: ${invalidIds.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Insert session
    const insertQuery = `
      INSERT INTO mentor_sessions (
        mentor_id,
        cohort_id,
        session_type,
        title,
        description,
        scheduled_at,
        duration_minutes,
        meeting_link,
        location,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const insertResult = await query(insertQuery, [
      mentorId,
      cohort_id || null,
      session_type,
      title.trim(),
      description?.trim() || null,
      scheduledDate.toISOString(),
      duration_minutes,
      meeting_link || null,
      location || null,
      mentorId,
    ]);

    const sessionRecord = insertResult.rows[0];

    // Insert session students if provided
    if (student_ids.length > 0) {
      const insertStudentsQuery = `
        INSERT INTO mentor_session_students (session_id, student_id)
        SELECT $1, unnest($2::uuid[])
      `;
      await query(insertStudentsQuery, [sessionRecord.id, student_ids]);
    }

    // Fetch created session with students
    const getSessionQuery = `
      SELECT 
        ms.*,
        c.code as cohort_code
      FROM mentor_sessions ms
      LEFT JOIN cohorts c ON ms.cohort_id = c.id
      WHERE ms.id = $1
    `;
    const sessionResult = await query(getSessionQuery, [sessionRecord.id]);

    const studentsQuery = `
      SELECT 
        mss.student_id,
        mss.attendance_status,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url
      FROM mentor_session_students mss
      INNER JOIN users u ON mss.student_id = u.id
      WHERE mss.session_id = $1
    `;
    const studentsResult = await query(studentsQuery, [sessionRecord.id]);

    const sessionData = sessionResult.rows[0];
    const sessionResponse = {
      id: sessionData.id,
      mentorId: sessionData.mentor_id,
      cohortId: sessionData.cohort_id,
      sessionType: sessionData.session_type,
      title: sessionData.title,
      description: sessionData.description,
      scheduledAt: sessionData.scheduled_at,
      durationMinutes: sessionData.duration_minutes,
      status: sessionData.status,
      meetingLink: sessionData.meeting_link,
      location: sessionData.location,
      createdAt: sessionData.created_at,
      updatedAt: sessionData.updated_at,
      cohort: sessionData.cohort_code ? { code: sessionData.cohort_code } : null,
      students: studentsResult.rows.map(row => ({
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        avatarUrl: row.avatar_url,
        attendanceStatus: row.attendance_status,
      })),
    };

    // Create activity feed entry for each student
    try {
      if (student_ids.length > 0) {
        // One-on-one or group session with specific students
        for (const studentId of student_ids) {
          await createSessionScheduledActivity({
            mentorId: mentorId,
            studentId: studentId,
            cohortId: cohort_id || null,
            sessionId: sessionRecord.id,
            sessionTitle: title.trim(),
            createdBy: mentorId,
          });
        }
      } else {
        // Cohort-wide session (no specific students)
        await createSessionScheduledActivity({
          mentorId: mentorId,
          studentId: null,
          cohortId: cohort_id || null,
          sessionId: sessionRecord.id,
          sessionTitle: title.trim(),
          createdBy: mentorId,
        });
      }
    } catch (activityError) {
      console.error('📰 [MENTOR SESSIONS] Failed to create activity feed entry:', activityError);
    }

    console.log('📅 [MENTOR SESSIONS] ✅ Session created:', sessionRecord.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          session: sessionResponse,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('📅 [MENTOR SESSIONS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create session' 
      },
      { status: 500 }
    );
  }
}
