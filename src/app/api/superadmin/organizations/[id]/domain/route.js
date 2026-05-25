/**
 * Superadmin Domain Management API
 *
 * Provides superadmin control over any organization's domain settings.
 *
 * GET    /api/superadmin/organizations/[id]/domain
 *   — Fetch domain fields for any org
 *
 * PATCH  /api/superadmin/organizations/[id]/domain
 *   — Set subdomain, override plan_tier, force-verify domain, clear custom domain
 *   — Body: { subdomain?, planTier?, forceVerify?, clearCustomDomain? }
 *
 * DELETE /api/superadmin/organizations/[id]/domain/cache
 *   — Manually invalidate the tenant cache for this org
 *   — Note: Next.js does not support a nested DELETE /domain/cache route directly,
 *     so cache invalidation is exposed as PATCH with { invalidateCache: true }
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { invalidateByOrgId } from '@/lib/tenant/cache.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SUBDOMAIN_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

// ── GET: Fetch domain fields for an org ───────────────────────────────────────

export async function GET(request, { params }) {
  try {
    await requireSuperadmin(request);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid organization ID' }, { status: 400 });
  }

  const { rows } = await query(
    `SELECT id, name, subdomain, custom_domain, domain_verified, domain_verified_at,
            ssl_status, ssl_cloudflare_hostname_id, plan_tier,
            domain_verification_token, domain_verification_attempts,
            domain_verification_last_checked_at, domain_ssl_error, status
     FROM organizations WHERE id = $1`,
    [id]
  );

  if (!rows.length) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const org = rows[0];
  return NextResponse.json({
    orgId: org.id,
    name: org.name,
    subdomain: org.subdomain,
    customDomain: org.custom_domain ?? null,
    domainVerified: org.domain_verified ?? false,
    domainVerifiedAt: org.domain_verified_at ?? null,
    sslStatus: org.ssl_status ?? 'pending',
    sslError: org.domain_ssl_error ?? null,
    cloudflareHostnameId: org.ssl_cloudflare_hostname_id ?? null,
    planTier: org.plan_tier ?? 'basic',
    verificationToken: org.domain_verification_token ?? null,
    verificationAttempts: org.domain_verification_attempts ?? 0,
    verificationLastCheckedAt: org.domain_verification_last_checked_at ?? null,
    orgStatus: org.status,
  });
}

// ── PATCH: Mutate domain fields ───────────────────────────────────────────────

export async function PATCH(request, { params }) {
  let session;
  try {
    session = await requireSuperadmin(request);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Invalid organization ID' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const { subdomain, planTier, forceVerify, clearCustomDomain, invalidateCache } = body;

  // Cache-only invalidation shortcut
  if (invalidateCache === true) {
    invalidateByOrgId(id);
    return NextResponse.json({ invalidated: true });
  }

  // Validate inputs
  if (subdomain !== undefined) {
    if (typeof subdomain !== 'string' || !SUBDOMAIN_RE.test(subdomain)) {
      return NextResponse.json(
        { error: 'Invalid subdomain format. Use lowercase letters, numbers, and hyphens only.' },
        { status: 400 }
      );
    }
  }

  if (planTier !== undefined && !['basic', 'pro', 'enterprise'].includes(planTier)) {
    return NextResponse.json({ error: 'Invalid plan tier.' }, { status: 400 });
  }

  // Check org exists
  const existingRes = await query(
    `SELECT id, subdomain, custom_domain, plan_tier FROM organizations WHERE id = $1`,
    [id]
  );
  if (!existingRes.rows.length) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  const existing = existingRes.rows[0];

  // Subdomain uniqueness check
  if (subdomain && subdomain !== existing.subdomain) {
    const conflict = await query(
      `SELECT id FROM organizations WHERE subdomain = $1 AND id != $2`,
      [subdomain, id]
    );
    if (conflict.rows.length > 0) {
      return NextResponse.json(
        { error: 'This subdomain is already in use by another organization.' },
        { status: 409 }
      );
    }
  }

  // Build update fields
  const updates = [];
  const values = [];
  let p = 1;

  if (subdomain !== undefined) {
    updates.push(`subdomain = $${p++}`);
    values.push(subdomain);
  }
  if (planTier !== undefined) {
    updates.push(`plan_tier = $${p++}`);
    values.push(planTier);
  }
  if (forceVerify === true) {
    updates.push(`domain_verified = true`);
    updates.push(`domain_verified_at = NOW()`);
    updates.push(`ssl_status = 'provisioning'`);
  }
  if (clearCustomDomain === true) {
    updates.push(`custom_domain = NULL`);
    updates.push(`domain_verified = false`);
    updates.push(`domain_verified_at = NULL`);
    updates.push(`ssl_status = 'pending'`);
    updates.push(`domain_verification_token = NULL`);
    updates.push(`ssl_cloudflare_hostname_id = NULL`);
    updates.push(`domain_verification_attempts = 0`);
    updates.push(`domain_verification_last_checked_at = NULL`);
    updates.push(`domain_ssl_error = NULL`);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  values.push(id);
  await query(
    `UPDATE organizations SET ${updates.join(', ')} WHERE id = $${p}`,
    values
  );

  // Always invalidate tenant cache after any domain mutation
  invalidateByOrgId(id);

  // Audit trail
  createAuditEvent({
    actor_id: session.user.id,
    action: 'superadmin_domain_update',
    target_type: 'organization',
    target_id: id,
    metadata: { subdomain, planTier, forceVerify, clearCustomDomain },
  }).catch(() => {});

  // Fetch updated state to return
  const updated = await query(
    `SELECT subdomain, custom_domain, domain_verified, ssl_status, plan_tier,
            domain_verification_attempts, domain_ssl_error
     FROM organizations WHERE id = $1`,
    [id]
  );

  return NextResponse.json({ success: true, domain: updated.rows[0] });
}
