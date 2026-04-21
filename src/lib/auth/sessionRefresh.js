/**
 * Session Refresh Utility
 * 
 * Handles automatic session refresh when near expiry.
 * Updates last activity timestamp.
 */

import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { updateLastActivity } from './guards.js';

/**
 * Check if session needs refresh
 * 
 * @param {Object} session - Session object
 * @param {number} refreshThresholdMinutes - Minutes before expiry to refresh (default: 30)
 * @returns {boolean} Whether session needs refresh
 */
export function needsRefresh(session, refreshThresholdMinutes = 30) {
  if (!session || !session.expires) {
    return false;
  }

  const expiresAt = new Date(session.expires);
  const now = new Date();
  const thresholdMs = refreshThresholdMinutes * 60 * 1000;
  const timeUntilExpiry = expiresAt.getTime() - now.getTime();

  return timeUntilExpiry < thresholdMs;
}

/**
 * Refresh session if needed
 * 
 * @param {Object} session - Current session
 * @param {number} refreshThresholdMinutes - Minutes before expiry to refresh
 * @returns {Promise<Object|null>} Refreshed session or null
 */
export async function refreshSessionIfNeeded(session, refreshThresholdMinutes = 30) {
  if (!needsRefresh(session, refreshThresholdMinutes)) {
    return session;
  }

  try {
    // Call refresh API endpoint
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        // Get updated session
        const newSession = await auth();
        return newSession;
      }
    }

    return session;
  } catch (error) {
    console.error('Failed to refresh session:', error);
    return session;
  }
}

/**
 * Update session activity
 * 
 * @param {Object} session - Current session
 * @returns {Promise<void>}
 */
export async function updateSessionActivity(session) {
  if (!session || !session.user || !session.user.id) {
    return;
  }

  try {
    await updateLastActivity(session.user.id);
  } catch (error) {
    console.error('Failed to update session activity:', error);
  }
}

export default {
  needsRefresh,
  refreshSessionIfNeeded,
  updateSessionActivity,
};


