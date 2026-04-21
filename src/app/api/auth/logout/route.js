/**
 * Logout API Route
 * 
 * Handles user logout:
 * - Invalidates session token
 * - Clears session from database
 * - Clears cookies
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { deleteAllUserSessions } from '@/lib/auth/sessionManager.js';
import { logLogoutEvent } from '@/lib/audit/logger.js';

/**
 * POST /api/auth/logout
 * 
 * Logs out the current user and invalidates their session
 */
export async function POST(request) {
  try {
    // Get current session
    const session = await auth();
    let sessionId = null;

    if (session?.user?.id) {
      // Log logout event before deleting sessions
      try {
        // Get session ID from database if available
        const sessionResult = await query(
          `SELECT id FROM user_sessions WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP ORDER BY created_at DESC LIMIT 1`,
          [session.user.id]
        );
        if (sessionResult.rows.length > 0) {
          sessionId = sessionResult.rows[0].id;
        }

        await logLogoutEvent({
          userId: session.user.id,
          userEmail: session.user.email,
          userRole: session.user.role,
          orgId: session.user.orgId || null,
          request,
          sessionId,
          metadata: null,
        });
        console.log('✅ Logout event logged to audit logs');
      } catch (auditError) {
        // Don't fail logout if audit logging fails
        console.error('⚠️ Failed to log logout event:', auditError);
      }

      // Delete all sessions for user (invalidate all tokens)
      try {
        const deletedCount = await deleteAllUserSessions(session.user.id);
        console.log(`Deleted ${deletedCount} sessions for user ${session.user.id}`);
      } catch (error) {
        console.error('Error deleting user sessions:', error);
        // Continue with logout even if session deletion fails
      }
    }

    // Note: We're using custom session management, so we don't need NextAuth signOut
    // Custom session cleanup is handled by deleteAllUserSessions

    // Create response with cleared cookies
    const response = NextResponse.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      { status: 200 }
    );

    // Get current domain and path for proper cookie deletion
    const requestUrl = new URL(request.url);
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = requestUrl.protocol === 'https:' || isProduction;

    // Helper function to clear cookie - MUST match exact attributes used during login
    // Login sets cookies WITHOUT domain, so we must clear them WITHOUT domain too
    const clearCookie = (name, options = {}) => {
      // Base cookie options matching how cookies are set during login
      const baseCookieOptions = {
        path: '/',
        httpOnly: options.httpOnly !== false,
        sameSite: 'lax',
        secure: isSecure,
        maxAge: 0,
        expires: new Date(0), // Set to epoch time to ensure deletion
        // CRITICAL: Do NOT set domain - cookies are set without domain during login
        // Setting domain here would prevent cookie deletion in production
        ...options,
      };

      // Clear cookie with exact same attributes as login (NO domain)
      response.cookies.set(name, '', baseCookieOptions);

      // For __Host- prefixed cookies, ensure no domain and secure flag
      if (name.startsWith('__Host-')) {
        response.cookies.set(name, '', {
          ...baseCookieOptions,
          secure: true,
          path: '/',
          // __Host- cookies cannot have domain attribute
        });
      }

      // For __Secure- prefixed cookies, ensure secure flag
      if (name.startsWith('__Secure-')) {
        response.cookies.set(name, '', {
          ...baseCookieOptions,
          secure: true,
        });
      }
    };

    // Clear all session cookie variations
    // CRITICAL: Must match exact attributes used during login (NO domain)
    clearCookie('next-auth.session-token');
    clearCookie('__Secure-next-auth.session-token');
    clearCookie('next-auth.csrf-token');
    clearCookie('__Host-next-auth.csrf-token');
    
    // Clear refresh token cookie (matches login: httpOnly, secure, sameSite: 'lax', path: '/', NO domain)
    clearCookie('refresh-token', { httpOnly: true });

    // Also explicitly delete using delete method as fallback
    // Note: delete() method doesn't require matching attributes, but set() does
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    response.cookies.delete('next-auth.csrf-token');
    response.cookies.delete('__Host-next-auth.csrf-token');
    response.cookies.delete('refresh-token');

    console.log('✅ [LOGOUT API] All cookies cleared (production-safe, no domain attribute)');

    return response;
  } catch (error) {
    console.error('Logout API error:', error);

    // Even on error, try to clear cookies
    const response = NextResponse.json(
      {
        success: false,
        error: 'An error occurred during logout',
      },
      { status: 500 }
    );

    // Get current domain and path for proper cookie deletion
    const requestUrl = new URL(request.url);
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = requestUrl.protocol === 'https:' || isProduction;

    // Helper function to clear cookie - MUST match exact attributes used during login
    // Login sets cookies WITHOUT domain, so we must clear them WITHOUT domain too
    const clearCookie = (name, options = {}) => {
      // Base cookie options matching how cookies are set during login
      const baseCookieOptions = {
        path: '/',
        httpOnly: options.httpOnly !== false,
        sameSite: 'lax',
        secure: isSecure,
        maxAge: 0,
        expires: new Date(0),
        // CRITICAL: Do NOT set domain - cookies are set without domain during login
        // Setting domain here would prevent cookie deletion in production
        ...options,
      };

      // Clear cookie with exact same attributes as login (NO domain)
      response.cookies.set(name, '', baseCookieOptions);

      // For __Host- prefixed cookies, ensure no domain and secure flag
      if (name.startsWith('__Host-')) {
        response.cookies.set(name, '', {
          ...baseCookieOptions,
          secure: true,
          path: '/',
          // __Host- cookies cannot have domain attribute
        });
      }

      // For __Secure- prefixed cookies, ensure secure flag
      if (name.startsWith('__Secure-')) {
        response.cookies.set(name, '', {
          ...baseCookieOptions,
          secure: true,
        });
      }
    };

    // Clear all cookies on error as well (production-safe, no domain attribute)
    clearCookie('next-auth.session-token');
    clearCookie('__Secure-next-auth.session-token');
    clearCookie('next-auth.csrf-token');
    clearCookie('__Host-next-auth.csrf-token');
    clearCookie('refresh-token', { httpOnly: true });

    // Also explicitly delete using delete method as fallback
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    response.cookies.delete('next-auth.csrf-token');
    response.cookies.delete('__Host-next-auth.csrf-token');
    response.cookies.delete('refresh-token');

    console.log('✅ [LOGOUT API] Cookies cleared on error (production-safe, no domain attribute)');

    return response;
  }
}

/**
 * GET /api/auth/logout
 * 
 * Alternative logout endpoint (redirects to login)
 */
export async function GET(request) {
  return POST(request);
}

