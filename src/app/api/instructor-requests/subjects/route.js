/**
 * Get Subjects for Instructor Request
 * 
 * GET /api/instructor-requests/subjects
 * Get subjects filtered by cohort IDs for instructor request form
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';

export async function GET(request) {
  try {
    console.log('📖 [SUBJECTS] ===== GET SUBJECTS FOR REQUEST STARTED =====');
    
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const cohortIdsParam = searchParams.get('cohort_ids');
    
    if (!cohortIdsParam) {
      return NextResponse.json(
        { success: false, error: 'cohort_ids parameter is required' },
        { status: 400 }
      );
    }

    // Parse cohort IDs (comma-separated or array)
    const cohortIds = Array.isArray(cohortIdsParam)
      ? cohortIdsParam
      : cohortIdsParam.split(',').filter(Boolean);

    if (cohortIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one cohort ID is required' },
        { status: 400 }
      );
    }

    // Get subjects that are offered in the specified cohorts
    // Join with subject_offerings to filter by cohorts
    const subjectsResult = await query(
      `SELECT DISTINCT
        sc.id,
        sc.code,
        sc.title,
        sc.status
      FROM subject_catalog sc
      INNER JOIN subject_offerings so ON sc.id = so.subject_id
      WHERE so.cohort_id = ANY($1::uuid[])
        AND sc.org_id = $2
        AND sc.status = 'active'
        AND so.status = 'published'
      ORDER BY sc.title`,
      [cohortIds, userOrgId]
    );

    const subjects = subjectsResult.rows.map(row => ({
      id: row.id,
      value: row.id,
      label: `${row.code} - ${row.title}`,
      code: row.code,
      name: row.title, // Use title as name for compatibility
      title: row.title
    }));

    console.log('📖 [SUBJECTS] ✅ Subjects fetched:', subjects.length);

    return NextResponse.json(
      {
        success: true,
        data: subjects
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📖 [SUBJECTS] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch subjects' 
      },
      { status: 500 }
    );
  }
}

