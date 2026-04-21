/**
 * Student Mentors API Route
 * 
 * GET /api/students/mentors
 * Get student's assigned mentors with activity feed
 * (Student only - returns their own mentors)
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

export async function GET(request) {
  try {
    console.log('👥 [STUDENT MENTORS] ===== GET STUDENT MENTORS STARTED =====');
    
    // Require student role
    const session = await requireRole(request, ['student']);
    const studentId = session.user.id;

    // Get student's mentors with cohort information
    const mentorsQuery = `
      SELECT 
        m.id as mentor_id,
        m.email as mentor_email,
        m.first_name as mentor_first_name,
        m.last_name as mentor_last_name,
        m.avatar_url as mentor_avatar_url,
        msa.cohort_id,
        msa.created_at as assigned_at,
        c.code as cohort_code,
        c.level as cohort_level,
        pn.title as program_node_title,
        pn.code as program_node_code,
        sec.label as section_name,
        t.label as term_name,
        t.term_type as term_type
      FROM mentor_student_assignments msa
      INNER JOIN users m ON msa.mentor_id = m.id
      LEFT JOIN cohorts c ON msa.cohort_id = c.id
      LEFT JOIN program_nodes pn ON c.program_node_id = pn.id
      LEFT JOIN sections sec ON c.section_id = sec.id
      LEFT JOIN terms t ON c.term_id = t.id
      WHERE msa.student_id = $1
      ORDER BY msa.created_at DESC
    `;

    const mentorsResult = await query(mentorsQuery, [studentId]);
    
    // Group mentors and get peers for each mentor-cohort combination
    const mentorsMap = new Map();
    
    for (const row of mentorsResult.rows) {
      const key = `${row.mentor_id}_${row.cohort_id || 'no_cohort'}`;
      
      if (!mentorsMap.has(key)) {
        mentorsMap.set(key, {
          mentor: {
            id: row.mentor_id,
            email: row.mentor_email,
            first_name: row.mentor_first_name,
            last_name: row.mentor_last_name,
            avatar_url: row.mentor_avatar_url,
          },
          cohort: row.cohort_id ? {
            id: row.cohort_id,
            code: row.cohort_code,
            level: row.cohort_level,
            program_node: row.program_node_title ? {
              title: row.program_node_title,
              code: row.program_node_code,
            } : null,
            section: row.section_name ? {
              name: row.section_name,
            } : null,
            term: row.term_name ? {
              name: row.term_name,
              type: row.term_type,
            } : null,
          } : null,
          assigned_at: row.assigned_at,
          peers: [],
        });
      }
    }

    // Get peers (other students assigned to same mentor-cohort)
    for (const [key, mentorData] of mentorsMap.entries()) {
      if (mentorData.cohort?.id) {
        const peersQuery = `
          SELECT DISTINCT
            s.id,
            s.email,
            s.first_name,
            s.last_name,
            s.avatar_url
          FROM mentor_student_assignments msa
          INNER JOIN users s ON msa.student_id = s.id
          WHERE msa.mentor_id = $1
            AND msa.cohort_id = $2
            AND msa.student_id != $3
          ORDER BY s.first_name, s.last_name
          LIMIT 50
        `;
        
        const peersResult = await query(peersQuery, [
          mentorData.mentor.id,
          mentorData.cohort.id,
          studentId,
        ]);
        
        mentorData.peers = peersResult.rows.map(peer => ({
          id: peer.id,
          email: peer.email,
          first_name: peer.first_name,
          last_name: peer.last_name,
          avatar_url: peer.avatar_url,
        }));
      }
    }

    const mentors = Array.from(mentorsMap.values());

    // TODO: Fetch mentor activity (events, workshops, job posts, classroom sessions)
    // For now, return empty arrays - these will be implemented in later phases
    const activityFeed = {
      events: [],
      workshops: [],
      jobPosts: [],
      classroomSessions: [],
    };

    console.log('👥 [STUDENT MENTORS] ✅ Mentors fetched:', mentors.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          mentors,
          activityFeed,
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('👥 [STUDENT MENTORS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch mentors' 
      },
      { status: 500 }
    );
  }
}

