/**
 * Simple in-memory rate limiter (per identifier)
 * For production use Redis (e.g., Upstash). This is dev-only best-effort.
 */

const buckets = new Map();

export function checkRate(identifier, limit, windowMs) {
	const now = Date.now();
	const bucket = buckets.get(identifier);
	if (!bucket || now - bucket.start > windowMs) {
		buckets.set(identifier, { start: now, count: 1 });
		return { allowed: true, remaining: limit - 1 };
	}
	if (bucket.count >= limit) {
		return { allowed: false, remaining: 0 };
	}
	bucket.count += 1;
	return { allowed: true, remaining: limit - bucket.count };
}

// Note: default export consolidated at the bottom.

/**
 * API Rate Limiter
 * 
 * Simple in-memory rate limiter for API routes.
 * For production, use Upstash Redis or similar distributed rate limiting service.
 * 
 * @module api/rateLimiter
 */

// In-memory rate limit store (use Upstash Redis for production)
const rateLimitStore = new Map();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.firstRequest > value.windowMs) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // 5 minutes

/**
 * Check rate limit for identifier (user ID or IP address)
 * 
 * @param {string} identifier - Unique identifier (user ID, IP address, or userID:ipAddress)
 * @param {Object} [options] - Rate limit options
 * @param {number} [options.maxRequests=10] - Maximum requests allowed
 * @param {number} [options.windowMs=60*1000] - Time window in milliseconds (default: 1 minute)
 * @returns {Object} Rate limit status
 */
export function checkRateLimit(identifier, options = {}) {
  const {
    maxRequests = 10,
    windowMs = 60 * 1000, // 1 minute default
  } = options;

  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now - record.firstRequest > windowMs) {
    // New window or expired window
    rateLimitStore.set(identifier, {
      count: 1,
      firstRequest: now,
      windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }

  if (record.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.firstRequest + windowMs,
      retryAfter: Math.ceil((record.firstRequest + windowMs - now) / 1000), // seconds
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.firstRequest + windowMs,
  };
}

/**
 * Check rate limit for user and IP (combined)
 * 
 * @param {string} userId - User ID
 * @param {string} ipAddress - IP address
 * @param {Object} [options] - Rate limit options
 * @returns {Object} Rate limit status
 */
export function checkUserIpRateLimit(userId, ipAddress, options = {}) {
  // Check both user-specific and IP-specific limits
  const userLimit = checkRateLimit(`user:${userId}`, options);
  const ipLimit = checkRateLimit(`ip:${ipAddress}`, options);

  // Allow if both are under limit
  if (userLimit.allowed && ipLimit.allowed) {
    return {
      allowed: true,
      remaining: Math.min(userLimit.remaining, ipLimit.remaining),
      resetAt: Math.max(userLimit.resetAt, ipLimit.resetAt),
    };
  }

  // Return most restrictive limit
  return {
    allowed: false,
    remaining: 0,
    resetAt: userLimit.resetAt < ipLimit.resetAt ? userLimit.resetAt : ipLimit.resetAt,
    retryAfter: userLimit.retryAfter || ipLimit.retryAfter || 60,
    reason: !userLimit.allowed ? 'User rate limit exceeded' : 'IP rate limit exceeded',
  };
}

/**
 * Clear rate limit for identifier (for testing or manual reset)
 * 
 * @param {string} identifier - Identifier to clear
 */
export function clearRateLimit(identifier) {
  rateLimitStore.delete(identifier);
}

/**
 * Clear all rate limits (for testing)
 */
export function clearAllRateLimits() {
  rateLimitStore.clear();
}

/**
 * Get rate limit stats for identifier (for debugging)
 * 
 * @param {string} identifier - Identifier to check
 * @returns {Object|null} Rate limit stats or null if not found
 */
export function getRateLimitStats(identifier) {
  const record = rateLimitStore.get(identifier);
  if (!record) {
    return null;
  }

  const now = Date.now();
  const timeRemaining = record.firstRequest + record.windowMs - now;

  return {
    count: record.count,
    firstRequest: new Date(record.firstRequest).toISOString(),
    windowMs: record.windowMs,
    timeRemaining: Math.max(0, timeRemaining),
    resetAt: new Date(record.firstRequest + record.windowMs).toISOString(),
  };
}

export default {
  checkRate,
  checkRateLimit,
  checkUserIpRateLimit,
  clearRateLimit,
  clearAllRateLimits,
  getRateLimitStats,
};

