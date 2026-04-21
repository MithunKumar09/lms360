/**
 * Bulk Create Subject Offerings API Route
 * 
 * Handles POST operation for bulk creating subject offerings.
 * Only superadmin users can access this endpoint.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkUserIpRateLimit } from '@/lib/api/rateLimiter.js';
import { requireCSRF } from '@/lib/api/csrf.js';
import { subjectOfferingCreateSchema, validateForm } from '@/lib/validation/classesSubjectsSchemas.js';
import { bulkCreateSubjectOfferings } from '@/lib/db/classesSubjects.js';
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
    const { cohort_id, offerings } = body;

    if (!cohort_id) {
      return NextResponse.json(
        { success: false, error: 'Cohort ID is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(offerings) || offerings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Offerings array is required and must not be empty' },
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

    // Validate all offerings
    const validatedOfferings = [];
    const errors = [];

    for (let i = 0; i < offerings.length; i++) {
      const offering = offerings[i];
      const validation = validateForm(subjectOfferingCreateSchema, {
        ...offering,
        org_id: orgId,
        cohort_id,
      });

      if (!validation.success) {
        errors.push({
          index: i,
          errors: validation.errors,
        });
      } else {
        validatedOfferings.push(validation.data);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed for some offerings',
          errors,
        },
        { status: 400 }
      );
    }

    // Bulk create
    let created;
    try {
      created = await bulkCreateSubjectOfferings(cohort_id, validatedOfferings);
    } catch (dbError) {
      if (dbError.message.includes('already exists')) {
        return NextResponse.json(
          { success: false, error: dbError.message },
          { status: 409 }
        );
      }
      throw dbError;
    }

    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'bulk_create',
        target_type: 'subject_offering',
        target_id: cohort_id,
        metadata: { count: created.length, cohort_id },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('offerings');

    return NextResponse.json(
      {
        success: true,
        offerings: created,
        count: created.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error bulk creating subject offerings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to bulk create subject offerings',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

