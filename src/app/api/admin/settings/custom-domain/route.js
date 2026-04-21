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
import crypto from 'crypto';

// Basic hostname format validation (no protocol, no path)
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
  if (!DOMAIN_RE.test(normalizedDomain)) {
    return NextResponse.json(
      { error: 'Invalid domain format. Use: school.example.com' },
      { status: 400 }
    );
  }

  // Check plan tier (only 'pro' orgs can use custom domains)
  const orgRes = await query(
    `SELECT plan_tier, subdomain FROM organizations WHERE id = $1`,
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

  // Check the domain is not already claimed by another org
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
         ssl_cloudflare_hostname_id = NULL
     WHERE id = $3`,
    [normalizedDomain, verificationToken, orgId]
  );

  // Bust tenant cache for old custom domain (if any)
  invalidateByOrgId(orgId);

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
            ssl_status, domain_verification_token, subdomain, plan_tier
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
    planTier: org.plan_tier,
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

  // Fetch the domain before clearing it (to bust cache and revoke Cloudflare hostname)
  const orgRes = await query(
    `SELECT custom_domain, ssl_cloudflare_hostname_id FROM organizations WHERE id = $1`,
    [orgId]
  );
  const org = orgRes.rows[0];

  await query(
    `UPDATE organizations
     SET custom_domain = NULL,
         domain_verified = false,
         domain_verified_at = NULL,
         ssl_status = 'pending',
         domain_verification_token = NULL,
         ssl_cloudflare_hostname_id = NULL
     WHERE id = $1`,
    [orgId]
  );

  // Bust tenant cache so the old domain stops routing
  invalidateByOrgId(orgId);

  // If Cloudflare had a custom hostname, remove it (best-effort)
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
