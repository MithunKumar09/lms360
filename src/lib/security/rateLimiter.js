/**
 * Enhanced Rate Limiter
 * 
 * Provides rate limiting for API endpoints with Redis-like in-memory storage.
 */

import { query } from '@/lib/db/index.js';

const RATE_LIMITS = {
  invitation: {
    maxRequests: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  passwordReset: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  bulkOperation: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
};

// In-memory rate limit store (for production, use Redis)
const rateLimitStore = new Map();

/**
 * Clean up old rate limit entries
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.expiresAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

/**
 * Check rate limit
 * @param {string} identifier - Unique identifier (email, IP, user ID)
 * @param {string} type - Rate limit type
 * @returns {Object} Rate limit check result
 */
export function checkRateLimit(identifier, type = 'api') {
  const config = RATE_LIMITS[type] || RATE_LIMITS.api;
  const key = `${type}:${identifier}`;
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || entry.expiresAt < now) {
    // Create new entry
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
      expiresAt: now + config.windowMs + 60000, // Keep for 1 minute after expiry
    };
    rateLimitStore.set(key, entry);
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: entry.resetAt,
    };
  }
  
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }
  
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Get client identifier from request
 * @param {Request} request - Next.js request object
 * @param {string} userId - User ID (optional)
 * @returns {string} Identifier
 */
export function getClientIdentifier(request, userId = null) {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Try to get IP from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Rate limit middleware
 * @param {Request} request - Next.js request object
 * @param {string} type - Rate limit type
 * @param {string} userId - User ID or email (optional)
 * @returns {Object} Rate limit check result
 */
export function rateLimit(request, type = 'api', userId = null) {
  const identifier = getClientIdentifier(request, userId);
  return checkRateLimit(identifier, type);
}

/**
 * Rate limit error class
 */
export class RateLimitError extends Error {
  constructor(retryAfter = null) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    this.statusCode = 429;
  }
}

