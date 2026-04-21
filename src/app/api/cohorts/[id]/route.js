/**
 * Cohort by ID API Route
 * 
 * Handles GET, PUT, and PATCH operations for a single cohort.
 * Only superadmin users can access these endpoints.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkUserIpRateLimit } from '@/lib/api/rateLimiter.js';
import { requireCSRF } from '@/lib/api/csrf.js';
import { cohortUpdateSchema, validateForm } from '@/lib/validation/classesSubjectsSchemas.js';
import { getCohortById, updateCohort } from '@/lib/db/classesSubjects.js';
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
        { success: false, error: 'Cohort ID is required' },
        { status: 400 }
      );
    }

    const cohort = await getCohortById(id);
    if (!cohort) {
      console.log('[BACKEND] GET /api/cohorts/[id]: Cohort not found for id:', id);
      return NextResponse.json(
        { success: false, error: 'Cohort not found' },
        { status: 404 }
      );
    }

    // Log all fields retrieved from database
    console.log('[BACKEND] GET /api/cohorts/[id]: Retrieved cohort from database:', {
      id: cohort.id,
      code: cohort.code,
      org_id: cohort.org_id,
      level: cohort.level,
      program_node_id: cohort.program_node_id,
      program_node_title: cohort.program_node_title,
      program_node_code: cohort.program_node_code,
      program_node_type: cohort.program_node_type,
      section_id: cohort.section_id,
      section_label: cohort.section_label,
      section_capacity: cohort.section_capacity,
      section_room: cohort.section_room,
      term_id: cohort.term_id,
      term_label: cohort.term_label,
      term_type: cohort.term_type,
      session_id: cohort.session_id,
      session_code: cohort.session_code,
      session_start_date: cohort.session_start_date,
      session_end_date: cohort.session_end_date,
      status: cohort.status,
      locked_fields: cohort.locked_fields,
      created_by: cohort.created_by,
      created_by_email: cohort.created_by_email,
      created_at: cohort.created_at,
      updated_at: cohort.updated_at,
      // Check which fields are null
      nullFields: Object.keys(cohort).filter(key => cohort[key] === null || cohort[key] === undefined),
    });

    // Superadmin can access any cohort without orgId check
    if (session.user.role !== 'superadmin') {
      const orgId = getOrgIdFromRequest(request, session);
      if (!orgId || orgId !== cohort.org_id) {
        console.log('[BACKEND] GET /api/cohorts/[id]: Unauthorized access attempt', {
          requestedOrgId: orgId,
          cohortOrgId: cohort.org_id,
          userId: session.user.id,
          userRole: session.user.role,
        });
        return NextResponse.json(
          { success: false, error: 'Unauthorized to access this cohort' },
          { status: 403 }
        );
      }
    }

    console.log('[BACKEND] GET /api/cohorts/[id]: Successfully returning cohort data');
    return NextResponse.json(
      { success: true, cohort },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/cohorts/[id]:', error);
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

export async function PUT(request, context) {
  return handleUpdate(request, context);
}

export async function PATCH(request, context) {
  return handleUpdate(request, context);
}

export async function DELETE(request, context) {
  try {
    // Handle params - in Next.js 15+, params might be a Promise
    const params = context?.params || {};
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams || {};
    
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

    // Superadmin can delete any cohort without orgId check
    if (session.user.role !== 'superadmin') {
      const orgId = getOrgIdFromRequest(request, session);
      if (!orgId || orgId !== currentCohort.org_id) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized to delete this cohort' },
          { status: 403 }
        );
      }
    }

    // CRITICAL: Check for active user assignments before deletion
    const { query } = await import('@/lib/db/index.js');
    
    // Check for students linked to this cohort
    const studentLinksCheck = await query(
      `SELECT COUNT(*)::int as count FROM student_links WHERE cohort_id = $1`,
      [id]
    );
    const studentCount = studentLinksCheck.rows[0]?.count || 0;

    // Check for instructors assigned to this cohort
    const instructorClassesCheck = await query(
      `SELECT COUNT(*)::int as count FROM instructor_classes WHERE cohort_id = $1`,
      [id]
    );
    const instructorCount = instructorClassesCheck.rows[0]?.count || 0;

    // Check for user_class_subject_links referencing this cohort
    const userClassSubjectLinksCheck = await query(
      `SELECT COUNT(*)::int as count FROM user_class_subject_links WHERE cohort_id = $1`,
      [id]
    );
    const userClassSubjectCount = userClassSubjectLinksCheck.rows[0]?.count || 0;

    // If there are any active assignments, prevent deletion
    if (studentCount > 0 || instructorCount > 0 || userClassSubjectCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete cohort with active user assignments',
          details: {
            studentAssignments: studentCount,
            instructorAssignments: instructorCount,
            subjectLinkAssignments: userClassSubjectCount,
            message: `This cohort has ${studentCount} student assignment(s), ${instructorCount} instructor assignment(s), and ${userClassSubjectCount} subject link assignment(s). Please remove all assignments before deleting this cohort.`,
          },
        },
        { status: 409 }
      );
    }

    // Check for subject offerings linked to this cohort
    const subjectOfferingsCheck = await query(
      `SELECT COUNT(*)::int as count FROM subject_offerings WHERE cohort_id = $1`,
      [id]
    );
    const offeringCount = subjectOfferingsCheck.rows[0]?.count || 0;

    if (offeringCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete cohort with subject offerings',
          details: {
            subjectOfferings: offeringCount,
            message: `This cohort has ${offeringCount} subject offering(s). Please remove or reassign all subject offerings before deleting this cohort.`,
          },
        },
        { status: 409 }
      );
    }

    // All checks passed - proceed with deletion
    // Note: Database CASCADE will handle related records, but we've already checked for user assignments
    const deleteResult = await query(
      `DELETE FROM cohorts WHERE id = $1 RETURNING id, code`,
      [id]
    );

    if (deleteResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete cohort' },
        { status: 500 }
      );
    }

    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'delete',
        target_type: 'cohort',
        target_id: id,
        metadata: { 
          cohortCode: deleteResult.rows[0].code,
          role: session.user.role,
        },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('cohorts');

    return NextResponse.json(
      { success: true, message: 'Cohort deleted successfully' },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in DELETE /api/cohorts/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete cohort',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function handleUpdate(request, context) {
  try {
    // Handle params - in Next.js 15+, params might be a Promise
    const params = context?.params || {};
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams || {};
    
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Cohort ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Log incoming request for debugging
    console.log('[BACKEND] PUT/PATCH /api/cohorts/[id]: Received request', {
      id,
      hasSubjectIds: Array.isArray(body.subject_ids),
      subjectCount: Array.isArray(body.subject_ids) ? body.subject_ids.length : 0,
    });

    const validation = validateForm(cohortUpdateSchema, body);
    if (!validation.success) {
      console.log('[BACKEND] PUT/PATCH /api/cohorts/[id]: Validation failed', validation.errors);
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const currentCohort = await getCohortById(id);
    if (!currentCohort) {
      console.log('[BACKEND] PUT/PATCH /api/cohorts/[id]: Cohort not found for id:', id);
      return NextResponse.json(
        { success: false, error: 'Cohort not found' },
        { status: 404 }
      );
    }

    // Superadmin can update any cohort without orgId check
    if (session.user.role !== 'superadmin') {
      const orgId = getOrgIdFromRequest(request, session);
      if (!orgId || orgId !== currentCohort.org_id) {
        console.log('[BACKEND] PUT/PATCH /api/cohorts/[id]: Unauthorized access attempt', {
          requestedOrgId: orgId,
          cohortOrgId: currentCohort.org_id,
          userId: session.user.id,
          userRole: session.user.role,
        });
        return NextResponse.json(
          { success: false, error: 'Unauthorized to update this cohort' },
          { status: 403 }
        );
      }
    }

    // Extract subject_ids before updating cohort (they're not part of cohort table)
    const subjectIds = validation.data.subject_ids;
    
    // Remove subject_ids from cohortData since it's not a column in cohorts table
    const { subject_ids: _, ...cohortDataWithoutSubjects } = validation.data;
    const cohortData = cohortDataWithoutSubjects;

    // Update cohort with role-aware locked fields handling
    let updatedCohort;
    try {
      updatedCohort = await updateCohort(id, cohortData, session.user.role);
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

    // TODO: Handle subject_ids updates (create/update/delete subject offerings)
    // For now, we'll just log that subject_ids were provided
    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      console.log('[BACKEND] PUT/PATCH /api/cohorts/[id]: Subject IDs provided (not yet implemented)', {
        cohortId: id,
        subjectCount: subjectIds.length,
      });
    }

    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'update',
        target_type: 'cohort',
        target_id: id,
        metadata: { changes: cohortData, role: session.user.role, subjectCount: Array.isArray(subjectIds) ? subjectIds.length : 0 },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('cohorts');

    console.log('[BACKEND] PUT/PATCH /api/cohorts/[id]: Successfully updated cohort');
    return NextResponse.json(
      { success: true, cohort: updatedCohort },
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in PUT/PATCH /api/cohorts/[id]:', error);
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
