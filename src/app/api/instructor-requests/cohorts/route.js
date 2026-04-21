/**
 * Get Cohorts for Instructor Request
 * 
 * GET /api/instructor-requests/cohorts
 * Get cohorts (with program nodes) for the current user's organization
 * Allows authenticated users to see cohorts for instructor request form
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';

export async function GET(request) {
  try {
    console.log('📚 [COHORTS] ===== GET COHORTS FOR REQUEST STARTED =====');
    
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userOrgId = session.user.orgId;

    if (!userOrgId) {
      return NextResponse.json(
        { success: false, error: 'You must belong to an organization' },
        { status: 400 }
      );
    }

    // Get cohorts with program nodes for the user's organization
    const cohortsResult = await query(
      `SELECT 
        c.id,
        c.code,
        c.level,
        c.program_node_id,
        pn.title as program_node_name,
        pn.code as program_node_code,
        c.session_id,
        s.code as session_name,
        c.term_id,
        t.label as term_name,
        c.section_id,
        sec.label as section_name,
        c.status
      FROM cohorts c
      LEFT JOIN program_nodes pn ON c.program_node_id = pn.id
      LEFT JOIN academic_sessions s ON c.session_id = s.id
      LEFT JOIN terms t ON c.term_id = t.id
      LEFT JOIN sections sec ON c.section_id = sec.id
      WHERE c.org_id = $1 
        AND c.status = 'published'
      ORDER BY c.level, c.code`,
      [userOrgId]
    );

    const cohorts = cohortsResult.rows.map(row => ({
      id: row.id,
      value: row.id,
      label: `${row.code}${row.program_node_name ? ` - ${row.program_node_name}` : ''}${row.section_name ? ` (${row.section_name})` : ''}`,
      code: row.code,
      cohort_code: row.code, // Alias for compatibility
      level: row.level,
      program_node: row.program_node_id ? {
        id: row.program_node_id,
        name: row.program_node_name,
        code: row.program_node_code
      } : null,
      session: row.session_id ? {
        id: row.session_id,
        name: row.session_name
      } : null,
      term: row.term_id ? {
        id: row.term_id,
        name: row.term_name
      } : null,
      section: row.section_id ? {
        id: row.section_id,
        name: row.section_name
      } : null
    }));

    console.log('📚 [COHORTS] ✅ Cohorts fetched:', cohorts.length);

    return NextResponse.json(
      {
        success: true,
        data: cohorts
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📚 [COHORTS] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch cohorts' 
      },
      { status: 500 }
    );
  }
}

