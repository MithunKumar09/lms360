/**
 * Tenant Resolve API — Internal use by middleware only
 *
 * GET /api/tenant-resolve?host=<normalized-hostname>
 *
 * Resolves a hostname to an organization record. Runs in Node.js runtime so
 * DB access (pg) is safe here.
 *
 * This route exists because Next.js middleware runs on Edge Runtime and cannot
 * import pg/db/index directly. Middleware calls this route via fetch() and uses
 * the JSON result to enrich x-tenant-* headers.
 *
 * The route is excluded from the middleware matcher to prevent an infinite loop.
 *
 * Response shapes:
 *   { orgId: string, status: 'active', revocationVersion: number }
 *                                                 — tenant found and active
 *   { error: 'NOT_FOUND' }                        — no matching org
 *   { error: 'SUSPENDED' }                        — org is suspended or inactive
 *   { error: 'DELETED' }                          — org has been soft-deleted
 *
 * revocationVersion is included in the success response so middleware can
 * compare token.org_rv against it and reject stale sessions immediately.
 * See migration 089_revocation_version.sql.
 *
 * Logic is identical to src/lib/tenant/resolver.js lookupBySubdomain /
 * lookupByCustomDomain / buildResult to guarantee consistent behavior.
 * If resolver.js lookup logic ever changes, update this route to match.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';

// Force Node.js runtime (default for API routes — explicit for clarity).
export const runtime = 'nodejs';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const host = searchParams.get('host');

  // Basic input validation — hostname was already sanitized by middleware's
  // extractHostname(), but validate again for defense-in-depth.
  if (!host || typeof host !== 'string' || host.length > 253) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 400 });
  }

  if (
    host.includes('..') ||
    host.startsWith('.') ||
    host.includes('\0') ||
    host.includes('/')
  ) {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 400 });
  }

  const baseDomain = process.env.NEXTAUTH_BASE_DOMAIN ?? 'edurock.com';
  const isSubdomain = host.endsWith(`.${baseDomain}`);

  try {
    let result;

    if (isSubdomain) {
      const subdomain = host.slice(0, -(baseDomain.length + 1));
      const { rows } = await query(
        `SELECT id, status, deleted_at, revocation_version
         FROM organizations
         WHERE subdomain = $1
         LIMIT 1`,
        [subdomain]
      );
      result = rows.length ? buildResult(rows[0]) : { error: 'NOT_FOUND' };
    } else {
      const { rows } = await query(
        `SELECT id, status, deleted_at, revocation_version
         FROM organizations
         WHERE custom_domain = $1
           AND domain_verified = true
         LIMIT 1`,
        [host]
      );
      result = rows.length ? buildResult(rows[0]) : { error: 'NOT_FOUND' };
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('[tenant-resolve] DB error:', err.message);
    // Fail closed: treat DB errors the same as NOT_FOUND to avoid leaking
    // internal state. Middleware will redirect to /unknown-tenant.
    return NextResponse.json({ error: 'NOT_FOUND' });
  }
}

/**
 * Map an organizations row to the tenant result shape.
 * Must stay in sync with resolver.js buildResult().
 *
 * @param {{ id: string, status: string, deleted_at: string|null, revocation_version: number }} org
 * @returns {{ orgId: string, status: string, revocationVersion: number } | { error: string }}
 */
function buildResult(org) {
  if (org.deleted_at)              return { error: 'DELETED' };
  if (org.status === 'suspended')  return { error: 'SUSPENDED' };
  if (org.status !== 'active')     return { error: 'SUSPENDED' }; // inactive → suspended
  return {
    orgId: org.id,
    status: org.status,
    revocationVersion: org.revocation_version ?? 0,
  };
}
