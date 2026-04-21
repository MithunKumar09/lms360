/**
 * Academic Sessions API Route
 * 
 * Handles GET (list) and POST (create) operations for academic sessions.
 * Only superadmin users can access these endpoints.
 * 
 * GET /api/academic-sessions
 * - Query params: ?orgId=...&q=...&page=1&limit=20&is_current=true
 * - Returns: { success: true, sessions: [], pagination: {...} }
 * 
 * POST /api/academic-sessions
 * - Request body: AcademicSessionCreateSchema
 * - Returns: { success: true, session: {...} }
 * 
 * PATCH /api/academic-sessions
 * - Request body: { id, ...AcademicSessionUpdateSchema }
 * - Returns: { success: true, session: {...} }
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkUserIpRateLimit } from '@/lib/api/rateLimiter.js';
import { requireCSRF } from '@/lib/api/csrf.js';
import { academicSessionCreateSchema, academicSessionUpdateSchema, validateForm } from '@/lib/validation/classesSubjectsSchemas.js';
import {
  createAcademicSession,
  listAcademicSessions,
  getAcademicSessionById,
  updateAcademicSession,
  checkSessionCodeExists,
} from '@/lib/db/classesSubjects.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import { revalidateTag } from 'next/cache';
import crypto from 'crypto';

/**
 * Generate ETag from data
 */
function generateETag(data) {
  const str = JSON.stringify(data);
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Get orgId from request (superadmin must provide, admin uses session)
 */
function getOrgIdFromRequest(request, session) {
  const { searchParams } = new URL(request.url);
  const orgIdFromQuery = searchParams.get('orgId');
  
  // Admin uses their orgId from session
  if (session.user.role === 'admin') {
    return session.user.orgId;
  }
  
  // Superadmin must provide orgId
  return orgIdFromQuery;
}

/**
 * GET /api/academic-sessions
 * List academic sessions with filters, pagination, and search
 */
export async function GET(request) {
  try {
    // Authentication: Only superadmin
    let session;
    try {
      session = await requireSuperadmin(request);
    } catch (authError) {
      return NextResponse.json(
        {
          success: false,
          error: authError.message || 'Unauthorized. Superadmin access required.',
        },
        { 
          status: authError.status || 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get orgId
    const orgId = getOrgIdFromRequest(request, session);
    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization ID is required. Provide ?orgId=... for superadmin.',
        },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      org_id: orgId,
      search: searchParams.get('q') || searchParams.get('search'),
      is_current: searchParams.get('is_current') === 'true' ? true : searchParams.get('is_current') === 'false' ? false : undefined,
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '20', 10),
      sort: searchParams.get('sort') || 'created_at',
      order: searchParams.get('order') || 'DESC',
    };

    // Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 50) filters.limit = 20;

    // Fetch sessions
    let result;
    try {
      result = await listAcademicSessions(filters);
    } catch (dbError) {
      console.error('Database error in listAcademicSessions:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch academic sessions from database',
          details: process.env.NODE_ENV !== 'production' ? dbError.message : undefined,
        },
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate ETag
    const etag = generateETag(result);

    // Check If-None-Match header
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return NextResponse.json(
      {
        success: true,
        sessions: result.sessions,
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
    console.error('Unexpected error in GET /api/academic-sessions:', error);
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

/**
 * POST /api/academic-sessions
 * Create a new academic session
 */
export async function POST(request) {
  try {
    // Authentication
    let session;
    try {
      session = await requireSuperadmin(request);
    } catch (authError) {
      return NextResponse.json(
        {
          success: false,
          error: authError.message || 'Unauthorized. Superadmin access required.',
        },
        { status: authError.status || 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // CSRF protection
    requireCSRF(request);

    // Rate limiting
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

    // Parse and validate request body
    const body = await request.json();
    const validation = validateForm(academicSessionCreateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Get orgId
    const orgId = getOrgIdFromRequest(request, session);
    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Organization ID is required. Provide ?orgId=... for superadmin.',
        },
        { status: 400 }
      );
    }

    // Check code uniqueness
    const codeExists = await checkSessionCodeExists(orgId, data.code);
    if (codeExists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Academic session with this code already exists for this organization',
          errors: { code: 'This session code is already taken' },
        },
        { status: 409 }
      );
    }

    // Create session
    const sessionData = {
      ...data,
      org_id: orgId,
    };

    let academicSession;
    try {
      academicSession = await createAcademicSession(sessionData);
    } catch (dbError) {
      if (dbError.message.includes('already exists')) {
        return NextResponse.json(
          {
            success: false,
            error: dbError.message,
            errors: { code: 'This session code is already taken' },
          },
          { status: 409 }
        );
      }
      throw dbError;
    }

    // Audit logging
    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'create',
        target_type: 'academic_session',
        target_id: academicSession.id,
        metadata: { code: academicSession.code, org_id: orgId },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    // Revalidate cache
    revalidateTag('academic-sessions');

    return NextResponse.json(
      {
        success: true,
        session: academicSession,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating academic session:', error);

    if (error.code === 'CSRF_VALIDATION_FAILED') {
      return NextResponse.json(
        { success: false, error: 'CSRF validation failed' },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error.code === '23505') {
      return NextResponse.json(
        {
          success: false,
          error: 'Academic session with this code already exists',
          errors: { code: 'This session code is already taken' },
        },
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create academic session',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * PATCH /api/academic-sessions
 * Update an academic session
 */
export async function PATCH(request) {
  try {
    // Authentication
    let session;
    try {
      session = await requireSuperadmin(request);
    } catch (authError) {
      return NextResponse.json(
        {
          success: false,
          error: authError.message || 'Unauthorized. Superadmin access required.',
        },
        { status: authError.status || 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // CSRF protection
    requireCSRF(request);

    // Rate limiting
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

    // Parse and validate request body
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const validation = validateForm(academicSessionUpdateSchema, updateData);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Get current session to check orgId
    const currentSession = await getAcademicSessionById(id);
    if (!currentSession) {
      return NextResponse.json(
        { success: false, error: 'Academic session not found' },
        { status: 404 }
      );
    }

    // Get orgId
    const orgId = getOrgIdFromRequest(request, session);
    if (!orgId || orgId !== currentSession.org_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to update this academic session' },
        { status: 403 }
      );
    }

    // Check code uniqueness if code is being updated
    if (updateData.code && updateData.code !== currentSession.code) {
      const codeExists = await checkSessionCodeExists(orgId, updateData.code, id);
      if (codeExists) {
        return NextResponse.json(
          {
            success: false,
            error: 'Academic session with this code already exists',
            errors: { code: 'This session code is already taken' },
          },
          { status: 409 }
        );
      }
    }

    // Update session
    const updatedSession = await updateAcademicSession(id, validation.data);

    // Audit logging
    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'update',
        target_type: 'academic_session',
        target_id: id,
        metadata: { changes: updateData },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    // Revalidate cache
    revalidateTag('academic-sessions');

    return NextResponse.json(
      {
        success: true,
        session: updatedSession,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating academic session:', error);

    if (error.code === 'CSRF_VALIDATION_FAILED') {
      return NextResponse.json(
        { success: false, error: 'CSRF validation failed' },
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update academic session',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

