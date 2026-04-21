/**
 * Mentor Note Detail API Route
 * 
 * GET /api/mentors/notes/:id - Get note details
 * PUT /api/mentors/notes/:id - Update note
 * DELETE /api/mentors/notes/:id - Delete note
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/mentors/notes/:id
 * Get note details
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const noteQuery = `
      SELECT 
        mn.*,
        u.id as student_user_id,
        u.first_name as student_first_name,
        u.last_name as student_last_name,
        u.email as student_email,
        c.code as cohort_code
      FROM mentor_notes mn
      INNER JOIN users u ON mn.student_id = u.id
      LEFT JOIN cohorts c ON mn.cohort_id = c.id
      WHERE mn.id = $1 AND mn.mentor_id = $2
    `;
    const noteResult = await query(noteQuery, [id, mentorId]);

    if (noteResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Note not found or access denied' },
        { status: 404 }
      );
    }

    const note = noteResult.rows[0];
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
        id: note.student_user_id,
        firstName: note.student_first_name,
        lastName: note.student_last_name,
        email: note.student_email,
      },
      cohort: note.cohort_code ? { code: note.cohort_code } : null,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          note: noteResponse,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📝 [MENTOR NOTE] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch note' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/mentors/notes/:id
 * Update note
 */
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    const body = await request.json();
    const {
      title,
      content,
      note_type,
    } = body;

    // Verify note exists
    const checkQuery = `
      SELECT id FROM mentor_notes WHERE id = $1 AND mentor_id = $2
    `;
    const checkResult = await query(checkQuery, [id, mentorId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Note not found or access denied' },
        { status: 404 }
      );
    }

    // Build update fields
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      updateValues.push(title?.trim() || null);
      paramIndex++;
    }

    if (content !== undefined) {
      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'content cannot be empty' },
          { status: 400 }
        );
      }
      if (content.trim().length > 10000) {
        return NextResponse.json(
          { success: false, error: 'content must be at most 10000 characters' },
          { status: 400 }
        );
      }
      updateFields.push(`content = $${paramIndex}`);
      updateValues.push(content.trim());
      paramIndex++;
    }

    if (note_type !== undefined) {
      const validNoteTypes = ['general', 'progress', 'meeting', 'feedback'];
      if (!validNoteTypes.includes(note_type)) {
        return NextResponse.json(
          { success: false, error: `note_type must be one of: ${validNoteTypes.join(', ')}` },
          { status: 400 }
        );
      }
      updateFields.push(`note_type = $${paramIndex}`);
      updateValues.push(note_type);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update note
    updateValues.push(id);
    const updateQuery = `
      UPDATE mentor_notes
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND mentor_id = $${paramIndex + 1}
      RETURNING *
    `;
    updateValues.push(mentorId);
    const updateResult = await query(updateQuery, updateValues);

    const note = updateResult.rows[0];

    // Get student info
    const studentQuery = `
      SELECT id, first_name, last_name, email
      FROM users
      WHERE id = $1
    `;
    const studentResult = await query(studentQuery, [note.student_id]);
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

    return NextResponse.json(
      {
        success: true,
        data: {
          note: noteResponse,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📝 [MENTOR NOTE] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update note' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mentors/notes/:id
 * Delete note
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Verify note exists
    const checkQuery = `
      SELECT id FROM mentor_notes WHERE id = $1 AND mentor_id = $2
    `;
    const checkResult = await query(checkQuery, [id, mentorId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Note not found or access denied' },
        { status: 404 }
      );
    }

    // Delete note
    await query('DELETE FROM mentor_notes WHERE id = $1', [id]);

    return NextResponse.json(
      {
        success: true,
        message: 'Note deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📝 [MENTOR NOTE] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete note' 
      },
      { status: 500 }
    );
  }
}
