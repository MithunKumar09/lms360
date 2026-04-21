/**
 * Token Refresh API Route
 * 
 * Handles token refresh with rotation:
 * - Validates refresh token
 * - Generates new access and refresh tokens
 * - Invalidates old refresh token (rotation)
 * - Updates session in database
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { refreshSession } from '@/lib/auth/sessionManager.js';
import { verifyAccessToken } from '@/lib/auth/tokenManager.js';

/**
 * POST /api/auth/refresh
 * 
 * Request body:
 * {
 *   refreshToken: string (optional - can also be in cookie)
 * }
 * 
 * Refreshes the access token and rotates the refresh token
 */
export async function POST(request) {
  try {
    console.log('🔄 [REFRESH API] ===== REFRESH REQUEST STARTED =====');
    console.log('🔄 [REFRESH API] Request URL:', request.url);
    
    // Get current session (NextAuth session)
    console.log('🔄 [REFRESH API] Getting NextAuth session...');
    const session = await auth();
    console.log('🔄 [REFRESH API] NextAuth session:', session ? {
      userId: session.user?.id,
      email: session.user?.email,
      role: session.user?.role,
      orgId: session.user?.orgId,
      cookiePresent: !!request.cookies.get('next-auth.session-token'),
    } : 'Not found');

    if (!session || !session.user) {
      console.log('🔄 [REFRESH API] ❌ Not authenticated');
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    // FIX #6: VALIDATION - Verify session user exists and matches refresh token
    console.log('🔄 [REFRESH API] Validating session user against database...');
    const { query } = await import('@/lib/db/index.js');
    const userCheck = await query(
      `SELECT id, email, role, org_id, is_active 
       FROM users 
       WHERE id = $1 AND email = $2`,
      [session.user.id, session.user.email]
    );

    if (userCheck.rows.length === 0) {
      console.error('🔄 [REFRESH API] ❌ Session validation failed: User not found', {
        userId: session.user.id,
        email: session.user.email,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid session',
        },
        { status: 401 }
      );
    }

    const dbUser = userCheck.rows[0];

    if (!dbUser.is_active) {
      console.error('🔄 [REFRESH API] ❌ Session validation failed: User is inactive', {
        userId: dbUser.id,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Account is inactive',
        },
        { status: 403 }
      );
    }

    // FIX #6: VALIDATION - Ensure role matches
    if (dbUser.role !== session.user.role) {
      console.error('🔄 [REFRESH API] ❌ Session validation failed: Role mismatch', {
        userId: dbUser.id,
        sessionRole: session.user.role,
        dbRole: dbUser.role,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Session role mismatch',
        },
        { status: 401 }
      );
    }

    // FIX: Use database orgId (source of truth), not session orgId
    // Session orgId might be stale during hot reload
    const dbOrgId = dbUser.org_id;
    console.log('🔄 [REFRESH API] ✅ Session user validated successfully', {
      userId: dbUser.id,
      role: dbUser.role,
      orgId: dbOrgId,
      sessionOrgId: session.user.orgId,
    });

    // Get refresh token from body or cookie
    console.log('🔄 [REFRESH API] Getting refresh token...');
    const body = await request.json().catch(() => ({}));
    const refreshTokenFromBody = body.refreshToken;
    const refreshTokenFromCookie = request.cookies.get('refresh-token')?.value;
    console.log('🔄 [REFRESH API] Refresh token from body:', refreshTokenFromBody ? 'Present' : 'Missing');
    console.log('🔄 [REFRESH API] Refresh token from cookie:', refreshTokenFromCookie ? 'Present' : 'Missing');

    const oldRefreshToken = refreshTokenFromBody || refreshTokenFromCookie;
    console.log('🔄 [REFRESH API] Using refresh token:', oldRefreshToken ? 'Present' : 'Missing');

    if (!oldRefreshToken) {
      console.log('🔄 [REFRESH API] ❌ Refresh token is required');
      return NextResponse.json(
        {
          success: false,
          error: 'Refresh token is required',
        },
        { status: 400 }
      );
    }

    // Get IP address and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    console.log('🔄 [REFRESH API] IP address:', ipAddress);

    // Refresh session using session manager (handles token rotation)
    // CRITICAL: Use database values (source of truth), not session values
    console.log('🔄 [REFRESH API] Calling refreshSession with database values...');
    const newSession = await refreshSession({
      oldRefreshToken,
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
      ipAddress,
      userAgent,
      userData: {
        orgId: dbOrgId, // CRITICAL: Use database orgId, not session orgId
        isActive: dbUser.is_active,
        mfaEnabled: session.user.mfaEnabled || false, // Keep session value for MFA state
        mfaVerified: session.user.mfaVerified || false, // Keep session value for MFA state
      },
    });
    console.log('🔄 [REFRESH API] ✅ Session refreshed:', {
      sessionId: newSession.sessionId,
      expiresAt: newSession.expiresAt
    });

    // Create response with new tokens
    const response = NextResponse.json(
      {
        success: true,
        message: 'Token refreshed successfully',
        accessToken: newSession.accessToken,
        refreshToken: newSession.refreshToken,
        expiresAt: newSession.expiresAt,
      },
      { status: 200 }
    );

    // Set new refresh token in httpOnly cookie (secure storage)
    const expiresAt = new Date(newSession.expiresAt);
    console.log('🔄 [REFRESH API] Setting new refresh token cookie...', {
      expiresAt: expiresAt.toISOString(),
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    response.cookies.set('refresh-token', newSession.refreshToken, {
      httpOnly: true, // Prevent XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // CSRF protection
      path: '/',
      expires: expiresAt,
      // Domain can be set if needed for subdomain support
      // domain: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : undefined,
    });
    console.log('🔄 [REFRESH API] ✅ New refresh token cookie set');
    console.log('🔄 [REFRESH API] ✅ ===== REFRESH SUCCESSFUL =====');

    return response;
  } catch (error) {
    console.error('🔄 [REFRESH API] ❌ ===== REFRESH ERROR =====');
    console.error('🔄 [REFRESH API] ❌ Error message:', error.message);
    console.error('🔄 [REFRESH API] ❌ Error stack:', error.stack);
    console.error('🔄 [REFRESH API] ❌ Error details:', error);

    // Check for specific error types
    if (error.message === 'Invalid refresh token') {
      console.log('🔄 [REFRESH API] ❌ Invalid or expired refresh token');
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid or expired refresh token',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to refresh token',
      },
      { status: 500 }
    );
  }
}

