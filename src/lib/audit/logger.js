/**
 * Audit Logger
 * 
 * Utility functions for logging audit events (login, logout, etc.)
 */

import { query } from '@/lib/db/index.js';
import { getClientIp } from '@/lib/auth/validation.js';

/**
 * Log an audit event
 * @param {Object} params - Event parameters
 * @param {string} params.userId - User ID
 * @param {string} params.userEmail - User email
 * @param {string} params.userRole - User role
 * @param {string|null} params.orgId - Organization ID (null for superadmin)
 * @param {string} params.eventType - Event type ('login', 'logout', etc.)
 * @param {Object} params.request - Request object (for IP address and user agent)
 * @param {string|null} params.sessionId - Session ID
 * @param {Object|null} params.metadata - Additional metadata
 */
export async function logAuditEvent({
  userId,
  userEmail,
  userRole,
  orgId = null,
  eventType,
  request = null,
  sessionId = null,
  metadata = null,
}) {
  try {
    // Get IP address and user agent from request if available
    let ipAddress = null;
    let userAgent = null;
    
    if (request) {
      ipAddress = getClientIp(request);
      userAgent = request.headers.get('user-agent') || null;
      
      // Limit user agent length
      if (userAgent && userAgent.length > 500) {
        userAgent = userAgent.substring(0, 500);
      }
    }

    // Insert audit log
    // Note: Using auth_audit_logs table (not audit_logs) - see migration 002_create_audit_logs.sql
    const result = await query(
      `INSERT INTO auth_audit_logs (
        user_id,
        user_email,
        user_role,
        org_id,
        event_type,
        event_time,
        ip_address,
        user_agent,
        session_id,
        metadata
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7, $8, $9)
      RETURNING id`,
      [
        userId,
        userEmail,
        userRole,
        orgId,
        eventType,
        ipAddress,
        userAgent,
        sessionId,
        metadata ? JSON.stringify(metadata) : null,
      ]
    );

    return result.rows[0]?.id || null;
  } catch (error) {
    // Log error but don't throw - audit logging should never break the main flow
    console.error('Error logging audit event:', error);
    return null;
  }
}

/**
 * Log a login event
 */
export async function logLoginEvent({ userId, userEmail, userRole, orgId, request, sessionId, metadata }) {
  return await logAuditEvent({
    userId,
    userEmail,
    userRole,
    orgId,
    eventType: 'login',
    request,
    sessionId,
    metadata,
  });
}

/**
 * Log a logout event
 */
export async function logLogoutEvent({ userId, userEmail, userRole, orgId, request, sessionId, metadata }) {
  return await logAuditEvent({
    userId,
    userEmail,
    userRole,
    orgId,
    eventType: 'logout',
    request,
    sessionId,
    metadata,
  });
}

