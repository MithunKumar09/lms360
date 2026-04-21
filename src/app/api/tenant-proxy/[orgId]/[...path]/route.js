/**
 * Superadmin Tenant Proxy
 *
 * All HTTP methods: /api/tenant-proxy/[orgId]/[...path]
 *
 * Allows a superadmin (with a valid delegation token) to execute API calls
 * scoped to a specific organization. Every call is:
 *   1. Authenticated via delegation JWT (jti verified against DB for revocation)
 *   2. Scope-enforced (read_only → GET only; read_write → all methods)
 *   3. Fully audited (every proxy call logged to audit_events)
 *   4. Org-scoped (x-tenant-org-id header is forcibly set to targetOrgId)
 *
 * Anti-cascade: this route rejects requests that carry a delegation token
 * in the x-delegation-token header and also target /api/superadmin/delegate-access.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { jwtVerify } from 'jose';

const DELEGATION_SECRET = new TextEncoder().encode(
  process.env.SUPERADMIN_DELEGATION_SECRET ?? ''
);

/**
 * Verify and validate a delegation token.
 * Returns the decoded payload or throws with a descriptive error.
 */
async function verifyDelegationToken(authHeader, requiredOrgId) {
  if (!authHeader?.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing Bearer token'), { status: 401 });
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    const result = await jwtVerify(token, DELEGATION_SECRET, {
      algorithms: ['HS256'],
    });
    payload = result.payload;
  } catch {
    throw Object.assign(new Error('Invalid or expired delegation token'), { status: 401 });
  }

  // Structural validation
  if (payload.type !== 'superadmin_delegation') {
    throw Object.assign(new Error('Wrong token type'), { status: 403 });
  }
  if (payload.targetOrgId !== requiredOrgId) {
    throw Object.assign(new Error('Token org mismatch'), { status: 403 });
  }

  // Revocation check (DB lookup — hot path, keep fast)
  const dbRes = await query(
    `SELECT revoked_at, scope
     FROM superadmin_delegation_tokens
     WHERE jti = $1`,
    [payload.jti]
  );
  const record = dbRes.rows[0];
  if (!record) {
    throw Object.assign(new Error('Delegation token not found'), { status: 401 });
  }
  if (record.revoked_at) {
    throw Object.assign(new Error('Delegation token has been revoked'), { status: 401 });
  }

  // Update last_used_at (fire-and-forget; don't await to keep latency low)
  query(
    `UPDATE superadmin_delegation_tokens SET last_used_at = NOW() WHERE jti = $1`,
    [payload.jti]
  ).catch(() => {});

  return { ...payload, scope: record.scope };
}

/**
 * Core proxy handler — all HTTP methods funnel through here.
 */
async function handleProxy(request, { params }) {
  const { orgId, path: pathSegments } = await params;
  const innerPath = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;
  const method = request.method;

  // Anti-cascade: block attempts to create new delegation tokens via proxy
  if (innerPath === 'superadmin/delegate-access' && method === 'POST') {
    return NextResponse.json(
      { error: 'Delegation tokens cannot create other delegation tokens' },
      { status: 403 }
    );
  }

  // Verify delegation token
  const authHeader = request.headers.get('authorization');
  let tokenPayload;
  try {
    tokenPayload = await verifyDelegationToken(authHeader, orgId);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: err.status ?? 401 });
  }

  // Scope enforcement
  if (tokenPayload.scope === 'read_only' && method !== 'GET') {
    return NextResponse.json(
      { error: 'This delegation token is read-only' },
      { status: 403 }
    );
  }

  // Build the internal API URL, forwarding query params
  const originalUrl = new URL(request.url);
  const internalUrl = new URL(
    `/api/${innerPath}${originalUrl.search}`,
    originalUrl.origin
  );

  // Build proxied request headers — inject tenant context forcibly
  const proxyHeaders = new Headers(request.headers);
  proxyHeaders.set('x-tenant-org-id', orgId);
  proxyHeaders.set('x-tenant-mode', 'tenant');
  proxyHeaders.set('x-proxy-superadmin-id', tokenPayload.superadminId);
  proxyHeaders.set('x-proxy-delegation-jti', tokenPayload.jti);
  // Remove the delegation bearer token so the inner route sees no auth header
  // (the inner route uses session/guard — the proxy has already authenticated)
  proxyHeaders.delete('authorization');

  // Clone body for non-GET requests
  let body = undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await request.arrayBuffer().catch(() => undefined);
  }

  // Execute inner API call
  let innerResponse;
  try {
    innerResponse = await fetch(internalUrl.toString(), {
      method,
      headers: proxyHeaders,
      body,
      // Prevent fetch from following redirects silently
      redirect: 'manual',
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Proxy internal request failed', detail: err.message },
      { status: 502 }
    );
  }

  // Audit every proxy call (fire-and-forget)
  query(
    `INSERT INTO audit_events
       (actor_id, org_id, action, resource_type, resource_id, metadata)
     VALUES ($1, $2, 'superadmin_proxy_access', 'api_path', NULL, $3)`,
    [
      tokenPayload.superadminId,
      orgId,
      JSON.stringify({
        jti: tokenPayload.jti,
        method,
        path: innerPath,
        status: innerResponse.status,
        scope: tokenPayload.scope,
      }),
    ]
  ).catch(() => {});

  // Stream the response back
  const responseBody = await innerResponse.arrayBuffer();
  return new NextResponse(responseBody, {
    status: innerResponse.status,
    headers: {
      'content-type': innerResponse.headers.get('content-type') ?? 'application/json',
    },
  });
}

export const GET    = (request, context) => handleProxy(request, context);
export const POST   = (request, context) => handleProxy(request, context);
export const PUT    = (request, context) => handleProxy(request, context);
export const PATCH  = (request, context) => handleProxy(request, context);
export const DELETE = (request, context) => handleProxy(request, context);
