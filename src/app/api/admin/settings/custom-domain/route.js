//src/app/api/admin/settings/custom-domain/route.js 
/**
 * Admin Custom Domain Management API
 *
 * Manages the custom domain lifecycle for an organization:
 *
 * PUT  /api/admin/settings/custom-domain
 *   — Request a custom domain (generates verification token)
 *   — Body: { domain: 'school.example.com' }
 *
 * GET  /api/admin/settings/custom-domain
 *   — Check current custom domain and verification/SSL status
 *
 * DELETE /api/admin/settings/custom-domain
 *   — Remove custom domain (reverts to subdomain-only routing)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';
import { invalidateByOrgId } from '@/lib/tenant/cache.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import crypto from 'crypto';

// Basic hostname format validation (no protocol, no path, no port)
const DOMAIN_RE = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i;

// ── PUT: Request a custom domain ─────────────────────────────────────────────

export async function PUT(request) {
  let session;
  try {
    session = await requireRole(request, ['admin']);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = session.user.orgId;
  if (!orgId) {
    return NextResponse.json({ error: 'No organization context' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { domain } = body;

  if (!domain || typeof domain !== 'string') {
    return NextResponse.json({ error: 'domain is required' }, { status: 400 });
  }

  const normalizedDomain = domain.trim().toLowerCase();

  // Explicit length guard — DOMAIN_RE catches most cases but pathological payloads
  // or proxy/header edge cases can slip through without an explicit check.
  if (normalizedDomain.length > 253) {
    return NextResponse.json({ error: 'Domain name too long (max 253 characters).' }, { status: 400 });
  }

  if (!DOMAIN_RE.test(normalizedDomain)) {
    return NextResponse.json(
      { error: 'Invalid domain format. Use: school.example.com' },
      { status: 400 }
    );
  }

  // Reject reserved platform domains to prevent routing conflicts and confusion.
  // Subdomains of the base domain must be registered via subdomain field, not custom_domain.
  const baseDomain = process.env.NEXTAUTH_BASE_DOMAIN ?? 'edurock.com';
  if (
    normalizedDomain === baseDomain ||
    normalizedDomain === `admin.${baseDomain}` ||
    normalizedDomain.endsWith(`.${baseDomain}`)
  ) {
    return NextResponse.json(
      { error: 'This domain conflicts with the platform domain.' },
      { status: 409 }
    );
  }

  // Check plan tier (only 'pro' orgs can use custom domains)
  const orgRes = await query(
    `SELECT plan_tier, subdomain, custom_domain, updated_at FROM organizations WHERE id = $1`,
    [orgId]
  );
  const org = orgRes.rows[0];
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }
  if (org.plan_tier !== 'pro') {
    return NextResponse.json(
      { error: 'Custom domains require a Pro plan. Please upgrade.' },
      { status: 403 }
    );
  }

  // Rate-limit domain changes: at most once per hour per org (F9-A).
  // Prevents spamming the verification job with new tokens.
  if (org.custom_domain && org.custom_domain !== normalizedDomain) {
    const lastChanged = org.updated_at ? new Date(org.updated_at) : null;
    if (lastChanged && Date.now() - lastChanged.getTime() < 60 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Domain can be changed at most once per hour.' },
        { status: 429 }
      );
    }
  }

  // Check the domain is not already claimed by another org.
  // The unique index idx_organizations_custom_domain_claim enforces this at DB level,
  // but we check here first for a cleaner error message.
  const conflictRes = await query(
    `SELECT id FROM organizations
     WHERE custom_domain = $1 AND id != $2`,
    [normalizedDomain, orgId]
  );
  if (conflictRes.rows.length > 0) {
    return NextResponse.json(
      { error: 'This domain is already in use by another organization' },
      { status: 409 }
    );
  }

  // Generate a new verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  await query(
    `UPDATE organizations
     SET custom_domain = $1,
         domain_verified = false,
         domain_verified_at = NULL,
         ssl_status = 'pending',
         domain_verification_token = $2,
         ssl_cloudflare_hostname_id = NULL,
         domain_verification_attempts = 0,
         domain_verification_last_checked_at = NULL,
         domain_ssl_error = NULL
     WHERE id = $3`,
    [normalizedDomain, verificationToken, orgId]
  );

  // Bust tenant cache for old custom domain (if any)
  invalidateByOrgId(orgId);

  // Audit trail
  createAuditEvent({
    actor_id: session.user.id,
    action: 'custom_domain_claimed',
    target_type: 'organization',
    target_id: orgId,
    metadata: { domain: normalizedDomain },
  }).catch(() => {});

  console.log(JSON.stringify({ event: 'custom_domain_claimed', orgId, domain: normalizedDomain }));

  return NextResponse.json({
    domain: normalizedDomain,
    verified: false,
    sslStatus: 'pending',
    verification: {
      txtRecord: `_edurock-verify.${normalizedDomain}`,
      txtValue: verificationToken,
      instructions:
        'Add this TXT record to your DNS provider. ' +
        'Verification runs every 5 minutes automatically.',
    },
  });
}

// ── GET: Check current custom domain status ───────────────────────────────────

export async function GET(request) {
  let session;
  try {
    session = await requireRole(request, ['admin']);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = session.user.orgId;
  if (!orgId) {
    return NextResponse.json({ error: 'No organization context' }, { status: 403 });
  }

  const orgRes = await query(
    `SELECT custom_domain, domain_verified, domain_verified_at,
            ssl_status, domain_verification_token, subdomain, plan_tier,
            domain_verification_attempts, domain_verification_last_checked_at,
            domain_ssl_error
     FROM organizations WHERE id = $1`,
    [orgId]
  );
  const org = orgRes.rows[0];
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  return NextResponse.json({
    subdomain: org.subdomain,
    customDomain: org.custom_domain ?? null,
    verified: org.domain_verified ?? false,
    verifiedAt: org.domain_verified_at ?? null,
    sslStatus: org.ssl_status ?? 'pending',
    sslError: org.domain_ssl_error ?? null,
    planTier: org.plan_tier,
    verificationAttempts: org.domain_verification_attempts ?? 0,
    verificationLastCheckedAt: org.domain_verification_last_checked_at ?? null,
    // Only show verification token if not yet verified
    verificationTxtRecord: !org.domain_verified && org.domain_verification_token
      ? `_edurock-verify.${org.custom_domain}`
      : null,
    verificationTxtValue: !org.domain_verified
      ? org.domain_verification_token
      : null,
  });
}

// ── DELETE: Remove custom domain ─────────────────────────────────────────────

export async function DELETE(request) {
  let session;
  try {
    session = await requireRole(request, ['admin']);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgId = session.user.orgId;
  if (!orgId) {
    return NextResponse.json({ error: 'No organization context' }, { status: 403 });
  }

  // Fetch the domain before clearing it (needed for cache bust, Cloudflare revoke,
  // subdomain-null guard, and audit trail)
  const orgRes = await query(
    `SELECT custom_domain, ssl_cloudflare_hostname_id, subdomain FROM organizations WHERE id = $1`,
    [orgId]
  );
  const org = orgRes.rows[0];

  // Subdomain-null guard: if the org has no subdomain fallback, removing the custom
  // domain would make the org completely unreachable. Block the removal and require
  // superadmin to assign a subdomain first.
  if (!org?.subdomain) {
    return NextResponse.json(
      { error: 'Cannot remove custom domain: no subdomain fallback configured. Contact support.' },
      { status: 400 }
    );
  }

  await query(
    `UPDATE organizations
     SET custom_domain = NULL,
         domain_verified = false,
         domain_verified_at = NULL,
         ssl_status = 'pending',
         domain_verification_token = NULL,
         ssl_cloudflare_hostname_id = NULL,
         domain_verification_attempts = 0,
         domain_verification_last_checked_at = NULL,
         domain_ssl_error = NULL
     WHERE id = $1`,
    [orgId]
  );

  // Bust tenant cache so the old domain stops routing on this instance.
  // Other instances expire naturally within the 60s TTL.
  invalidateByOrgId(orgId);

  // Audit trail
  createAuditEvent({
    actor_id: session.user.id,
    action: 'custom_domain_removed',
    target_type: 'organization',
    target_id: orgId,
    metadata: { previousDomain: org?.custom_domain ?? null },
  }).catch(() => {});

  console.log(JSON.stringify({ event: 'custom_domain_removed', orgId, previousDomain: org?.custom_domain }));

  // If Cloudflare had a custom hostname, remove it (best-effort fire-and-forget).
  // If this fails silently, Cloudflare still terminates SSL for the domain but the
  // resolver returns NOT_FOUND (custom_domain=NULL in DB), so routing is safe.
  // The stale Cloudflare entry is "adopted" if another org later claims the same domain.
  if (org?.ssl_cloudflare_hostname_id && process.env.CLOUDFLARE_ZONE_ID) {
    fetch(
      `https://api.cloudflare.com/client/v4/zones/${process.env.CLOUDFLARE_ZONE_ID}/custom_hostnames/${org.ssl_cloudflare_hostname_id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        },
      }
    ).catch((err) =>
      console.warn(`Failed to remove Cloudflare hostname ${org.ssl_cloudflare_hostname_id}:`, err.message)
    );
  }

  return NextResponse.json({
    removed: true,
    previousDomain: org?.custom_domain ?? null,
  });
}
