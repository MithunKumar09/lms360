/**
 * MFA Setup API Route
 * 
 * Generates TOTP secret and QR code for MFA setup.
 * GET /api/auth/mfa/setup
 */

import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { query } from '@/lib/db/index.js';
import {
  generateSecret,
  generateQRCode,
  formatSecretForManualEntry,
  encryptSecret,
  decryptSecret,
} from '@/lib/mfa/totp.js';

/**
 * GET /api/auth/mfa/setup
 * 
 * Generates a new TOTP secret and QR code for the authenticated user.
 * The secret is stored temporarily until verified.
 * 
 * Also supports email-based access for users who need initial MFA setup
 * (when mfa_enabled is true but no secret exists yet).
 */
export async function GET(request) {
  try {
    // Try to get session first
    const session = await auth();
    
    // Also check for email parameter (for initial setup when user needs MFA but no session yet)
    const { searchParams } = new URL(request.url);
    const emailParam = searchParams.get('email');
    
    let userId;
    let userEmail;
    
    if (session && session.user) {
      // Authenticated via session
      userId = session.user.id;
      userEmail = session.user.email;
    } else if (emailParam) {
      // Email-based access for initial setup
      // Only allow if user has mfa_enabled but no secret (needs initial setup)
      const userResult = await query(
        `SELECT id, email, mfa_enabled, mfa_verified, mfa_secret FROM users WHERE email = $1`,
        [emailParam]
      );
      
      if (userResult.rows.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'User not found',
          },
          { status: 404 }
        );
      }
      
      const user = userResult.rows[0];
      
      // Only allow email-based access if:
      // 1. MFA is not enabled yet (initial setup), OR
      // 2. MFA is enabled but not verified (needs setup completion)
      // Don't allow if MFA is already fully set up and verified
      if (user.mfa_enabled && user.mfa_verified && user.mfa_secret) {
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
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
        },
        { status: 401 }
      );
    }

    // Check if MFA is already enabled and verified (re-query to get latest state)
    const userResult = await query(
      `SELECT mfa_enabled, mfa_verified, mfa_secret FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // If MFA is already enabled AND verified (user has successfully scanned QR and verified TOTP),
    // don't show QR code again. QR code should only be shown during initial setup.
    // Note: mfa_verified is ONLY set to true in /api/auth/mfa/verify-setup (initial setup verification),
    // NOT in /api/auth/mfa/verify (login verification).
    if (user.mfa_enabled && user.mfa_verified && user.mfa_secret) {
      return NextResponse.json(
        {
          success: true,
          message: 'MFA is already set up',
          mfaEnabled: true,
          mfaVerified: true,
          // Don't return QR code or secret if already verified
          qrCode: null,
          secret: null,
          manualEntryKey: null,
        },
        { status: 200 }
      );
    }

    // If we reach here, either:
    // 1. MFA is not enabled yet (initial setup)
    // 2. MFA is enabled but not verified (mfa_verified = false) - user needs to scan QR and verify TOTP
    // 
    // IMPORTANT: If a secret already exists but is not verified, reuse it instead of generating a new one.
    // This prevents secret mismatches when users refresh the setup page or scan the QR code multiple times.
    const encryptionKey = process.env.MFA_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
    
    if (!encryptionKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'MFA encryption key not configured',
        },
        { status: 500 }
      );
    }

    let secret;
    let encryptedSecret;

    // If secret already exists and is not verified, reuse it (don't regenerate)
    // This prevents secret mismatches when users refresh the setup page or scan QR code multiple times
    if (user.mfa_secret && !user.mfa_verified) {
      try {
        // Decrypt existing secret to reuse it
        secret = decryptSecret(user.mfa_secret, encryptionKey);
        encryptedSecret = user.mfa_secret;
        console.log('🔄 [MFA SETUP] Reusing existing secret (user has not verified yet)', {
          secretLength: secret?.length,
          secretPreview: secret?.substring(0, 8) + '...'
        });
      } catch (error) {
        console.error('⚠️ [MFA SETUP] Failed to decrypt existing secret, generating new one:', error);
        console.error('⚠️ [MFA SETUP] Error details:', {
          message: error.message,
          encryptedLength: user.mfa_secret?.length
        });
        // If decryption fails, generate a new secret
        secret = generateSecret();
        encryptedSecret = encryptSecret(secret, encryptionKey);
        await query(
          `UPDATE users 
           SET mfa_secret = $1, mfa_enabled = true, mfa_verified = false
           WHERE id = $2`,
          [encryptedSecret, userId]
        );
        console.log('✅ [MFA SETUP] Generated new secret after decryption failure');
      }
    } else {
      // No secret exists or secret was verified, generate a new one
      secret = generateSecret();
      encryptedSecret = encryptSecret(secret, encryptionKey);

      // Store encrypted secret temporarily in database (will be verified in next step)
      await query(
        `UPDATE users 
         SET mfa_secret = $1, mfa_enabled = true, mfa_verified = false
         WHERE id = $2`,
        [encryptedSecret, userId]
      );
    }

    // Generate QR code with the secret (existing or new)
    const issuer = process.env.MFA_ISSUER_NAME || 'EduRock';
    const qrCodeDataUrl = await generateQRCode(userEmail, secret, issuer);

    // Format secret for manual entry
    const manualEntryKey = formatSecretForManualEntry(secret);

    return NextResponse.json(
      {
        success: true,
        message: 'MFA setup initiated. Please scan QR code and verify with a TOTP code.',
        qrCode: qrCodeDataUrl,
        secret: secret, // Return plain secret for manual entry (only during setup)
        manualEntryKey: manualEntryKey,
        totpUri: `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userEmail)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('MFA setup error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to set up MFA. Please try again.',
      },
      { status: 500 }
    );
  }
}


