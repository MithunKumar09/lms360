/**
 * Mentor Session Detail API Route
 * 
 * GET /api/mentors/sessions/:id - Get session details
 * PUT /api/mentors/sessions/:id - Update session
 * DELETE /api/mentors/sessions/:id - Delete session
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/mentors/sessions/:id
 * Get session details
 */
export async function GET(request, { params }) {
  try {
    console.log('📅 [MENTOR SESSION] ===== GET SESSION STARTED =====');
    
    const { id } = params;
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Get session
    const sessionQuery = `
      SELECT 
        ms.*,
        c.code as cohort_code
      FROM mentor_sessions ms
      LEFT JOIN cohorts c ON ms.cohort_id = c.id
      WHERE ms.id = $1 AND ms.mentor_id = $2
    `;
    const sessionResult = await query(sessionQuery, [id, mentorId]);

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Get students
    const studentsQuery = `
      SELECT 
        mss.student_id,
        mss.attendance_status,
        mss.notes,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url
      FROM mentor_session_students mss
      INNER JOIN users u ON mss.student_id = u.id
      WHERE mss.session_id = $1
    `;
    const studentsResult = await query(studentsQuery, [id]);

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
        notes: row.notes,
      })),
    };

    console.log('📅 [MENTOR SESSION] ✅ Session fetched:', id);

    return NextResponse.json(
      {
        success: true,
        data: {
          session: sessionResponse,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📅 [MENTOR SESSION] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch session' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mentors/sessions/:id
 * Update session
 */
export async function PUT(request, { params }) {
  try {
    console.log('📅 [MENTOR SESSION] ===== UPDATE SESSION STARTED =====');
    
    const { id } = params;
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const body = await request.json();
    const {
      title,
      description,
      scheduled_at,
      duration_minutes,
      status,
      meeting_link,
      location,
      student_ids,
    } = body;

    // Verify session exists and belongs to mentor
    const checkQuery = `
      SELECT id FROM mentor_sessions WHERE id = $1 AND mentor_id = $2
    `;
    const checkResult = await query(checkQuery, [id, mentorId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Build update fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'title cannot be empty' },
          { status: 400 }
        );
      }
      updateFields.push(`title = $${paramIndex}`);
      updateValues.push(title.trim());
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description?.trim() || null);
      paramIndex++;
    }

    if (scheduled_at !== undefined) {
      const scheduledDate = new Date(scheduled_at);
      if (isNaN(scheduledDate.getTime())) {
        return NextResponse.json(
          { success: false, error: 'Invalid scheduled_at format' },
          { status: 400 }
        );
      }
      updateFields.push(`scheduled_at = $${paramIndex}`);
      updateValues.push(scheduledDate.toISOString());
      paramIndex++;
    }

    if (duration_minutes !== undefined) {
      if (duration_minutes <= 0) {
        return NextResponse.json(
          { success: false, error: 'duration_minutes must be greater than 0' },
          { status: 400 }
        );
      }
      updateFields.push(`duration_minutes = $${paramIndex}`);
      updateValues.push(duration_minutes);
      paramIndex++;
    }

    if (status !== undefined) {
      const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { success: false, error: `status must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        );
      }
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }

    if (meeting_link !== undefined) {
      updateFields.push(`meeting_link = $${paramIndex}`);
      updateValues.push(meeting_link || null);
      paramIndex++;
    }

    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex}`);
      updateValues.push(location || null);
      paramIndex++;
    }

    if (updateFields.length === 0 && student_ids === undefined) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update session
    if (updateFields.length > 0) {
      updateValues.push(id);
      const updateQuery = `
        UPDATE mentor_sessions
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND mentor_id = $${paramIndex + 1}
        RETURNING *
      `;
      updateValues.push(mentorId);
      await query(updateQuery, updateValues);
    }

    // Update students if provided
    if (student_ids !== undefined) {
      // Delete existing students
      await query('DELETE FROM mentor_session_students WHERE session_id = $1', [id]);

      // Insert new students
      if (student_ids.length > 0) {
        // Validate student_ids
        const relationshipQuery = `
          SELECT student_id
          FROM mentor_student_assignments
          WHERE mentor_id = $1 AND student_id = ANY($2)
        `;
        const relationshipResult = await query(relationshipQuery, [mentorId, student_ids]);
        const validStudentIds = relationshipResult.rows.map(row => row.student_id);

        if (validStudentIds.length > 0) {
          const insertStudentsQuery = `
            INSERT INTO mentor_session_students (session_id, student_id)
            SELECT $1, unnest($2::uuid[])
          `;
          await query(insertStudentsQuery, [id, validStudentIds]);
        }
      }
    }

    // Fetch updated session
    const getSessionQuery = `
      SELECT 
        ms.*,
        c.code as cohort_code
      FROM mentor_sessions ms
      LEFT JOIN cohorts c ON ms.cohort_id = c.id
      WHERE ms.id = $1
    `;
    const sessionResult = await query(getSessionQuery, [id]);

    const studentsQuery = `
      SELECT 
        mss.student_id,
        mss.attendance_status,
        mss.notes,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url
      FROM mentor_session_students mss
      INNER JOIN users u ON mss.student_id = u.id
      WHERE mss.session_id = $1
    `;
    const studentsResult = await query(studentsQuery, [id]);

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
        notes: row.notes,
      })),
    };

    console.log('📅 [MENTOR SESSION] ✅ Session updated:', id);

    return NextResponse.json(
      {
        success: true,
        data: {
          session: sessionResponse,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📅 [MENTOR SESSION] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update session' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mentors/sessions/:id
 * Delete session
 */
export async function DELETE(request, { params }) {
  try {
    console.log('📅 [MENTOR SESSION] ===== DELETE SESSION STARTED =====');
    
    const { id } = params;
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Verify session exists and belongs to mentor
    const checkQuery = `
      SELECT id FROM mentor_sessions WHERE id = $1 AND mentor_id = $2
    `;
    const checkResult = await query(checkQuery, [id, mentorId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    // Delete session (CASCADE will handle session_students)
    await query('DELETE FROM mentor_sessions WHERE id = $1', [id]);

    console.log('📅 [MENTOR SESSION] ✅ Session deleted:', id);

    return NextResponse.json(
      {
        success: true,
        message: 'Session deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📅 [MENTOR SESSION] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete session' 
      },
      { status: 500 }
    );
  }
}
