/**
 * Archive Cohort API Route
 * 
 * Archives a cohort (sets status to 'archived').
 * Only superadmin users can access this endpoint.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkUserIpRateLimit } from '@/lib/api/rateLimiter.js';
import { requireCSRF } from '@/lib/api/csrf.js';
import { getCohortById, archiveCohort } from '@/lib/db/classesSubjects.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import { revalidateTag } from 'next/cache';

function getOrgIdFromRequest(request, session) {
  const { searchParams } = new URL(request.url);
  const orgIdFromQuery = searchParams.get('orgId');
  if (session.user.role === 'admin') {
    return session.user.orgId;
  }
  return orgIdFromQuery;
}

export async function POST(request, { params }) {
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

    requireCSRF(request);

    const ipAddress = getClientIp(request);
    const rateLimit = checkUserIpRateLimit(session.user.id, ipAddress, {
      maxRequests: 10,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Please try again in ${rateLimit.retryAfter} seconds.`,
          rateLimited: true,
          retryAfter: rateLimit.retryAfter,
        },
        { status: 429, headers: { 'Retry-After': rateLimit.retryAfter.toString() } }
      );
    }

    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Cohort ID is required' },
        { status: 400 }
      );
    }

    const currentCohort = await getCohortById(id);
    if (!currentCohort) {
      return NextResponse.json(
        { success: false, error: 'Cohort not found' },
        { status: 404 }
      );
    }

    const orgId = getOrgIdFromRequest(request, session);
    if (!orgId || orgId !== currentCohort.org_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to archive this cohort' },
        { status: 403 }
      );
    }

    const archivedCohort = await archiveCohort(id);

    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'archive',
        target_type: 'cohort',
        target_id: id,
        metadata: { code: currentCohort.code },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('cohorts');

    return NextResponse.json(
      { success: true, cohort: archivedCohort },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error archiving cohort:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to archive cohort',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

