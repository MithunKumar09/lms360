/**
 * Mentor Notes API Route
 * 
 * GET /api/mentors/notes - List notes
 * POST /api/mentors/notes - Create note
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/mentors/notes
 * List notes for mentor
 */
export async function GET(request) {
  try {
    console.log('📝 [MENTOR NOTES] ===== LIST NOTES STARTED =====');
    
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;
    const studentId = searchParams.get('student_id') || null;
    const cohortId = searchParams.get('cohort_id') || null;
    const noteType = searchParams.get('note_type') || null;

    // Build WHERE conditions
    const whereConditions = ['mn.mentor_id = $1'];
    const queryParams = [mentorId];
    let paramIndex = 2;

    if (studentId) {
      whereConditions.push(`mn.student_id = $${paramIndex}`);
      queryParams.push(studentId);
      paramIndex++;
    }

    if (cohortId) {
      whereConditions.push(`mn.cohort_id = $${paramIndex}`);
      queryParams.push(cohortId);
      paramIndex++;
    }

    if (noteType) {
      whereConditions.push(`mn.note_type = $${paramIndex}`);
      queryParams.push(noteType);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM mentor_notes mn
      ${whereClause}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get notes
    const notesQuery = `
      SELECT 
        mn.id,
        mn.mentor_id,
        mn.student_id,
        mn.cohort_id,
        mn.note_type,
        mn.title,
        mn.content,
        mn.is_private,
        mn.created_at,
        mn.updated_at,
        u.id as student_user_id,
        u.first_name as student_first_name,
        u.last_name as student_last_name,
        u.email as student_email,
        c.code as cohort_code
      FROM mentor_notes mn
      INNER JOIN users u ON mn.student_id = u.id
      LEFT JOIN cohorts c ON mn.cohort_id = c.id
      ${whereClause}
      ORDER BY mn.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    const notesResult = await query(notesQuery, queryParams);

    const notes = notesResult.rows.map(row => ({
      id: row.id,
      mentorId: row.mentor_id,
      studentId: row.student_id,
      cohortId: row.cohort_id,
      noteType: row.note_type,
      title: row.title,
      content: row.content,
      isPrivate: row.is_private,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      student: {
        id: row.student_user_id,
        firstName: row.student_first_name,
        lastName: row.student_last_name,
        email: row.student_email,
      },
      cohort: row.cohort_code ? { code: row.cohort_code } : null,
    }));

    console.log('📝 [MENTOR NOTES] ✅ Notes fetched:', notes.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          notes,
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
    console.error('📝 [MENTOR NOTES] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch notes' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mentors/notes
 * Create note
 */
export async function POST(request) {
  try {
    console.log('📝 [MENTOR NOTES] ===== CREATE NOTE STARTED =====');
    
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const body = await request.json();
    const {
      student_id,
      cohort_id,
      note_type = 'general',
      title,
      content,
      is_private = true,
    } = body;

    // Validation
    if (!student_id) {
      return NextResponse.json(
        { success: false, error: 'student_id is required' },
        { status: 400 }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'content is required' },
        { status: 400 }
      );
    }

    if (content.trim().length > 10000) {
      return NextResponse.json(
        { success: false, error: 'content must be at most 10000 characters' },
        { status: 400 }
      );
    }

    const validNoteTypes = ['general', 'progress', 'meeting', 'feedback'];
    if (!validNoteTypes.includes(note_type)) {
      return NextResponse.json(
        { success: false, error: `note_type must be one of: ${validNoteTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate mentor-student relationship
    const relationshipQuery = `
      SELECT id FROM mentor_student_assignments
      WHERE mentor_id = $1 AND student_id = $2
    `;
    const relationshipResult = await query(relationshipQuery, [mentorId, student_id]);
    if (relationshipResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid student_id' },
        { status: 400 }
      );
    }

    // Insert note
    const insertQuery = `
      INSERT INTO mentor_notes (
        mentor_id,
        student_id,
        cohort_id,
        note_type,
        title,
        content,
        is_private,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const insertResult = await query(insertQuery, [
      mentorId,
      student_id,
      cohort_id || null,
      note_type,
      title?.trim() || null,
      content.trim(),
      is_private,
      mentorId,
    ]);

    const note = insertResult.rows[0];

    // Get student info
    const studentQuery = `
      SELECT id, first_name, last_name, email
      FROM users
      WHERE id = $1
    `;
    const studentResult = await query(studentQuery, [student_id]);
    const student = studentResult.rows[0];

    const noteResponse = {
      id: note.id,
      mentorId: note.mentor_id,
      studentId: note.student_id,
      cohortId: note.cohort_id,
      noteType: note.note_type,
      title: note.title,
      content: note.content,
      isPrivate: note.is_private,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        email: student.email,
      },
    };

    console.log('📝 [MENTOR NOTES] ✅ Note created:', note.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          note: noteResponse,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('📝 [MENTOR NOTES] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create note' 
      },
      { status: 500 }
    );
  }
}
