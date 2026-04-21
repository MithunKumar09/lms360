/**
 * Elective Group Members API Route
 * 
 * Handles POST (add member) and DELETE (remove member) operations for elective group members.
 * Only superadmin users can access these endpoints.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkUserIpRateLimit } from '@/lib/api/rateLimiter.js';
import { requireCSRF } from '@/lib/api/csrf.js';
import { electiveGroupMemberSchema, validateForm } from '@/lib/validation/classesSubjectsSchemas.js';
import {
  getElectiveGroupById,
  addElectiveGroupMember,
  removeElectiveGroupMember,
} from '@/lib/db/classesSubjects.js';
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
    const body = await request.json();

    // Validate subject_id is provided
    if (!body.subject_id) {
      return NextResponse.json(
        { success: false, error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    const group = await getElectiveGroupById(id);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Elective group not found' },
        { status: 404 }
      );
    }

    const orgId = getOrgIdFromRequest(request, session);
    if (!orgId || orgId !== group.org_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to modify this elective group' },
        { status: 403 }
      );
    }

    let member;
    try {
      member = await addElectiveGroupMember(id, body.subject_id);
    } catch (dbError) {
      if (dbError.message.includes('already')) {
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
        action: 'add_member',
        target_type: 'elective_group',
        target_id: id,
        metadata: { subject_id: body.subject_id },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('elective-groups');

    return NextResponse.json(
      { success: true, member },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding elective group member:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to add member',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function DELETE(request, { params }) {
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
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subject_id');

    if (!subjectId) {
      return NextResponse.json(
        { success: false, error: 'Subject ID is required' },
        { status: 400 }
      );
    }

    const group = await getElectiveGroupById(id);
    if (!group) {
      return NextResponse.json(
        { success: false, error: 'Elective group not found' },
        { status: 404 }
      );
    }

    const orgId = getOrgIdFromRequest(request, session);
    if (!orgId || orgId !== group.org_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to modify this elective group' },
        { status: 403 }
      );
    }

    const removed = await removeElectiveGroupMember(id, subjectId);

    if (!removed) {
      return NextResponse.json(
        { success: false, error: 'Member not found in this elective group' },
        { status: 404 }
      );
    }

    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'remove_member',
        target_type: 'elective_group',
        target_id: id,
        metadata: { subject_id: subjectId },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('elective-groups');

    return NextResponse.json(
      { success: true, message: 'Member removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error removing elective group member:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to remove member',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

