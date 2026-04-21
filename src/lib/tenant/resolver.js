/**
 * Tenant Resolver
 *
 * Resolves an incoming hostname to an organization (tenant).
 *
 * Resolution strategy:
 *   1. admin.{baseDomain} or bare {baseDomain}     → control plane (no org)
 *   2. {slug}.{baseDomain}                          → look up by organizations.subdomain
 *   3. anything else (custom domain)               → look up by organizations.custom_domain
 *      where domain_verified = true
 *
 * Results are cached in-memory for 60 seconds to avoid a DB round-trip on
 * every request. On org suspension/deletion the cache entry must be
 * invalidated via invalidateByOrgId() or invalidate().
 *
 * @returns {{ orgId: string, status: string } | { error: 'NOT_FOUND'|'SUSPENDED'|'DELETED' }}
 */

import { query } from '@/lib/db/index.js';
import * as cache from './cache.js';

/**
 * Normalize the incoming host header:
 *   - Strips the port suffix (host:port → host)
 *   - Lowercases
 *   - Validates basic hostname format to prevent injection
 *   - Prefers Next.js-normalized value (request.nextUrl.hostname) over raw header
 *
 * @param {Request} request  Next.js middleware Request object
 * @returns {string|null}    Normalized hostname or null if malformed
 */
export function extractHostname(request) {
  // request.nextUrl.hostname is already normalized by Next.js (handles x-forwarded-host
  // when trustHost is active in next.config or authConfig)
  let hostname = '';
  try {
    hostname = request.nextUrl.hostname;
  } catch {
    // Fallback: parse from host header manually
    const rawHost = request.headers.get('host') ?? '';
    // In production behind a proxy, prefer x-forwarded-host
    const forwardedHost = request.headers.get('x-forwarded-host');
    const effectiveHost =
      process.env.NODE_ENV === 'production' && forwardedHost
        ? forwardedHost.split(',')[0].trim()
        : rawHost;
    hostname = effectiveHost.split(':')[0].toLowerCase();
  }

  if (!hostname) return null;

  // Reject obviously malformed hostnames (null bytes, path traversal, etc.)
  if (
    hostname.includes('..') ||
    hostname.startsWith('.') ||
    hostname.includes('\0') ||
    hostname.includes('/') ||
    hostname.length > 253
  ) {
    return null;
  }

  // Allow localhost for development
  if (hostname === 'localhost') return hostname;

  // Basic hostname pattern: labels separated by dots, each label [a-z0-9-]
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(hostname)) {
    return null;
  }

  return hostname;
}

/**
 * Determine whether a hostname is the control plane (superadmin) host.
 *
 * @param {string} hostname    Normalized hostname
 * @param {string} baseDomain  e.g. 'edurock.com'
 */
export function isControlPlaneHost(hostname, baseDomain) {
  return (
    hostname === baseDomain ||
    hostname === `admin.${baseDomain}` ||
    hostname === 'localhost' // dev: always treat as control plane
  );
}

/**
 * Core resolver — returns tenant result from cache or DB.
 *
 * @param {string} hostname    Normalized hostname (from extractHostname)
 * @param {string} baseDomain  Value of NEXTAUTH_BASE_DOMAIN env var
 * @returns {Promise<TenantResult|TenantError>}
 */
export async function resolveTenant(hostname, baseDomain) {
  // Check cache first
  const cached = cache.get(hostname);
  if (cached !== undefined) return cached;

  let result;

  const isSubdomain =
  !!baseDomain &&
  hostname.endsWith(`.${baseDomain}`);
  if (isSubdomain) {
    const subdomain = hostname.slice(0, -(baseDomain.length + 1));
    result = await lookupBySubdomain(subdomain);
  } else {
    result = await lookupByCustomDomain(hostname);
  }

  // Cache both hits and misses (misses with short TTL to avoid DB hammering on bots)
  cache.set(hostname, result);
  return result;
}

async function lookupBySubdomain(subdomain) {
  try {
    const { rows } = await query(
      `SELECT id, status, deleted_at
       FROM organizations
       WHERE subdomain = $1
       LIMIT 1`,
      [subdomain]
    );
    if (!rows.length) return { error: 'NOT_FOUND' };
    return buildResult(rows[0]);
  } catch (err) {
    console.error('[TenantResolver] DB error (subdomain lookup):', err.message);
    return { error: 'NOT_FOUND' };
  }
}

async function lookupByCustomDomain(hostname) {
  try {
    const { rows } = await query(
      `SELECT id, status, deleted_at
       FROM organizations
       WHERE custom_domain = $1
         AND domain_verified = true
       LIMIT 1`,
      [hostname]
    );
    if (!rows.length) return { error: 'NOT_FOUND' };
    return buildResult(rows[0]);
  } catch (err) {
    console.error('[TenantResolver] DB error (custom domain lookup):', err.message);
    return { error: 'NOT_FOUND' };
  }
}

function buildResult(org) {
  if (org.deleted_at) return { error: 'DELETED' };
  if (org.status === 'suspended') return { error: 'SUSPENDED' };
  if (org.status !== 'active') return { error: 'SUSPENDED' }; // treat inactive as suspended
  return { orgId: org.id, status: org.status };
}
