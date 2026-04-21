/**
 * MFA Verify Setup API Route
 * 
 * Verifies TOTP code during MFA setup.
 * Once verified, marks MFA as enabled and generates backup codes.
 * POST /api/auth/mfa/verify-setup
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { query, getClient } from '@/lib/db/index.js';
import {
  verifyTotp,
  decryptSecret,
} from '@/lib/mfa/totp.js';
import {
  storeBackupCodes,
  generateBackupCodes,
  hashBackupCode,
} from '@/lib/mfa/backup-codes.js';
import { validateTotpCode, getClientIp } from '@/lib/auth/validation.js';
import { createSession } from '@/lib/auth/sessionManager.js';
import { createNextAuthSessionToken, setNextAuthSessionCookie } from '@/lib/auth/nextauth-session.js';

/**
 * POST /api/auth/mfa/verify-setup
 * 
 * Request body:
 * {
 *   code: string (6-digit TOTP code)
 * }
 * 
 * Verifies the TOTP code and completes MFA setup.
 */
export async function POST(request) {
  try {
    console.log('🔐 [MFA VERIFY SETUP API] ===== MFA VERIFY SETUP REQUEST STARTED =====');
    console.log('🔐 [MFA VERIFY SETUP API] Request method:', request.method);
    console.log('🔐 [MFA VERIFY SETUP API] Request URL:', request.url);
    
    // Try to get session first
    const session = await auth();
    
    // Also check for email in request body (for initial setup when user needs MFA but no session yet)
    const body = await request.json();
    const { code, email: emailParam } = body;
    
    console.log('🔐 [MFA VERIFY SETUP API] Session present:', !!session?.user);
    console.log('🔐 [MFA VERIFY SETUP API] Email from body:', emailParam ? 'Present' : 'Missing');
    
    let userId;
    let userEmail;
    
    if (session && session.user) {
      // Authenticated via session
      userId = session.user.id;
      userEmail = session.user.email;
      console.log('🔐 [MFA VERIFY SETUP API] Using session-based authentication', { userId, email: userEmail });
    } else if (emailParam) {
      // Email-based access for initial setup
      // Only allow if user has mfa_enabled but not verified (needs initial setup)
      console.log('🔐 [MFA VERIFY SETUP API] Using email-based authentication for initial setup');
      const userResult = await query(
        `SELECT id, email, mfa_enabled, mfa_verified, mfa_secret FROM users WHERE email = $1`,
        [emailParam]
      );
      
      if (userResult.rows.length === 0) {
        console.log('🔐 [MFA VERIFY SETUP API] ❌ User not found for email:', emailParam);
        return NextResponse.json(
          {
            success: false,
            error: 'User not found',
          },
          { status: 404 }
        );
      }
      
      const user = userResult.rows[0];
      console.log('🔐 [MFA VERIFY SETUP API] User found:', {
        userId: user.id,
        email: user.email,
        mfa_enabled: user.mfa_enabled,
        mfa_verified: user.mfa_verified,
        mfa_secret: user.mfa_secret ? 'Present' : 'Missing'
      });
      
      // Only allow email-based access if:
      // 1. MFA is enabled but not verified (needs setup completion)
      // Don't allow if MFA is already fully set up and verified
      if (user.mfa_enabled && user.mfa_verified && user.mfa_secret) {
        console.log('🔐 [MFA VERIFY SETUP API] ❌ MFA already fully set up, requiring session');
        return NextResponse.json(
          {
            success: false,
            error: 'MFA is already set up. Please use session-based authentication.',
          },
          { status: 401 }
        );
      }
      
      userId = user.id;
      userEmail = user.email;
      console.log('🔐 [MFA VERIFY SETUP API] ✅ Email-based access granted for initial setup');
    } else {
      console.log('🔐 [MFA VERIFY SETUP API] ❌ No session and no email provided');
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required. Please provide a session or email.',
        },
        { status: 401 }
      );
    }

    console.log('🔐 [MFA VERIFY SETUP API] Verifying TOTP code for user:', { userId, email: userEmail });

    // Validate TOTP code format
    console.log('🔐 [MFA VERIFY SETUP API] Validating TOTP code format...', {
      codeLength: code?.length,
      code: code ? code.substring(0, 1) + '*****' : 'Missing'
    });
    const codeValidation = validateTotpCode(code);
    if (!codeValidation.valid) {
      console.log('🔐 [MFA VERIFY SETUP API] ❌ Invalid TOTP code format:', codeValidation.error);
      return NextResponse.json(
        {
          success: false,
          error: codeValidation.error,
        },
        { status: 400 }
      );
    }
    console.log('🔐 [MFA VERIFY SETUP API] ✅ TOTP code format valid');

    // Get user's encrypted MFA secret and user data for session creation
    console.log('🔐 [MFA VERIFY SETUP API] Querying user from database...', { userId });
    const userResult = await query(
      `SELECT id, email, role, org_id, is_active, mfa_enabled, mfa_verified, mfa_secret FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      console.log('🔐 [MFA VERIFY SETUP API] ❌ User not found');
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    console.log('🔐 [MFA VERIFY SETUP API] ✅ User found:', {
      id: user.id,
      email: user.email,
      mfa_enabled: user.mfa_enabled,
      mfa_verified: user.mfa_verified,
      mfa_secret: user.mfa_secret ? 'Present' : 'Missing'
    });

    // Check if MFA is already verified
    if (user.mfa_verified) {
      console.log('🔐 [MFA VERIFY SETUP API] ❌ MFA is already verified');
      return NextResponse.json(
        {
          success: false,
          error: 'MFA is already verified',
        },
        { status: 400 }
      );
    }

    // Check if MFA secret exists
    if (!user.mfa_secret) {
      console.log('🔐 [MFA VERIFY SETUP API] ❌ MFA secret missing. Setup not initiated.');
      return NextResponse.json(
        {
          success: false,
          error: 'MFA setup not initiated. Please set up MFA first.',
        },
        { status: 400 }
      );
    }
    console.log('🔐 [MFA VERIFY SETUP API] ✅ MFA secret exists');

    // Decrypt secret
    console.log('🔐 [MFA VERIFY SETUP API] Decrypting MFA secret...');
    const encryptionKey = process.env.MFA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
    
    if (!encryptionKey) {
      console.log('🔐 [MFA VERIFY SETUP API] ❌ MFA encryption key not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'MFA encryption key not configured',
        },
        { status: 500 }
      );
    }

    let secret;
    try {
      secret = decryptSecret(user.mfa_secret, encryptionKey);
      console.log('🔐 [MFA VERIFY SETUP API] ✅ MFA secret decrypted', {
        secretLength: secret?.length,
        secretStartsWith: secret?.substring(0, 4) + '...'
      });
    } catch (error) {
      console.error('🔐 [MFA VERIFY SETUP API] ❌ Error decrypting secret:', error);
      console.error('🔐 [MFA VERIFY SETUP API] ❌ Error details:', {
        message: error.message,
        name: error.name,
        encryptedLength: user.mfa_secret?.length
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to decrypt MFA secret',
        },
        { status: 500 }
      );
    }

    // Verify TOTP code
    console.log('🔐 [MFA VERIFY SETUP API] Verifying TOTP code with secret...', {
      codeLength: codeValidation.code?.length,
      code: codeValidation.code
    });
    const isValid = verifyTotp(codeValidation.code, secret);
    console.log('🔐 [MFA VERIFY SETUP API] TOTP verification result:', isValid);

    if (!isValid) {
      console.log('🔐 [MFA VERIFY SETUP API] ❌ Invalid TOTP code');
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid TOTP code. Please try again.',
        },
        { status: 400 }
      );
    }
    
    console.log('🔐 [MFA VERIFY SETUP API] ✅ TOTP code verified successfully');

    // Code is valid - complete MFA setup
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Mark MFA as verified (QR code is now "scanned" and hidden)
      await client.query(
        `UPDATE users 
         SET mfa_verified = true
         WHERE id = $1`,
        [userId]
      );

      // Generate and store backup codes
      const backupCodes = generateBackupCodes();
      
      // Delete old backup codes
      await client.query(
        `DELETE FROM mfa_backup_codes WHERE user_id = $1`,
        [userId]
      );

      // Insert new backup codes (hashed)
      for (const backupCode of backupCodes) {
        const codeHash = hashBackupCode(backupCode);
        await client.query(
          `INSERT INTO mfa_backup_codes (user_id, code_hash, used)
           VALUES ($1, $2, false)`,
          [userId, codeHash]
        );
      }

      await client.query('COMMIT');

      // Create a new session with updated MFA status
      // This ensures the user can access the dashboard immediately after MFA setup
      const ipAddress = getClientIp(request);
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      const newSession = await createSession({
        userId: user.id,
        email: user.email,
        role: user.role,
        ipAddress,
        userAgent,
        userData: {
          orgId: user.org_id,
          isActive: user.is_active,
          mfaEnabled: true,
          mfaVerified: true, // MFA is now verified
        },
      });

      // Create NextAuth session token for middleware compatibility
      const nextAuthToken = await createNextAuthSessionToken({
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.org_id,
        isActive: user.is_active,
        mfaEnabled: true,
        mfaVerified: true,
      });

      // Create response with session tokens and backup codes
      const response = NextResponse.json(
        {
          success: true,
          message: 'MFA setup completed successfully',
          mfaEnabled: true,
          mfaVerified: true,
          backupCodes: backupCodes, // Return plain codes - user must save these!
          warning: 'Save these backup codes in a secure location. They will not be shown again.',
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            orgId: user.org_id,
            isActive: user.is_active,
            mfaEnabled: true,
            mfaVerified: true,
          },
          sessionToken: newSession.accessToken,
          refreshToken: newSession.refreshToken,
          expiresAt: newSession.expiresAt,
        },
        { status: 200 }
      );

      // Set refresh token in httpOnly cookie (secure storage)
      const expiresAt = new Date(newSession.expiresAt);
      response.cookies.set('refresh-token', newSession.refreshToken, {
        httpOnly: true, // Prevent XSS attacks
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax', // CSRF protection
        path: '/',
        expires: expiresAt,
      });

      // Set NextAuth session token cookie (for middleware compatibility)
      setNextAuthSessionCookie(response, nextAuthToken);

      return response;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('MFA verify setup error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to verify MFA setup. Please try again.',
      },
      { status: 500 }
    );
  }
}

