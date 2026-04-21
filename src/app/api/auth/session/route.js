/**
 * Session API Route
 * 
 * Returns current session information
 * GET /api/auth/session
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';

/**
 * GET /api/auth/session
 * 
 * Returns current session information (without sensitive data)
 * 
 * FIX #1: Added session validation against database to prevent wrong user data
 */
export async function GET(request) {
  try {
    // console.log('👤 [SESSION API] ===== SESSION REQUEST STARTED =====');
    // console.log('👤 [SESSION API] Request URL:', request.url);
    // console.log('👤 [SESSION API] Cookie present:', !!request.cookies.get('next-auth.session-token'));
    
    // console.log('👤 [SESSION API] Getting NextAuth session...');
    const session = await auth();
    // console.log('👤 [SESSION API] NextAuth session:', session ? {
    //   userId: session.user?.id,
    //   email: session.user?.email,
    //   role: session.user?.role,
    //   orgId: session.user?.orgId,
    //   expires: session.expires,
    //   cookiePresent: !!request.cookies.get('next-auth.session-token'),
    // } : 'Not found');

    if (!session || !session.user) {
      // console.log('👤 [SESSION API] ⚠️ No session found');
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
        },
        { status: 200 }
      );
    }

    // FIX #1: VALIDATION - Verify session user exists in database and matches
    // console.log('👤 [SESSION API] Validating session against database...');
    const { query } = await import('@/lib/db/index.js');
    const userCheck = await query(
      `SELECT id, email, role, org_id, is_active, mfa_enabled, mfa_verified 
       FROM users 
       WHERE id = $1 AND email = $2`,
      [session.user.id, session.user.email]
    );

    if (userCheck.rows.length === 0) {
      // Session user doesn't exist or doesn't match - invalid session
      console.error('👤 [SESSION API] ❌ Session validation failed: User not found in database', {
        sessionUserId: session.user.id,
        sessionEmail: session.user.email,
      });
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          error: 'Invalid session',
        },
        { status: 200 }
      );
    }

    const dbUser = userCheck.rows[0];
    
    // FIX #1: VALIDATION - Only reject on role mismatch (security violation)
    // orgId can change legitimately (org deleted, user reassigned) - use database value
    if (dbUser.role !== session.user.role) {
      // Role mismatch is a security violation - reject session
      console.error('👤 [SESSION API] ❌ Session validation failed: Role mismatch', {
        sessionUserId: session.user.id,
        sessionRole: session.user.role,
        dbRole: dbUser.role,
      });
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          error: 'Session role mismatch',
        },
        { status: 200 }
      );
    }

    // FIX: orgId validation - database is source of truth
    // Standardize: use only orgId (camelCase) in session, org_id (snake_case) in database
    const sessionOrgId = session.user.orgId; // Only use orgId, not org_id
    const dbOrgId = dbUser.org_id;
    
    // Log if different, but use database value (source of truth)
    if (sessionOrgId !== dbOrgId) {
      if (dbOrgId !== null) {
        console.warn('👤 [SESSION API] ⚠️ Session orgId updated from database', {
          userId: dbUser.id,
          oldOrgId: sessionOrgId,
          newOrgId: dbOrgId,
          reason: 'Database is source of truth - updating session',
        });
      } else if (dbOrgId === null && sessionOrgId !== null && dbUser.role !== 'superadmin') {
        // Database has null but session has orgId - only clear if not superadmin
        console.warn('👤 [SESSION API] ⚠️ Organization removed from database', {
          userId: dbUser.id,
          oldOrgId: sessionOrgId,
          userRole: dbUser.role,
          reason: 'Organization deleted or user reassigned',
        });
      }
      // Continue - will use database value below
    }

    // Check if user is active
    if (!dbUser.is_active) {
      console.error('👤 [SESSION API] ❌ Session validation failed: User is inactive', {
        userId: dbUser.id,
      });
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
          error: 'Account is inactive',
        },
        { status: 200 }
      );
    }

    // Return validated session data (use database values for consistency)
    // console.log('👤 [SESSION API] ✅ Session validated successfully');
    const sessionData = {
      authenticated: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        orgId: dbOrgId,
        isActive: dbUser.is_active,
        mfaEnabled: dbUser.mfa_enabled,
        mfaVerified: dbUser.mfa_verified || false,
      },
      session: {
        expires: session.expires,
      },
    };
    // console.log('👤 [SESSION API] ✅ ===== SESSION REQUEST SUCCESSFUL =====');
    return NextResponse.json(sessionData, { status: 200 });
  } catch (error) {
    console.error('👤 [SESSION API] ❌ ===== SESSION ERROR =====');
    console.error('👤 [SESSION API] ❌ Error message:', error.message);
    console.error('👤 [SESSION API] ❌ Error stack:', error.stack);

    return NextResponse.json(
      {
        authenticated: false,
        error: 'Failed to get session',
      },
      { status: 500 }
    );
  }
}


