/**
 * Subject Offerings API Route
 * 
 * Handles GET (list), POST (create), and PATCH (update) operations for subject offerings.
 * Only superadmin users can access these endpoints.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkUserIpRateLimit } from '@/lib/api/rateLimiter.js';
import { requireCSRF } from '@/lib/api/csrf.js';
import { subjectOfferingCreateSchema, subjectOfferingUpdateSchema, validateForm } from '@/lib/validation/classesSubjectsSchemas.js';
import {
  createSubjectOffering,
  listSubjectOfferings,
  getSubjectOfferingById,
  updateSubjectOffering,
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
      cohort_id: searchParams.get('cohort_id'),
      status: searchParams.get('status'),
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '50', 10),
    };

    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 50) filters.limit = 50;

    const offerings = await listSubjectOfferings(filters);
    
    // Log what was retrieved
    console.log('[BACKEND] GET /api/subject-offerings: Retrieved offerings:', {
      filters,
      count: offerings.length,
      sample: offerings.slice(0, 3).map(off => ({
        id: off.id,
        cohort_id: off.cohort_id,
        subject_id: off.subject_id,
        elective_group_id: off.elective_group_id,
        category: off.category,
        subject_code: off.subject_code,
        subject_title: off.subject_title,
        subject_category: off.subject_category,
        elective_group_code: off.elective_group_code,
        elective_group_title: off.elective_group_title,
        nullFields: Object.keys(off).filter(key => off[key] === null || off[key] === undefined),
      })),
    });

    const etag = generateETag(offerings);

    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return NextResponse.json(
      { success: true, offerings },
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
    console.error('Error in GET /api/subject-offerings:', error);
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
    const validation = validateForm(subjectOfferingCreateSchema, body);
    if (!validation.success) {
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

    const offeringData = { ...validation.data, org_id: orgId };
    let offering;
    try {
      offering = await createSubjectOffering(offeringData);
    } catch (dbError) {
      if (dbError.message.includes('already exists')) {
        return NextResponse.json(
          { success: false, error: dbError.message },
          { status: 409 }
        );
      }
      if (dbError.message.includes('XOR') || dbError.message.includes('exactly one')) {
        return NextResponse.json(
          { success: false, error: dbError.message },
          { status: 400 }
        );
      }
      throw dbError;
    }

    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'create',
        target_type: 'subject_offering',
        target_id: offering.id,
        metadata: { cohort_id: offering.cohort_id },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('offerings');

    return NextResponse.json(
      { success: true, offering },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating subject offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create subject offering',
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
        { success: false, error: 'Subject offering ID is required' },
        { status: 400 }
      );
    }

    const validation = validateForm(subjectOfferingUpdateSchema, updateData);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const currentOffering = await getSubjectOfferingById(id);
    if (!currentOffering) {
      return NextResponse.json(
        { success: false, error: 'Subject offering not found' },
        { status: 404 }
      );
    }

    const orgId = getOrgIdFromRequest(request, session);
    if (!orgId || orgId !== currentOffering.org_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to update this subject offering' },
        { status: 403 }
      );
    }

    const updatedOffering = await updateSubjectOffering(id, validation.data);

    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'update',
        target_type: 'subject_offering',
        target_id: id,
        metadata: { changes: updateData },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('offerings');

    return NextResponse.json(
      { success: true, offering: updatedOffering },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating subject offering:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update subject offering',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

