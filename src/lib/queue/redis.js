/**
 * Redis Connection Configuration for BullMQ
 * 
 * Provides Redis connection for job queues.
 * Falls back to in-memory queue if Redis is not available (development).
 */

import Redis from 'ioredis';
import dotenv from 'dotenv';
import { existsSync } from 'fs';

// Load environment variables
if (existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else if (existsSync('.env')) {
  dotenv.config({ path: '.env' });
} else {
  dotenv.config();
}

let redisClient = null;

/**
 * Get Redis connection
 * @returns {Redis|null} Redis client or null if not configured
 */
export function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD;
  const redisDb = parseInt(process.env.REDIS_DB || '0', 10);

  // If REDIS_URL is provided, use it
  if (redisUrl) {
    try {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        enableReadyCheck: true,
        lazyConnect: true,
      });
      return redisClient;
    } catch (error) {
      console.error('Failed to create Redis client from URL:', error);
      return null;
    }
  }

  // Otherwise, use individual config (only if host is explicitly set)
  if (redisHost && redisHost !== 'localhost' || process.env.REDIS_ENABLED === 'true') {
    try {
      redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword || undefined,
        db: redisDb,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        enableReadyCheck: true,
        lazyConnect: true,
      });
      return redisClient;
    } catch (error) {
      console.error('Failed to create Redis client:', error);
      return null;
    }
  }

  // No Redis configured - return null (will use fallback)
  return null;
}

/**
 * Check if Redis is available
 * @returns {Promise<boolean>}
 */
export async function isRedisAvailable() {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    await client.ping();
    return true;
  } catch (error) {
    console.warn('Redis not available:', error.message);
    return false;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export default {
  getRedisClient,
  isRedisAvailable,
  closeRedis,
};
