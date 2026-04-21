/**
 * Cohorts API Route
 * 
 * Handles GET (list) and POST (create) operations for cohorts.
 * Only superadmin users can access these endpoints.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkUserIpRateLimit } from '@/lib/api/rateLimiter.js';
import { requireCSRF } from '@/lib/api/csrf.js';
import { cohortCreateSchema, cohortUpdateSchema, validateForm } from '@/lib/validation/classesSubjectsSchemas.js';
import {
  createCohort,
  listCohorts,
  getCohortById,
  updateCohort,
  checkCohortExists,
  createSubjectOffering,
} from '@/lib/db/classesSubjects.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import { revalidateTag } from 'next/cache';
import crypto from 'crypto';

function generateETag(data) {
  const str = JSON.stringify(data);
  return crypto.createHash('md5').update(str).digest('hex');
}

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
    const filters = {
      org_id: orgId,
      level: searchParams.get('level'),
      status: searchParams.get('status'),
      session_id: searchParams.get('session_id'),
      term_id: searchParams.get('term_id'),
      section_id: searchParams.get('section_id'),
      program_node_id: searchParams.get('program_node_id'),
      search: searchParams.get('q') || searchParams.get('search'),
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '20', 10),
      sort: searchParams.get('sort') || 'created_at',
      order: searchParams.get('order') || 'DESC',
    };

    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 50) filters.limit = 20;

    let result;
    try {
      result = await listCohorts(filters);
    } catch (dbError) {
      console.error('Database error in listCohorts:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch cohorts from database',
          details: process.env.NODE_ENV !== 'production' ? dbError.message : undefined,
        },
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const etag = generateETag(result);

    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return NextResponse.json(
      {
        success: true,
        cohorts: result.cohorts,
        pagination: result.pagination,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'ETag': etag,
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Unexpected error in GET /api/cohorts:', error);
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

export async function POST(request) {
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

    const body = await request.json();
    
    // Log incoming request for debugging
    console.log('[BACKEND] POST /api/cohorts: Received request', {
      hasSubjectIds: Array.isArray(body.subject_ids),
      subjectCount: Array.isArray(body.subject_ids) ? body.subject_ids.length : 0,
      subjectIds: Array.isArray(body.subject_ids) ? body.subject_ids.slice(0, 5) : 'not an array',
    });
    
    const validation = validateForm(cohortCreateSchema, body);
    if (!validation.success) {
      console.log('[BACKEND] POST /api/cohorts: Validation failed', validation.errors);
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const orgId = getOrgIdFromRequest(request, session);
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization ID is required. Provide ?orgId=... for superadmin.' },
        { status: 400 }
      );
    }

    // Check if cohort already exists
    const exists = await checkCohortExists(
      orgId,
      validation.data.program_node_id,
      validation.data.section_id,
      validation.data.session_id,
      validation.data.term_id || null
    );
    if (exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cohort with this combination already exists',
          errors: { cohort: 'A cohort with these parameters already exists' },
        },
        { status: 409 }
      );
    }

    // Extract subject_ids before creating cohort (they're not part of cohort table)
    const subjectIds = validation.data.subject_ids || [];
    
    // Remove subject_ids from cohortData since it's not a column in cohorts table
    const { subject_ids: _, ...cohortDataWithoutSubjects } = validation.data;
    const cohortData = {
      ...cohortDataWithoutSubjects,
      org_id: orgId,
      created_by: session.user.id,
      created_by_role: session.user.role,
    };

    let cohort;
    try {
      cohort = await createCohort(cohortData);
    } catch (dbError) {
      if (dbError.message.includes('already exists') || dbError.message.includes('combination')) {
        return NextResponse.json(
          { success: false, error: dbError.message },
          { status: 409 }
        );
      }
      if (dbError.message.includes('level')) {
        return NextResponse.json(
          { success: false, error: dbError.message },
          { status: 400 }
        );
      }
      throw dbError;
    }

    // Create subject offerings if subject_ids are provided
    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      console.log('[BACKEND] POST /api/cohorts: Creating subject offerings', {
        cohortId: cohort.id,
        subjectCount: subjectIds.length,
        subjectIds: subjectIds.slice(0, 5), // Log first 5 for debugging
      });

      // Create subject offerings
      const offeringPromises = subjectIds.map(async (subjectId) => {
        try {
          const offering = await createSubjectOffering({
            org_id: orgId,
            cohort_id: cohort.id,
            subject_id: subjectId,
            elective_group_id: null,
            is_compulsory: true,
            status: 'published',
          });
          return offering;
        } catch (offeringError) {
          console.error(`[BACKEND] Failed to create offering for subject ${subjectId}:`, offeringError);
          // Continue with other subjects even if one fails
          return null;
        }
      });

      const offerings = await Promise.all(offeringPromises);
      const successfulOfferings = offerings.filter(o => o !== null);
      
      console.log('[BACKEND] POST /api/cohorts: Subject offerings created', {
        requested: subjectIds.length,
        successful: successfulOfferings.length,
        failed: subjectIds.length - successfulOfferings.length,
      });
    } else {
      console.log('[BACKEND] POST /api/cohorts: No subject_ids provided, skipping subject offerings creation');
    }

    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'create',
        target_type: 'cohort',
        target_id: cohort.id,
        metadata: { code: cohort.code, level: cohort.level, subjectCount: subjectIds.length },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('cohorts');

    return NextResponse.json(
      { success: true, cohort },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating cohort:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create cohort',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function PATCH(request) {
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

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Cohort ID is required' },
        { status: 400 }
      );
    }

    const validation = validateForm(cohortUpdateSchema, updateData);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors: validation.errors },
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
        { success: false, error: 'Unauthorized to update this cohort' },
        { status: 403 }
      );
    }

    // Update with role-aware locked fields handling
    const updatedCohort = await updateCohort(id, validation.data, session.user.role);

    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'update',
        target_type: 'cohort',
        target_id: id,
        metadata: { changes: updateData, role: session.user.role },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('cohorts');

    return NextResponse.json(
      { success: true, cohort: updatedCohort },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating cohort:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update cohort',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

