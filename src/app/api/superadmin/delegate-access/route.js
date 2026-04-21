/**
 * Superadmin Delegation Token API
 *
 * POST /api/superadmin/delegate-access
 *   — Mint a 15-minute delegation token for cross-tenant read access.
 *   — Rate-limited: max 5 active tokens per superadmin per hour.
 *   — Anti-cascade: this endpoint itself cannot be called with a delegation token.
 *
 * DELETE /api/superadmin/delegate-access?jti=<uuid>
 *   — Revoke a delegation token immediately.
 *
 * GET /api/superadmin/delegate-access?orgId=<uuid>
 *   — List active (non-expired, non-revoked) tokens for a target org.
 */

import { NextResponse } from 'next/server';
import { requireSuperadminWithMfa } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { SignJWT } from 'jose';
import crypto from 'crypto';

const DELEGATION_TTL_SECONDS = 15 * 60; // 15 minutes
const MAX_TOKENS_PER_HOUR = 5;
const DELEGATION_SECRET = new TextEncoder().encode(
  process.env.SUPERADMIN_DELEGATION_SECRET ?? ''
);

/**
 * Verify the secret is configured; throw early if not.
 */
function assertSecretConfigured() {
  if (!process.env.SUPERADMIN_DELEGATION_SECRET) {
    throw new Error('SUPERADMIN_DELEGATION_SECRET env var is not set');
  }
}

// ── POST /api/superadmin/delegate-access ─────────────────────────────────────

export async function POST(request) {
  // Anti-cascade: reject if the request carries a delegation token
  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader.startsWith('Bearer ') && request.headers.get('x-delegation-token')) {
    return NextResponse.json(
      { error: 'Delegation tokens cannot create other delegation tokens' },
      { status: 403 }
    );
  }

  let session;
  try {
    session = await requireSuperadminWithMfa(request);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  assertSecretConfigured();

  const body = await request.json().catch(() => ({}));
  const { targetOrgId, scope = 'read_only', accessReason } = body;

  if (!targetOrgId) {
    return NextResponse.json({ error: 'targetOrgId is required' }, { status: 400 });
  }
  if (!['read_only', 'read_write'].includes(scope)) {
    return NextResponse.json({ error: 'scope must be read_only or read_write' }, { status: 400 });
  }

  // Verify target org exists and is not deleted
  const orgRes = await query(
    `SELECT id, name, status FROM organizations WHERE id = $1`,
    [targetOrgId]
  );
  if (!orgRes.rows[0]) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  if (orgRes.rows[0].status === 'deleted') {
    return NextResponse.json({ error: 'Organization is deleted' }, { status: 410 });
  }

  // Rate limit: max 5 tokens per superadmin per hour
  const rateRes = await query(
    `SELECT COUNT(*) AS cnt
     FROM superadmin_delegation_tokens
     WHERE superadmin_id = $1
       AND created_at > NOW() - INTERVAL '1 hour'
       AND revoked_at IS NULL`,
    [session.user.id]
  );
  if (parseInt(rateRes.rows[0].cnt, 10) >= MAX_TOKENS_PER_HOUR) {
    return NextResponse.json(
      { error: 'Rate limit: max 5 delegation tokens per hour' },
      { status: 429 }
    );
  }

  const jti = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = new Date((now + DELEGATION_TTL_SECONDS) * 1000);

  // Sign JWT
  const token = await new SignJWT({
    type: 'superadmin_delegation',
    superadminId: session.user.id,
    targetOrgId,
    scope,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt(now)
    .setExpirationTime(now + DELEGATION_TTL_SECONDS)
    .sign(DELEGATION_SECRET);

  // Persist token record for revocation checks
  await query(
    `INSERT INTO superadmin_delegation_tokens
       (jti, superadmin_id, target_org_id, scope, expires_at, access_reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [jti, session.user.id, targetOrgId, scope, expiresAt, accessReason ?? null]
  );

  // Audit trail
  await query(
    `INSERT INTO audit_events (actor_id, action, resource_type, resource_id, metadata)
     VALUES ($1, 'delegation_token_created', 'organization', $2, $3)`,
    [
      session.user.id,
      targetOrgId,
      JSON.stringify({ jti, scope, orgName: orgRes.rows[0].name }),
    ]
  );

  return NextResponse.json({
    token,
    jti,
    expiresAt: expiresAt.toISOString(),
    targetOrgId,
    scope,
  });
}

// ── DELETE /api/superadmin/delegate-access?jti=<uuid> ────────────────────────

export async function DELETE(request) {
  let session;
  try {
    session = await requireSuperadminWithMfa(request);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jti = new URL(request.url).searchParams.get('jti');
  if (!jti) {
    return NextResponse.json({ error: 'jti query parameter is required' }, { status: 400 });
  }

  // Only the issuing superadmin can revoke (prevents one superadmin revoking another's token)
  const res = await query(
    `UPDATE superadmin_delegation_tokens
     SET revoked_at = NOW()
     WHERE jti = $1
       AND superadmin_id = $2
       AND revoked_at IS NULL
     RETURNING jti, target_org_id`,
    [jti, session.user.id]
  );

  if (!res.rows[0]) {
    return NextResponse.json(
      { error: 'Token not found, already revoked, or not owned by you' },
      { status: 404 }
    );
  }

  // Audit trail
  await query(
    `INSERT INTO audit_events (actor_id, action, resource_type, resource_id, metadata)
     VALUES ($1, 'delegation_token_revoked', 'organization', $2, $3)`,
    [
      session.user.id,
      res.rows[0].target_org_id,
      JSON.stringify({ jti }),
    ]
  );

  return NextResponse.json({ revoked: true, jti });
}

// ── GET /api/superadmin/delegate-access?orgId=<uuid> ─────────────────────────

export async function GET(request) {
  let session;
  try {
    session = await requireSuperadminWithMfa(request);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');

  const whereClause = orgId
    ? `WHERE superadmin_id = $1 AND target_org_id = $2 AND revoked_at IS NULL AND expires_at > NOW()`
    : `WHERE superadmin_id = $1 AND revoked_at IS NULL AND expires_at > NOW()`;
  const params = orgId ? [session.user.id, orgId] : [session.user.id];

  const res = await query(
    `SELECT jti, target_org_id, scope, created_at, expires_at, last_used_at, access_reason
     FROM superadmin_delegation_tokens
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT 50`,
    params
  );

  return NextResponse.json({ tokens: res.rows });
}
