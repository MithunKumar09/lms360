/**
 * MFA Verify API Route
 * 
 * Verifies TOTP code during login.
 * POST /api/auth/mfa/verify
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import {
  verifyTotp,
  decryptSecret,
} from '@/lib/mfa/totp.js';
import {
  useBackupCode as verifyBackupCodeForUser,
} from '@/lib/mfa/backup-codes.js';
import { validateTotpCode } from '@/lib/auth/validation.js';
import {
  recordLoginAttempt,
  checkAccountLock,
} from '@/lib/auth/rate-limiter.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { createSession } from '@/lib/auth/sessionManager.js';
import { createNextAuthSessionToken, setNextAuthSessionCookie } from '@/lib/auth/nextauth-session.js';
import { normalizeRole } from '@/lib/auth/roles.js';

/**
 * POST /api/auth/mfa/verify
 * 
 * Request body:
 * {
 *   email: string,
 *   code: string (TOTP code or backup code),
 *   isBackupCode?: boolean (optional, defaults to false)
 * }
 * 
 * Verifies MFA code and completes login.
 */
export async function POST(request) {
  try {
    console.log('🔐 [MFA VERIFY API] ===== MFA VERIFY REQUEST STARTED =====');
    console.log('🔐 [MFA VERIFY API] Request method:', request.method);
    console.log('🔐 [MFA VERIFY API] Request URL:', request.url);
    
    // Parse request body
    const body = await request.json();
    const { email, code, isBackupCode = false } = body;
    console.log('🔐 [MFA VERIFY API] Email received:', email);
    console.log('🔐 [MFA VERIFY API] Code received:', code ? 'Present' : 'Missing');
    console.log('🔐 [MFA VERIFY API] Is backup code:', isBackupCode);

    // Get client IP
    const ipAddress = getClientIp(request);
    console.log('🔐 [MFA VERIFY API] Client IP:', ipAddress);

    // Validate email
    console.log('🔐 [MFA VERIFY API] Validating email...');
    if (!email || typeof email !== 'string') {
      console.log('🔐 [MFA VERIFY API] ❌ Email validation failed');
      await recordLoginAttempt(email || 'unknown', ipAddress, false, 'Invalid email');
      return NextResponse.json(
        {
          success: false,
          error: 'Email is required',
        },
        { status: 400 }
      );
    }
    console.log('🔐 [MFA VERIFY API] ✅ Email validation passed');

    // Validate code
    console.log('🔐 [MFA VERIFY API] Validating code...');
    if (!code || typeof code !== 'string') {
      console.log('🔐 [MFA VERIFY API] ❌ Code validation failed');
      await recordLoginAttempt(email, ipAddress, false, 'Invalid MFA code');
      return NextResponse.json(
        {
          success: false,
          error: 'MFA code is required',
        },
        { status: 400 }
      );
    }
    console.log('🔐 [MFA VERIFY API] ✅ Code validation passed');

    // Check account lock
    console.log('🔐 [MFA VERIFY API] Checking account lock...');
    const accountLock = await checkAccountLock(email);
    if (accountLock.isLocked) {
      console.log('🔐 [MFA VERIFY API] ❌ Account locked:', accountLock);
      await recordLoginAttempt(email, ipAddress, false, 'Account locked');
      return NextResponse.json(
        {
          success: false,
          error: `Account temporarily locked. Please try again in ${accountLock.minutesRemaining} minute(s).`,
          accountLocked: true,
        },
        { status: 423 }
      );
    }
    console.log('🔐 [MFA VERIFY API] ✅ Account lock check passed');

    // Get user from database with role (from role column or user_roles)
    console.log('🔐 [MFA VERIFY API] Querying user from database...');
    const userResult = await query(
      `SELECT
        u.id,
        u.email,
        u.password_hash,
        -- Cast role to text (handles both enum and varchar column types)
        u.role::text AS role,
        u.org_id,
        u.is_active,
        u.mfa_enabled,
        u.mfa_verified,
        u.mfa_secret,
        u.last_login_at
       FROM users u
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      console.log('🔐 [MFA VERIFY API] ❌ User not found in database');
      await recordLoginAttempt(email, ipAddress, false, 'User not found');
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or code',
        },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];
    // Normalize role to canonical form — matches login route behavior exactly.
    user.role = normalizeRole(user.role);
    console.log('🔐 [MFA VERIFY API] ✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      mfa_enabled: user.mfa_enabled,
      mfa_verified: user.mfa_verified,
      mfa_secret: user.mfa_secret ? 'Present' : 'Missing'
    });

    // Check if user is active
    if (!user.is_active) {
      console.log('🔐 [MFA VERIFY API] ❌ Account is inactive');
      await recordLoginAttempt(email, ipAddress, false, 'Account inactive');
      return NextResponse.json(
        {
          success: false,
          error: 'Account is inactive',
        },
        { status: 403 }
      );
    }

    // Check if MFA is enabled
    if (!user.mfa_enabled || !user.mfa_secret) {
      console.log('🔐 [MFA VERIFY API] ❌ MFA not enabled or secret missing');
      await recordLoginAttempt(email, ipAddress, false, 'MFA not enabled');
      return NextResponse.json(
        {
          success: false,
          error: 'MFA is not enabled for this account',
        },
        { status: 400 }
      );
    }
    console.log('🔐 [MFA VERIFY API] ✅ MFA enabled check passed');

    let isValid = false;

    // Verify code (either TOTP or backup code)
    console.log('🔐 [MFA VERIFY API] Verifying MFA code...', { isBackupCode });
    if (isBackupCode) {
      // Verify backup code
      console.log('🔐 [MFA VERIFY API] Verifying backup code...');
      isValid = await verifyBackupCodeForUser(user.id, code);
      console.log('🔐 [MFA VERIFY API] Backup code verification result:', isValid);
    } else {
      // Verify TOTP code
      console.log('🔐 [MFA VERIFY API] Verifying TOTP code...');
      const codeValidation = validateTotpCode(code);
      if (!codeValidation.valid) {
        console.log('🔐 [MFA VERIFY API] ❌ Invalid TOTP format:', codeValidation.error);
        await recordLoginAttempt(email, ipAddress, false, 'Invalid TOTP format');
        return NextResponse.json(
          {
            success: false,
            error: codeValidation.error,
          },
          { status: 400 }
        );
      }
      console.log('🔐 [MFA VERIFY API] ✅ TOTP format validation passed');

      // Decrypt MFA secret
      const encryptionKey = process.env.MFA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
      console.log('🔐 [MFA VERIFY API] Encryption key:', encryptionKey ? 'Present' : 'Missing');
      
      if (!encryptionKey) {
        console.log('🔐 [MFA VERIFY API] ❌ MFA encryption key not configured');
        return NextResponse.json(
          {
            success: false,
            error: 'MFA encryption key not configured',
          },
          { status: 500 }
        );
      }

      try {
        console.log('🔐 [MFA VERIFY API] Decrypting MFA secret...');
        console.log('🔐 [MFA VERIFY API] Encrypted secret info:', {
          encryptedLength: user.mfa_secret?.length,
          encryptedPreview: user.mfa_secret?.substring(0, 30) + '...',
          hasEncrypted: !!user.mfa_secret
        });
        
        const secret = decryptSecret(user.mfa_secret, encryptionKey);
        
        console.log('🔐 [MFA VERIFY API] ✅ MFA secret decrypted successfully', {
          secretLength: secret?.length,
          secretPreview: secret?.substring(0, 8) + '...',
          isValidBase32: /^[A-Z2-7]+$/.test(secret),
          secretStart: secret?.substring(0, 4)
        });
        
        console.log('🔐 [MFA VERIFY API] Verifying TOTP code with secret...', {
          codeLength: codeValidation.code?.length,
          code: codeValidation.code,
          secretLength: secret?.length,
          secretPreview: secret?.substring(0, 8) + '...'
        });
        
        isValid = verifyTotp(codeValidation.code, secret);
        console.log('🔐 [MFA VERIFY API] TOTP verification result:', isValid);
        
        if (!isValid) {
          // Additional debugging - check if secret format is correct
          console.log('🔐 [MFA VERIFY API] ⚠️ TOTP verification failed. Debug info:', {
            codeEntered: codeValidation.code,
            codeLength: codeValidation.code?.length,
            secretLength: secret?.length,
            secretFormat: /^[A-Z2-7]+$/.test(secret) ? 'Valid Base32' : 'Invalid Base32 format',
            secretPreview: secret?.substring(0, 12) + '...',
            currentTime: new Date().toISOString()
          });
        } else {
          console.log('🔐 [MFA VERIFY API] ✅ TOTP verification successful!');
        }
      } catch (error) {
        console.error('🔐 [MFA VERIFY API] ❌ Error decrypting/verifying secret:', error);
        console.error('🔐 [MFA VERIFY API] ❌ Error stack:', error.stack);
        console.error('🔐 [MFA VERIFY API] ❌ Error details:', {
          message: error.message,
          name: error.name,
          encryptedLength: user.mfa_secret?.length,
          encryptedPreview: user.mfa_secret?.substring(0, 30) + '...',
          encryptionKeyPresent: !!encryptionKey
        });
        await recordLoginAttempt(email, ipAddress, false, 'MFA verification error');
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to verify MFA code',
          },
          { status: 500 }
        );
      }
    }

    if (!isValid) {
      console.log('🔐 [MFA VERIFY API] ❌ Invalid MFA code');
      await recordLoginAttempt(email, ipAddress, false, 'Invalid MFA code');
      
      // Check if account should be locked
      const updatedLock = await checkAccountLock(email);
      if (updatedLock.isLocked) {
        console.log('🔐 [MFA VERIFY API] ❌ Account locked after failed attempt');
        return NextResponse.json(
          {
            success: false,
            error: `Too many failed attempts. Account locked for ${updatedLock.minutesRemaining} minutes.`,
            accountLocked: true,
          },
          { status: 423 }
        );
      }

      console.log('🔐 [MFA VERIFY API] Remaining attempts:', updatedLock.remainingAttempts);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid MFA code. Please try again.',
          remainingAttempts: updatedLock.remainingAttempts,
        },
        { status: 401 }
      );
    }
    console.log('🔐 [MFA VERIFY API] ✅ MFA code verified successfully');

    // MFA code is valid - update last login and create session
    // Note: We do NOT update mfa_verified here - that flag is only set during initial setup
    // (in /api/auth/mfa/verify-setup). During login, we just verify the code.
    console.log('🔐 [MFA VERIFY API] Creating session after successful MFA verification...');
    try {
      // Check if this is first login (last_login_at is NULL before update)
      const isFirstLogin = !user.last_login_at || user.last_login_at === null;
      
      // Update last login timestamp only
      console.log('🔐 [MFA VERIFY API] Updating last login timestamp...');
      await query(
        `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [user.id]
      );
      console.log('🔐 [MFA VERIFY API] ✅ Last login timestamp updated');

      // If this is first login, mark any pending invites for this user as used (accepted)
      if (isFirstLogin) {
        try {
          const { markInviteUsed } = await import('@/lib/db/users.js');
          // Find and mark all pending invites for this user's email
          const inviteResult = await query(
            `SELECT id FROM invite_tokens 
             WHERE LOWER(email) = LOWER($1) 
             AND used_at IS NULL 
             AND expires_at > CURRENT_TIMESTAMP`,
            [user.email]
          );
          
          if (inviteResult.rows.length > 0) {
            for (const invite of inviteResult.rows) {
              await markInviteUsed(invite.id);
            }
            console.log('🔐 [MFA VERIFY API] ✅ Marked invite(s) as accepted on first login:', inviteResult.rows.length);
          }
        } catch (inviteError) {
          // Don't fail login if invite marking fails
          console.error('🔐 [MFA VERIFY API] ⚠️ Failed to mark invites as accepted:', inviteError);
        }
      }

      // Update MFA verified status in database (for this session)
      // Note: This is session-specific, not permanent - user needs to verify MFA on each login
      await query(
        `UPDATE users SET mfa_verified = true WHERE id = $1`,
        [user.id]
      );
      console.log('🔐 [MFA VERIFY API] ✅ MFA verified status updated in database');

      // Create custom session with tokens (not using NextAuth signIn since we have custom session management)
      const userAgent = request.headers.get('user-agent') || 'unknown';
      console.log('🔐 [MFA VERIFY API] Creating custom session with tokens...');
      const session = await createSession({
        userId: user.id,
        email: user.email,
        role: user.role,
        ipAddress,
        userAgent,
        userData: {
          orgId: user.org_id,
          isActive: user.is_active,
          mfaEnabled: user.mfa_enabled,
          mfaVerified: true, // MFA is now verified for this session
        },
      });
      console.log('🔐 [MFA VERIFY API] ✅ Custom session created:', {
        sessionId: session.sessionId,
        accessToken: session.accessToken ? 'Present' : 'Missing',
        refreshToken: session.refreshToken ? 'Present' : 'Missing',
        expiresAt: session.expiresAt
      });

      // Create NextAuth session token for middleware compatibility
      console.log('🔐 [MFA VERIFY API] Creating NextAuth session token...');
      const nextAuthToken = await createNextAuthSessionToken({
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.org_id,
        isActive: user.is_active,
        mfaEnabled: user.mfa_enabled,
        mfaVerified: true, // MFA is now verified for this session
      });
      console.log('🔐 [MFA VERIFY API] ✅ NextAuth session token created:', nextAuthToken ? 'Present' : 'Missing');
      
      // Record successful MFA verification
      console.log('🔐 [MFA VERIFY API] Recording successful login attempt...');
      await recordLoginAttempt(email, ipAddress, true, null);
      console.log('🔐 [MFA VERIFY API] ✅ Login attempt recorded');

      // Create response with tokens
      const response = NextResponse.json(
        {
          success: true,
          message: 'MFA verification successful',
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            orgId: user.org_id,
            isActive: user.is_active,
            mfaEnabled: user.mfa_enabled,
            mfaVerified: true, // MFA is now verified for this session
          },
          sessionToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
        },
        { status: 200 }
      );

      // Set refresh token in httpOnly cookie (secure storage)
      const expiresAt = new Date(session.expiresAt);
      console.log('🔐 [MFA VERIFY API] Setting refresh token cookie...', {
        expiresAt: expiresAt.toISOString(),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: true
      });
      response.cookies.set('refresh-token', session.refreshToken, {
        httpOnly: true, // Prevent XSS attacks
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax', // CSRF protection
        path: '/',
        expires: expiresAt,
      });
      console.log('🔐 [MFA VERIFY API] ✅ Refresh token cookie set');

      // Set NextAuth session token cookie (for middleware compatibility)
      console.log('🔐 [MFA VERIFY API] Setting NextAuth session cookie...');
      setNextAuthSessionCookie(response, nextAuthToken);
      console.log('🔐 [MFA VERIFY API] ✅ NextAuth session cookie set');

      console.log('🔐 [MFA VERIFY API] ✅ ===== MFA VERIFY SUCCESSFUL =====');
      return response;
    } catch (error) {
      console.error('🔐 [MFA VERIFY API] ❌ Session creation error:', error);
      console.error('🔐 [MFA VERIFY API] ❌ Session creation error stack:', error.stack);
      await recordLoginAttempt(email, ipAddress, false, 'Session creation failed');
      
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to complete login. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('🔐 [MFA VERIFY API] ❌ ===== MFA VERIFY ERROR =====');
    console.error('🔐 [MFA VERIFY API] ❌ Error message:', error.message);
    console.error('🔐 [MFA VERIFY API] ❌ Error stack:', error.stack);
    console.error('🔐 [MFA VERIFY API] ❌ Error details:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during MFA verification. Please try again.',
      },
      { status: 500 }
    );
  }
}
