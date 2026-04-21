/**
 * Elective Group Member by ID API Route
 * 
 * Handles DELETE operation for removing a specific member from an elective group.
 * Only superadmin users can access this endpoint.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkUserIpRateLimit } from '@/lib/api/rateLimiter.js';
import { requireCSRF } from '@/lib/api/csrf.js';
import {
  getElectiveGroupById,
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

    const { id, memberId } = params;

    if (!id || !memberId) {
      return NextResponse.json(
        { success: false, error: 'Elective group ID and member ID are required' },
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

    const removed = await removeElectiveGroupMember(id, memberId);

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
        metadata: { subject_id: memberId },
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

