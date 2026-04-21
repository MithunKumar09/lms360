/**
 * Mentor Classroom API Route
 * 
 * GET /api/mentors/classroom - Get mentor's assigned students grouped by cohort
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/mentors/classroom
 * Get mentor's assigned students grouped by cohort
 */
export async function GET(request) {
  try {
    console.log('🎓 [MENTOR CLASSROOM] ===== FETCH CLASSROOM GROUPS STARTED =====');
    
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;
    const mentorOrgId = session.user.orgId;

    // Fetch mentor's assigned students grouped by cohort
    const classroomQuery = `
      SELECT 
        msa.cohort_id,
        COALESCE(c.code, 'Unassigned Cohort') as cohort_code,
        c.level as cohort_level,
        c.status as cohort_status,
        pn.id as program_node_id,
        pn.title as program_node_title,
        pn.code as program_node_code,
        s.id as session_id,
        s.code as session_code,
        s.start_date as session_start_date,
        s.end_date as session_end_date,
        t.id as term_id,
        t.label as term_label,
        t.number as term_number,
        t.term_type,
        sec.id as section_id,
        sec.label as section_label,
        json_agg(
          jsonb_build_object(
            'student_id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'email', u.email,
            'avatar_url', u.avatar_url,
            'roll_no', sl.roll_no
          )
          ORDER BY u.first_name, u.last_name
        ) FILTER (WHERE u.id IS NOT NULL) as students
      FROM mentor_student_assignments msa
      INNER JOIN users u ON msa.student_id = u.id
      LEFT JOIN student_links sl ON u.id = sl.user_id AND (sl.cohort_id = msa.cohort_id OR (sl.cohort_id IS NULL AND msa.cohort_id IS NULL))
      LEFT JOIN cohorts c ON msa.cohort_id = c.id
      LEFT JOIN program_nodes pn ON c.program_node_id = pn.id
      LEFT JOIN academic_sessions s ON c.session_id = s.id
      LEFT JOIN terms t ON c.term_id = t.id
      LEFT JOIN sections sec ON c.section_id = sec.id
      WHERE msa.mentor_id = $1
        AND (
          msa.cohort_id IS NULL
          OR c.org_id = $2
          OR c.org_id IS NULL
        )
      GROUP BY 
        msa.cohort_id,
        c.code,
        c.level,
        c.status,
        pn.id,
        pn.title,
        pn.code,
        s.id,
        s.code,
        s.start_date,
        s.end_date,
        t.id,
        t.label,
        t.number,
        t.term_type,
        sec.id,
        sec.label
      ORDER BY 
        CASE WHEN s.start_date IS NULL THEN 1 ELSE 0 END,
        s.start_date DESC NULLS LAST, 
        c.level ASC NULLS LAST, 
        c.code ASC NULLS LAST,
        msa.cohort_id ASC NULLS LAST
    `;

    const result = await query(classroomQuery, [mentorId, mentorOrgId]);

    console.log('🎓 [MENTOR CLASSROOM] Query result:', {
      mentorId,
      mentorOrgId,
      rowCount: result.rows.length,
      sampleRow: result.rows[0] || null
    });

    const groups = result.rows.map(row => ({
      cohort_id: row.cohort_id,
      cohort: {
        code: row.cohort_code,
        level: row.cohort_level,
        status: row.cohort_status,
      },
      program: row.program_node_id ? {
        id: row.program_node_id,
        title: row.program_node_title,
        code: row.program_node_code,
      } : null,
      session: row.session_id ? {
        id: row.session_id,
        code: row.session_code,
        start_date: row.session_start_date,
        end_date: row.session_end_date,
      } : null,
      term: row.term_id ? {
        id: row.term_id,
        label: row.term_label,
        number: row.term_number,
        term_type: row.term_type,
      } : null,
      section: row.section_id ? {
        id: row.section_id,
        label: row.section_label,
      } : null,
      students: row.students || [],
      student_count: row.students ? row.students.length : 0,
    }));

    console.log('🎓 [MENTOR CLASSROOM] ✅ Classroom groups fetched:', groups.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          groups
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('🎓 [MENTOR CLASSROOM] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch classroom groups' 
      },
      { status: 500 }
    );
  }
}

