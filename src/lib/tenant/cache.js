/**
 * Tenant Resolver In-Memory Cache
 *
 * Caches hostname → tenant resolution results with a 60-second TTL.
 * Prevents a DB round-trip on every middleware invocation.
 *
 * The cache is module-level (survives across requests in the same Node.js
 * process). In serverless/edge deployments each instance has its own cache —
 * that is acceptable: a cold lookup simply hits the DB once per instance.
 *
 * Exposed API:
 *   get(hostname)           → cached result or undefined
 *   set(hostname, result)   → stores with TTL
 *   invalidate(hostname)    → removes one entry (call on org suspend/delete)
 *   invalidateByOrgId(id)   → removes all entries for an org (subdomain + custom domain)
 *   clear()                 → full flush (testing / emergency)
 */

const CACHE_TTL_MS = 60_000; // 60 seconds

// Map<hostname, { result: TenantResult, expiresAt: number }>
const store = new Map();

// Reverse map: orgId → Set<hostname> — needed for invalidateByOrgId
const orgToHostnames = new Map();

/**
 * @typedef {{ orgId: string, status: string }} TenantResult
 * @typedef {{ error: 'NOT_FOUND' | 'SUSPENDED' | 'DELETED' }} TenantError
 */

export function get(hostname) {
  const entry = store.get(hostname);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(hostname);
    return undefined;
  }
  return entry.result;
}

export function set(hostname, result) {
  store.set(hostname, { result, expiresAt: Date.now() + CACHE_TTL_MS });

  // Track orgId → hostname mapping for bulk invalidation
  if (result && result.orgId) {
    if (!orgToHostnames.has(result.orgId)) {
      orgToHostnames.set(result.orgId, new Set());
    }
    orgToHostnames.get(result.orgId).add(hostname);
  }
}

export function invalidate(hostname) {
  const entry = store.get(hostname);
  if (entry?.result?.orgId) {
    const hostnames = orgToHostnames.get(entry.result.orgId);
    if (hostnames) hostnames.delete(hostname);
  }
  store.delete(hostname);
}

export function invalidateByOrgId(orgId) {
  const hostnames = orgToHostnames.get(orgId);
  if (hostnames) {
    for (const hostname of hostnames) {
      store.delete(hostname);
    }
    orgToHostnames.delete(orgId);
  }
}

export function clear() {
  store.clear();
  orgToHostnames.clear();
}
