/**
 * Program Nodes API Route
 * 
 * Handles GET (list) and POST (create) operations for program nodes.
 * Only superadmin users can access these endpoints.
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { checkUserIpRateLimit } from '@/lib/api/rateLimiter.js';
import { requireCSRF } from '@/lib/api/csrf.js';
import { programNodeCreateSchema, programNodeUpdateSchema, validateForm } from '@/lib/validation/classesSubjectsSchemas.js';
import {
  createProgramNode,
  listProgramNodes,
  getProgramNodeById,
  updateProgramNode,
  getProgramNodeHierarchy,
  checkProgramNodeCodeExists,
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
      node_type: searchParams.get('nodeType') || searchParams.get('node_type'),
      parent_id: searchParams.get('parent_id') === 'null' ? null : searchParams.get('parent_id'),
      status: searchParams.get('status'),
      search: searchParams.get('q') || searchParams.get('search'),
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '50', 10),
    };

    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1 || filters.limit > 50) filters.limit = 50;

    // If hierarchy requested, return hierarchy
    if (searchParams.get('hierarchy') === 'true' && filters.level) {
      const hierarchy = await getProgramNodeHierarchy(orgId, filters.level);
      return NextResponse.json(
        { success: true, nodes: hierarchy },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
          },
        }
      );
    }

    const nodes = await listProgramNodes(filters);
    const etag = generateETag(nodes);

    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return NextResponse.json(
      { success: true, nodes },
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
    console.error('Error in GET /api/program-nodes:', error);
    // Gracefully handle Postgres "too many connections" errors
    if (error && (error.code === '53300' || /remaining connection slots/i.test(error.message || ''))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database is busy. Please try again in a moment.',
        },
        { status: 503, headers: { 'Content-Type': 'application/json', 'Retry-After': '2' } }
      );
    }
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
    const validation = validateForm(programNodeCreateSchema, body);
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

    // Check code uniqueness
    const codeExists = await checkProgramNodeCodeExists(
      orgId,
      validation.data.level,
      validation.data.node_type,
      validation.data.code
    );
    if (codeExists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Program node with this code already exists for this organization, level, and type',
          errors: { code: 'This code is already taken' },
        },
        { status: 409 }
      );
    }

    const nodeData = { ...validation.data, org_id: orgId };
    let node;
    try {
      node = await createProgramNode(nodeData);
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
        target_type: 'program_node',
        target_id: node.id,
        metadata: { code: node.code, level: node.level, node_type: node.node_type },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('program-nodes');

    return NextResponse.json(
      { success: true, node },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating program node:', error);
    if (error && (error.code === '53300' || /remaining connection slots/i.test(error.message || ''))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database is busy. Please try again shortly.',
        },
        { status: 503, headers: { 'Content-Type': 'application/json', 'Retry-After': '2' } }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create program node',
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
        { success: false, error: 'Program node ID is required' },
        { status: 400 }
      );
    }

    const validation = validateForm(programNodeUpdateSchema, updateData);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', errors: validation.errors },
        { status: 400 }
      );
    }

    const currentNode = await getProgramNodeById(id);
    if (!currentNode) {
      return NextResponse.json(
        { success: false, error: 'Program node not found' },
        { status: 404 }
      );
    }

    const orgId = getOrgIdFromRequest(request, session);
    if (!orgId || orgId !== currentNode.org_id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to update this program node' },
        { status: 403 }
      );
    }

    // Check code uniqueness if code is being updated
    if (updateData.code && updateData.code !== currentNode.code) {
      const codeExists = await checkProgramNodeCodeExists(
        orgId,
        updateData.level || currentNode.level,
        updateData.node_type || currentNode.node_type,
        updateData.code,
        id
      );
      if (codeExists) {
        return NextResponse.json(
          {
            success: false,
            error: 'Program node with this code already exists',
            errors: { code: 'This code is already taken' },
          },
          { status: 409 }
        );
      }
    }

    const updatedNode = await updateProgramNode(id, validation.data);

    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'update',
        target_type: 'program_node',
        target_id: id,
        metadata: { changes: updateData },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      console.error('Failed to create audit event:', auditError);
    }

    revalidateTag('program-nodes');

    return NextResponse.json(
      { success: true, node: updatedNode },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating program node:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update program node',
        details: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
      },
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

