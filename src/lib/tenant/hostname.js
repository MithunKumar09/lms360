/**
 * Edge-safe hostname utilities
 *
 * Pure string / URL functions with zero imports.
 * Safe to import from middleware (Edge Runtime).
 *
 * DB-backed tenant resolution lives in src/lib/tenant/resolver.js and must
 * NOT be imported from middleware.
 *
 * Functions are extracted verbatim from resolver.js so behavior is identical.
 */

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
  /**
   * IMPORTANT:
   * In local subdomain development
   * (school.localhost, college.localhost),
   * request.nextUrl.hostname may collapse incorrectly.
   *
   * We must prefer raw host header first.
   */
  const rawHost = request.headers.get('host') ?? '';
  const forwardedHost = request.headers.get('x-forwarded-host');

  const effectiveHost =
    process.env.NODE_ENV === 'production' && forwardedHost
      ? forwardedHost.split(',')[0].trim()
      : rawHost;

  hostname = effectiveHost.split(':')[0].toLowerCase();

  /**
   * Fallback only if host header missing
   */
  if (!hostname) {
    hostname = request.nextUrl.hostname;
  }
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

  console.log('🛡️ [MIDDLEWARE] Hostname Debug:', {
  rawHost: request.headers.get('host'),
  nextUrlHostname: request.nextUrl.hostname,
  finalHostname: hostname,
});

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
 * @returns {boolean}
 */
export function isControlPlaneHost(hostname, baseDomain) {
  if (!hostname) return true;

  const normalizedHost = hostname.toLowerCase();

  /**
   * LOCAL DEVELOPMENT SUPPORT
   *
   * localhost         → control plane
   * admin.localhost   → control plane
   * *.localhost       → tenant domains
   */
  if (normalizedHost === 'localhost') {
    return true;
  }

  if (normalizedHost === 'admin.localhost') {
    return true;
  }

  if (
    normalizedHost.endsWith('.localhost') &&
    normalizedHost !== 'admin.localhost'
  ) {
    return false;
  }

  /**
   * PRODUCTION SUPPORT
   *
   * edurock.com
   * admin.edurock.com
   */
  return (
    normalizedHost === baseDomain ||
    normalizedHost === `admin.${baseDomain}`
  );
}
