/**
 * NextAuth Session Helper
 * 
 * Helper functions to create NextAuth sessions programmatically.
 * This ensures both custom sessions and NextAuth sessions are created together.
 */

import { SignJWT } from 'jose';

/**
 * Create NextAuth session token
 * 
 * @param {Object} user - User object
 * @param {string} user.id - User ID
 * @param {string} user.email - User email
 * @param {string} user.role - User role
 * @param {string} user.orgId - Organization ID
 * @param {boolean} user.isActive - Whether user is active
 * @param {boolean} user.mfaEnabled - Whether MFA is enabled
 * @param {boolean} user.mfaVerified - Whether MFA is verified
 * @returns {Promise<string>} JWT token
 */
export async function createNextAuthSessionToken(user) {
  console.log('🎫 [NEXTAUTH] Creating NextAuth session token...', {
    userId: user.id,
    email: user.email,
    role: user.role
  });
  
  const secret = new TextEncoder().encode(
    process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'fallback-secret-key-change-in-production'
  );
  console.log('🎫 [NEXTAUTH] Secret key:', secret ? 'Present' : 'Missing');

  // Calculate expiration (7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  console.log('🎫 [NEXTAUTH] Token expiration:', expiresAt.toISOString());

  // Create JWT token with user data
  console.log('🎫 [NEXTAUTH] Signing JWT token with user data:', {
    id: user.id,
    email: user.email,
    role: user.role,
    orgId: user.orgId || null, // Ensure orgId is preserved (can be null for superadmin)
    isActive: user.isActive !== false,
    mfaEnabled: user.mfaEnabled || false,
    mfaVerified: user.mfaVerified || false,
  });
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    role: user.role,
    orgId: user.orgId || null, // FIX: Preserve orgId (can be null for superadmin)
    isActive: user.isActive !== false,
    mfaEnabled: user.mfaEnabled || false,
    mfaVerified: user.mfaVerified || false,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .setSubject(user.id)
    .sign(secret);

  console.log('🎫 [NEXTAUTH] ✅ NextAuth session token created:', token ? 'Present' : 'Missing');
  return token;
}

/**
 * Set NextAuth session cookie
 * 
 * @param {Object} response - NextResponse object
 * @param {string} token - JWT token
 */
export function setNextAuthSessionCookie(response, token) {
  console.log('🍪 [NEXTAUTH] Setting NextAuth session cookie...');
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  console.log('🍪 [NEXTAUTH] Cookie expiration:', expiresAt.toISOString());

  // Set the NextAuth session token cookie
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    // CRITICAL: Do NOT set domain - cookies should work without domain for Vercel
    // Setting domain can prevent cookies from being cleared properly in production
    // Vercel domains work fine without explicit domain setting
  };
  console.log('🍪 [NEXTAUTH] Cookie options:', {
    httpOnly: cookieOptions.httpOnly,
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
    expires: cookieOptions.expires.toISOString()
  });
  
  response.cookies.set('next-auth.session-token', token, cookieOptions);
  console.log('🍪 [NEXTAUTH] ✅ NextAuth session cookie set');
}

/**
 * Delete NextAuth session cookie
 * 
 * @param {Object} response - NextResponse object
 */
export function deleteNextAuthSessionCookie(response) {
  response.cookies.delete('next-auth.session-token');
}

