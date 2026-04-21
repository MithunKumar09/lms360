/**
 * Redis Cache Key Namespace Utility
 *
 * All Redis keys that store per-tenant data MUST be prefixed with the
 * tenant namespace to prevent cross-tenant data leakage.
 *
 * Usage:
 *   import { tenantCacheKey, globalCacheKey } from '@/lib/cache/tenantCache.js';
 *
 *   const key = tenantCacheKey(orgId, 'vendor-balance', vendorId);
 *   // → 'tenant:abc-uuid:vendor-balance:xyz-uuid'
 *
 *   const globalKey = globalCacheKey('analytics', 'daily', date);
 *   // → 'global:analytics:daily:2026-04-12'
 *
 * Also provides TTL-safe helper wrappers for Redis get/set operations that
 * automatically apply the correct namespace.
 *
 * NOTE: This module does NOT own a Redis connection — it works with the
 * existing ioredis client from @/lib/queue/redis.js.
 */

/**
 * Build a tenant-scoped Redis key.
 * @param {string} orgId - UUID of the organization
 * @param {...string} parts - key path segments
 * @returns {string} Namespaced key: 'tenant:{orgId}:{parts.join(":")}'
 */
export function tenantCacheKey(orgId, ...parts) {
  if (!orgId) {
    throw new Error('tenantCacheKey: orgId is required. Use globalCacheKey for platform-level keys.');
  }
  return `tenant:${orgId}:${parts.join(':')}`;
}

/**
 * Build a global (non-tenant-scoped) Redis key.
 * @param {...string} parts - key path segments
 * @returns {string} Namespaced key: 'global:{parts.join(":")}'
 */
export function globalCacheKey(...parts) {
  return `global:${parts.join(':')}`;
}

/**
 * Build a Redis pattern for scanning/deleting all keys for a given org.
 * Use with Redis SCAN + DEL when purging tenant data on deletion.
 * @param {string} orgId
 * @returns {string} Pattern: 'tenant:{orgId}:*'
 */
export function tenantCachePattern(orgId) {
  return `tenant:${orgId}:*`;
}

/**
 * Delete all Redis cache entries for an org (e.g., on soft delete or suspension).
 * Uses SCAN to avoid blocking the Redis event loop with KEYS.
 *
 * @param {import('ioredis').Redis} redis - Redis client instance
 * @param {string} orgId
 * @returns {Promise<number>} Number of keys deleted
 */
export async function purgeTenantCache(redis, orgId) {
  if (!redis || !orgId) return 0;

  const pattern = tenantCachePattern(orgId);
  let cursor = '0';
  let deleted = 0;

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = nextCursor;

    if (keys.length > 0) {
      await redis.del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== '0');

  return deleted;
}

/**
 * Convenience: get a cached value (returns null on miss or parse error).
 *
 * @param {import('ioredis').Redis} redis
 * @param {string} key - full namespaced key
 * @returns {Promise<any|null>}
 */
export async function cacheGet(redis, key) {
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

/**
 * Convenience: set a cached value with TTL.
 *
 * @param {import('ioredis').Redis} redis
 * @param {string} key - full namespaced key
 * @param {any} value - will be JSON.stringify'd
 * @param {number} ttlSeconds - expiry in seconds (default: 300 = 5 minutes)
 */
export async function cacheSet(redis, key, value, ttlSeconds = 300) {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

/**
 * Convenience: delete a cached value.
 *
 * @param {import('ioredis').Redis} redis
 * @param {string} key - full namespaced key
 */
export async function cacheDel(redis, key) {
  await redis.del(key);
}
