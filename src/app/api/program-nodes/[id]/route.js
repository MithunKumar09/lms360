/**
 * Program Node by ID API Route
 * 
 * Handles GET operation for a single program node with hierarchy.
 * Only superadmin users can access this endpoint.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getProgramNodeById, getProgramNodeHierarchy } from '@/lib/db/classesSubjects.js';

function getOrgIdFromRequest(request, session) {
  const { searchParams } = new URL(request.url);
  const orgIdFromQuery = searchParams.get('orgId');
  if (session.user.role === 'admin') {
    return session.user.orgId;
  }
  return orgIdFromQuery;
}

export async function GET(request, { params }) {
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

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Program node ID is required' },
        { status: 400 }
      );
    }

    const node = await getProgramNodeById(id);
    if (!node) {
      return NextResponse.json(
        { success: false, error: 'Program node not found' },
        { status: 404 }
      );
    }

    const orgId = getOrgIdFromRequest(request, session);
    if (!orgId || orgId !== node.org_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to access this program node' },
        { status: 403 }
      );
    }

    // Get hierarchy if requested
    const { searchParams } = new URL(request.url);
    if (searchParams.get('hierarchy') === 'true') {
      const hierarchy = await getProgramNodeHierarchy(orgId, node.level);
      return NextResponse.json(
        {
          success: true,
          node: {
            ...node,
            hierarchy,
          },
        },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        }
      );
    }

    return NextResponse.json(
      { success: true, node },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/program-nodes/[id]:', error);
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

