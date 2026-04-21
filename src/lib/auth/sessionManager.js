/**
 * Session Manager
 * 
 * Handles session creation, validation, refresh, and cleanup.
 * Manages database sessions and last activity tracking.
 */

import { query, getClient } from '@/lib/db/index.js';
import { generateToken, hashToken, generateAccessToken, generateRefreshToken } from './tokenManager.js';

/**
 * Session Configuration
 */
const SESSION_CONFIG = {
  REFRESH_TOKEN_EXPIRY_DAYS: 7,
  CLEANUP_INTERVAL_HOURS: 24, // Clean up expired sessions every 24 hours
};

/**
 * Create a new session
 * 
 * @param {Object} params - Session parameters
 * @param {string} params.userId - User ID
 * @param {string} params.email - User email
 * @param {string} params.role - User role
 * @param {string} params.ipAddress - IP address
 * @param {string} params.userAgent - User agent
 * @param {Object} params.userData - Additional user data
 * @returns {Promise<Object>} Session with tokens
 */
export async function createSession({
  userId,
  email,
  role,
  ipAddress = 'unknown',
  userAgent = 'unknown',
  userData = {},
}) {
  try {
    console.log('📦 [SESSION] Creating new session...', { userId, email, role, ipAddress });
    
    // Generate tokens
    console.log('📦 [SESSION] Generating access token...');
    const accessToken = await generateAccessToken({
      userId,
      email,
      role,
      orgId: userData.orgId || null,
      isActive: userData.isActive !== false,
      mfaEnabled: userData.mfaEnabled || false,
      mfaVerified: userData.mfaVerified || false,
    });
    console.log('📦 [SESSION] ✅ Access token generated:', accessToken ? 'Present' : 'Missing');

    console.log('📦 [SESSION] Generating refresh token...');
    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    console.log('📦 [SESSION] ✅ Refresh token generated and hashed');

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS);
    console.log('📦 [SESSION] Session expiration:', expiresAt.toISOString());

    // Store session in database
    console.log('📦 [SESSION] Storing session in database...');
    const client = await getClient();
    try {
      await client.query('BEGIN');
      console.log('📦 [SESSION] Database transaction started');

      // Insert session
      const sessionResult = await client.query(
        `INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [
          userId,
          hashToken(accessToken), // Store hashed access token
          refreshTokenHash,
          expiresAt,
          ipAddress,
          userAgent,
        ]
      );

      await client.query('COMMIT');
      console.log('📦 [SESSION] ✅ Session stored in database, transaction committed');

      const session = sessionResult.rows[0];
      console.log('📦 [SESSION] ✅ Session created successfully:', {
        sessionId: session.id,
        createdAt: session.created_at
      });

      return {
        sessionId: session.id,
        accessToken,
        refreshToken,
        expiresAt: expiresAt.toISOString(),
        createdAt: session.created_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('📦 [SESSION] ❌ Database transaction error, rolling back:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('📦 [SESSION] ❌ Error creating session:', error);
    console.error('📦 [SESSION] ❌ Error stack:', error.stack);
    throw new Error('Failed to create session');
  }
}

/**
 * Validate session
 * 
 * @param {string} sessionToken - Session token (hashed)
 * @returns {Promise<Object|null>} Session data or null
 */
export async function validateSession(sessionToken) {
  try {
    const tokenHash = hashToken(sessionToken);
    
    const result = await query(
      `SELECT id, user_id, expires_at, created_at, ip_address, user_agent
       FROM user_sessions
       WHERE session_token = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error validating session:', error);
    return null;
  }
}

/**
 * Validate refresh token
 * 
 * @param {string} refreshToken - Refresh token
 * @returns {Promise<Object|null>} Session data or null
 */
export async function validateRefreshToken(refreshToken) {
  try {
    const tokenHash = hashToken(refreshToken);
    
    const result = await query(
      `SELECT id, user_id, expires_at, created_at, ip_address, user_agent
       FROM user_sessions
       WHERE refresh_token = $1 AND expires_at > CURRENT_TIMESTAMP`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error validating refresh token:', error);
    return null;
  }
}

/**
 * Refresh session (token rotation)
 * 
 * @param {Object} params - Refresh parameters
 * @param {string} params.oldRefreshToken - Old refresh token
 * @param {string} params.userId - User ID
 * @param {string} params.email - User email
 * @param {string} params.role - User role
 * @param {string} params.ipAddress - IP address
 * @param {string} params.userAgent - User agent
 * @param {Object} params.userData - Additional user data
 * @returns {Promise<Object>} New session with tokens
 */
export async function refreshSession({
  oldRefreshToken,
  userId,
  email,
  role,
  ipAddress = 'unknown',
  userAgent = 'unknown',
  userData = {},
}) {
  try {
    console.log('🔄 [REFRESH] Refreshing session...', { userId, email, ipAddress });
    console.log('🔄 [REFRESH] Old refresh token:', oldRefreshToken ? 'Present' : 'Missing');
    
    // Validate old refresh token
    console.log('🔄 [REFRESH] Validating old refresh token...');
    const oldSession = await validateRefreshToken(oldRefreshToken);
    if (!oldSession || oldSession.user_id !== userId) {
      console.log('🔄 [REFRESH] ❌ Invalid refresh token:', {
        oldSession: oldSession ? 'Found' : 'Not found',
        expectedUserId: userId,
        actualUserId: oldSession?.user_id
      });
      throw new Error('Invalid refresh token');
    }
    console.log('🔄 [REFRESH] ✅ Old refresh token validated:', { sessionId: oldSession.id });

    // Generate new tokens
    console.log('🔄 [REFRESH] Generating new tokens...');
    const newAccessToken = await generateAccessToken({
      userId,
      email,
      role,
      orgId: userData.orgId || null,
      isActive: userData.isActive !== false,
      mfaEnabled: userData.mfaEnabled || false,
      mfaVerified: userData.mfaVerified || false,
    });
    console.log('🔄 [REFRESH] ✅ New access token generated');

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);
    console.log('🔄 [REFRESH] ✅ New refresh token generated and hashed');

    // Calculate new expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_CONFIG.REFRESH_TOKEN_EXPIRY_DAYS);
    console.log('🔄 [REFRESH] New expiration:', expiresAt.toISOString());

    // Update session in database (token rotation)
    console.log('🔄 [REFRESH] Rotating tokens in database...');
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Delete old session
      console.log('🔄 [REFRESH] Deleting old session...');
      await client.query(
        `DELETE FROM user_sessions WHERE id = $1`,
        [oldSession.id]
      );
      console.log('🔄 [REFRESH] ✅ Old session deleted');

      // Create new session
      console.log('🔄 [REFRESH] Creating new session...');
      const sessionResult = await client.query(
        `INSERT INTO user_sessions (user_id, session_token, refresh_token, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, created_at`,
        [
          userId,
          hashToken(newAccessToken),
          newRefreshTokenHash,
          expiresAt,
          ipAddress,
          userAgent,
        ]
      );

      await client.query('COMMIT');
      console.log('🔄 [REFRESH] ✅ Token rotation completed');

      const session = sessionResult.rows[0];
      console.log('🔄 [REFRESH] ✅ Session refreshed successfully:', {
        sessionId: session.id,
        expiresAt: expiresAt.toISOString()
      });

      return {
        sessionId: session.id,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: expiresAt.toISOString(),
        createdAt: session.created_at,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('🔄 [REFRESH] ❌ Database transaction error, rolling back:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('🔄 [REFRESH] ❌ Error refreshing session:', error);
    console.error('🔄 [REFRESH] ❌ Error stack:', error.stack);
    throw new Error('Failed to refresh session');
  }
}

/**
 * Delete session
 * 
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} Whether session was deleted
 */
export async function deleteSession(sessionId) {
  try {
    const result = await query(
      `DELETE FROM user_sessions WHERE id = $1`,
      [sessionId]
    );

    return result.rowCount > 0;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

/**
 * Delete all sessions for a user
 * 
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of sessions deleted
 */
export async function deleteAllUserSessions(userId) {
  try {
    const result = await query(
      `DELETE FROM user_sessions WHERE user_id = $1`,
      [userId]
    );

    return result.rowCount || 0;
  } catch (error) {
    console.error('Error deleting user sessions:', error);
    return 0;
  }
}

/**
 * Update last activity for a session
 * 
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} Whether update was successful
 */
export async function updateSessionActivity(sessionId) {
  try {
    // Since we don't have last_activity column, we'll update the session
    // This can be enhanced when the column is added
    await query(
      `UPDATE user_sessions SET expires_at = expires_at WHERE id = $1`,
      [sessionId]
    );

    return true;
  } catch (error) {
    console.error('Error updating session activity:', error);
    return false;
  }
}

/**
 * Clean up expired sessions
 * 
 * @returns {Promise<number>} Number of sessions cleaned up
 */
export async function cleanupExpiredSessions() {
  try {
    const result = await query(
      `DELETE FROM user_sessions WHERE expires_at < CURRENT_TIMESTAMP`
    );

    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
}

/**
 * Get active sessions for a user
 * 
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Active sessions
 */
export async function getUserSessions(userId) {
  try {
    const result = await query(
      `SELECT id, created_at, expires_at, ip_address, user_agent
       FROM user_sessions
       WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
}

export default {
  createSession,
  validateSession,
  validateRefreshToken,
  refreshSession,
  deleteSession,
  deleteAllUserSessions,
  updateSessionActivity,
  cleanupExpiredSessions,
  getUserSessions,
  SESSION_CONFIG,
};


