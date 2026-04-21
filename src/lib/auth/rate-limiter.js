/**
 * Rate Limiter for Authentication
 * 
 * Implements rate limiting for login attempts to prevent brute force attacks.
 * - Max 5 failed attempts per email per 15 minutes
 * - Max 10 failed attempts per IP per 15 minutes
 * - Account lockout after max attempts
 */

import { query } from '../db/index.js';

export const MAX_ATTEMPTS_PER_EMAIL = 5;
export const MAX_ATTEMPTS_PER_IP = 10;
export const TIME_WINDOW_MINUTES = 15;
export const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Record a login attempt
 * @param {string} email - User email
 * @param {string} ipAddress - IP address
 * @param {boolean} success - Whether login was successful
 * @param {string} failureReason - Reason for failure (if failed)
 */
export async function recordLoginAttempt(email, ipAddress, success, failureReason = null) {
  try {
    await query(
      `INSERT INTO login_attempts (email, ip_address, success, failure_reason)
       VALUES ($1, $2, $3, $4)`,
      [email, ipAddress, success, failureReason]
    );
  } catch (error) {
    console.error('Error recording login attempt:', error);
    // Don't throw - logging failures shouldn't block login
  }
}

/**
 * Check if account is locked due to too many failed attempts
 * @param {string} email - User email
 * @returns {Promise<Object>} Lock status with isLocked, unlockTime, attempts
 */
export async function checkAccountLock(email) {
  try {
    const timeWindow = new Date();
    timeWindow.setMinutes(timeWindow.getMinutes() - TIME_WINDOW_MINUTES);

    // Get failed attempts in the time window
    const result = await query(
      `SELECT COUNT(*) as count, MAX(attempted_at) as last_attempt
       FROM login_attempts
       WHERE email = $1
         AND success = false
         AND attempted_at > $2`,
      [email, timeWindow]
    );

    const failedAttempts = parseInt(result.rows[0].count, 10);
    const lastAttempt = result.rows[0].last_attempt;

    if (failedAttempts >= MAX_ATTEMPTS_PER_EMAIL) {
      // Calculate unlock time (15 minutes from last attempt)
      const unlockTime = new Date(lastAttempt);
      unlockTime.setMinutes(unlockTime.getMinutes() + LOCKOUT_DURATION_MINUTES);
      const now = new Date();

      if (unlockTime > now) {
        const minutesRemaining = Math.ceil((unlockTime - now) / (1000 * 60));
        return {
          isLocked: true,
          unlockTime: unlockTime.toISOString(),
          minutesRemaining,
          attempts: failedAttempts,
        };
      }
    }

    return {
      isLocked: false,
      attempts: failedAttempts,
      remainingAttempts: MAX_ATTEMPTS_PER_EMAIL - failedAttempts,
    };
  } catch (error) {
    console.error('Error checking account lock:', error);
    // On error, don't lock account (fail open for availability)
    return { isLocked: false, attempts: 0, remainingAttempts: MAX_ATTEMPTS_PER_EMAIL };
  }
}

/**
 * Check if IP address is rate limited
 * @param {string} ipAddress - IP address
 * @returns {Promise<Object>} Rate limit status
 */
export async function checkIpRateLimit(ipAddress) {
  try {
    const timeWindow = new Date();
    timeWindow.setMinutes(timeWindow.getMinutes() - TIME_WINDOW_MINUTES);

    // Get failed attempts from this IP in the time window
    const result = await query(
      `SELECT COUNT(*) as count
       FROM login_attempts
       WHERE ip_address = $1
         AND success = false
         AND attempted_at > $2`,
      [ipAddress, timeWindow]
    );

    const failedAttempts = parseInt(result.rows[0].count, 10);

    if (failedAttempts >= MAX_ATTEMPTS_PER_IP) {
      return {
        isRateLimited: true,
        attempts: failedAttempts,
        message: `Too many login attempts from this IP. Please try again later.`,
      };
    }

    return {
      isRateLimited: false,
      attempts: failedAttempts,
      remainingAttempts: MAX_ATTEMPTS_PER_IP - failedAttempts,
    };
  } catch (error) {
    console.error('Error checking IP rate limit:', error);
    // On error, don't rate limit (fail open)
    return { isRateLimited: false, attempts: 0, remainingAttempts: MAX_ATTEMPTS_PER_IP };
  }
}

/**
 * Cleanup old login attempts (older than 24 hours)
 * This should be run periodically (e.g., via cron job)
 */
export async function cleanupOldAttempts() {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);

    const result = await query(
      `DELETE FROM login_attempts WHERE attempted_at < $1`,
      [cutoffTime]
    );

    return {
      deleted: result.rowCount,
      success: true,
    };
  } catch (error) {
    console.error('Error cleaning up old login attempts:', error);
    return {
      deleted: 0,
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get login attempt statistics for an email
 * @param {string} email - User email
 * @returns {Promise<Object>} Statistics
 */
export async function getLoginAttemptStats(email) {
  try {
    const timeWindow = new Date();
    timeWindow.setMinutes(timeWindow.getMinutes() - TIME_WINDOW_MINUTES);

    const result = await query(
      `SELECT 
         COUNT(*) FILTER (WHERE success = false) as failed_count,
         COUNT(*) FILTER (WHERE success = true) as success_count,
         MAX(attempted_at) as last_attempt
       FROM login_attempts
       WHERE email = $1 AND attempted_at > $2`,
      [email, timeWindow]
    );

    return {
      failed: parseInt(result.rows[0].failed_count, 10),
      successful: parseInt(result.rows[0].success_count, 10),
      lastAttempt: result.rows[0].last_attempt,
    };
  } catch (error) {
    console.error('Error getting login attempt stats:', error);
    return { failed: 0, successful: 0, lastAttempt: null };
  }
}

export default {
  recordLoginAttempt,
  checkAccountLock,
  checkIpRateLimit,
  cleanupOldAttempts,
  getLoginAttemptStats,
};

