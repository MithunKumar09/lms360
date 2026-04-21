/**
 * Subject Catalog API Route
 * 
 * Handles GET (list), POST (create), and PATCH (update) operations for subject catalog.
 * Only superadmin users can access these endpoints.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkUserIpRateLimit } from '@/lib/api/rateLimiter.js';
import { requireCSRF } from '@/lib/api/csrf.js';
import { subjectCatalogCreateSchema, subjectCatalogUpdateSchema, validateForm } from '@/lib/validation/classesSubjectsSchemas.js';
import {
  createSubjectCatalog,
  listSubjectCatalog,
  getSubjectCatalogById,
  updateSubjectCatalog,
  checkSubjectCodeExists,
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
      category: searchParams.get('category'),
      status: searchParams.get('status'),
      department_node_id: searchParams.get('department_node_id'),
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
      result = await listSubjectCatalog(filters);
    } catch (dbError) {
      console.error('Database error in listSubjectCatalog:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch subjects from database',
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
        subjects: result.subjects,
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
    console.error('Unexpected error in GET /api/subject-catalog:', error);
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
    const validation = validateForm(subjectCatalogCreateSchema, body);
    if (!validation.success) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[DEV] /api/subject-catalog POST validation errors:', validation.errors);
      }
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

    // Check code uniqueness
    const codeExists = await checkSubjectCodeExists(orgId, validation.data.code);
    if (codeExists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subject with this code already exists for this organization',
          errors: { code: 'This subject code is already taken' },
        },
        { status: 409 }
      );
    }

    const subjectData = { ...validation.data, org_id: orgId };
    let subject;
    try {
      subject = await createSubjectCatalog(subjectData);
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
        action: 'create',
        target_type: 'subject',
        target_id: subject.id,
        metadata: { code: subject.code, title: subject.title },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('subjects');

    return NextResponse.json(
      { success: true, subject },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create subject',
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
        { success: false, error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    const validation = validateForm(subjectCatalogUpdateSchema, updateData);
    if (!validation.success) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.log('[DEV] /api/subject-catalog PATCH validation errors:', validation.errors);
      }
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const currentSubject = await getSubjectCatalogById(id);
    if (!currentSubject) {
      return NextResponse.json(
        { success: false, error: 'Subject not found' },
        { status: 404 }
      );
    }

    const orgId = getOrgIdFromRequest(request, session);
    if (!orgId || orgId !== currentSubject.org_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to update this subject' },
        { status: 403 }
      );
    }

    // Check code uniqueness if code is being updated
    if (updateData.code && updateData.code !== currentSubject.code) {
      const codeExists = await checkSubjectCodeExists(orgId, updateData.code, id);
      if (codeExists) {
        return NextResponse.json(
          {
            success: false,
            error: 'Subject with this code already exists',
            errors: { code: 'This subject code is already taken' },
          },
          { status: 409 }
        );
      }
    }

    const updatedSubject = await updateSubjectCatalog(id, validation.data);

    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'update',
        target_type: 'subject',
        target_id: id,
        metadata: { changes: updateData },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('subjects');

    return NextResponse.json(
      { success: true, subject: updatedSubject },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating subject:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update subject',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

