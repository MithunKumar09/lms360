/**
 * Cohort Exists Check API Route
 * 
 * Checks if a cohort exists with the given parameters (for deduplication).
 * Only superadmin users can access this endpoint.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { checkCohortExists } from '@/lib/db/classesSubjects.js';

function getOrgIdFromRequest(request, session) {
  const { searchParams } = new URL(request.url);
  const orgIdFromQuery = searchParams.get('orgId');
  if (session.user.role === 'admin') {
    return session.user.orgId;
  }
  return orgIdFromQuery;
}

export async function GET(request) {
  try {
    let session;
    try {
      session = await requireSuperadmin(request);
    } catch (authError) {
      return NextResponse.json(
        { success: false, error: authError.message || 'Unauthorized. Superadmin access required.' },
        { status: authError.status || 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const orgId = getOrgIdFromRequest(request, session);
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required. Provide ?orgId=... for superadmin.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const programNodeId = searchParams.get('program_node_id');
    const sectionId = searchParams.get('section_id');
    const sessionId = searchParams.get('session_id');
    const termId = searchParams.get('term_id') || null;

    if (!programNodeId || !sectionId || !sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: program_node_id, section_id, session_id are required',
        },
        { status: 400 }
      );
    }

    const exists = await checkCohortExists(orgId, programNodeId, sectionId, sessionId, termId);

    return NextResponse.json(
      {
        success: true,
        exists,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/cohorts/exists:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

