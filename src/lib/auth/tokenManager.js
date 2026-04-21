/**
 * Token Manager
 * 
 * Handles token generation, validation, refresh, and expiry checking.
 * Provides secure token management with rotation support.
 */

import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';

/**
 * Token Configuration
 */
const TOKEN_CONFIG = {
  ACCESS_TOKEN_EXPIRY: 15 * 60 * 1000, // 15 minutes in milliseconds
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  TOKEN_LENGTH: 32, // Bytes for random tokens
  REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh 5 minutes before expiry
};

/**
 * Get JWT secret key
 */
function getJWTSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required for token management');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Generate a secure random token
 * 
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Random hex token
 */
export function generateToken(length = TOKEN_CONFIG.TOKEN_LENGTH) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a token for storage
 * 
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate JWT access token
 * 
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID
 * @param {string} payload.email - User email
 * @param {string} payload.role - User role
 * @param {number} expiresIn - Expiry time in seconds (default: 15 minutes)
 * @returns {Promise<string>} JWT token
 */
export async function generateAccessToken(payload, expiresIn = TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY / 1000) {
  console.log('🔑 [TOKEN] Generating access token...', {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    expiresIn: expiresIn
  });
  
  const secret = getJWTSecret();
  console.log('🔑 [TOKEN] JWT secret:', secret ? 'Present' : 'Missing');
  
  const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;
  console.log('🔑 [TOKEN] Token expiration time:', new Date(expirationTime * 1000).toISOString());
  
  const token = await new SignJWT({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    orgId: payload.orgId || null,
    isActive: payload.isActive !== false,
    mfaEnabled: payload.mfaEnabled || false,
    mfaVerified: payload.mfaVerified || false,
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .setIssuer('edurock')
    .setAudience('edurock-api')
    .sign(secret);

  console.log('🔑 [TOKEN] ✅ Access token generated:', token ? 'Present' : 'Missing');
  return token;
}

/**
 * Generate refresh token (random string, not JWT)
 * 
 * @returns {string} Refresh token
 */
export function generateRefreshToken() {
  return generateToken(TOKEN_CONFIG.TOKEN_LENGTH);
}

/**
 * Verify JWT access token
 * 
 * @param {string} token - JWT token to verify
 * @returns {Promise<Object>} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
export async function verifyAccessToken(token) {
  try {
    console.log('🔍 [TOKEN] Verifying access token...');
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'edurock',
      audience: 'edurock-api',
    });

    console.log('🔍 [TOKEN] Token payload:', {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      type: payload.type,
      exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'No expiration'
    });

    // Check token type
    if (payload.type !== 'access') {
      console.log('🔍 [TOKEN] ❌ Invalid token type:', payload.type);
      throw new Error('Invalid token type');
    }

    console.log('🔍 [TOKEN] ✅ Token verified successfully');
    return payload;
  } catch (error) {
    console.error('🔍 [TOKEN] ❌ Token verification failed:', error.code, error.message);
    if (error.code === 'ERR_JWT_EXPIRED') {
      throw new Error('Token expired');
    }
    if (error.code === 'ERR_JWT_INVALID') {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Check if token is expired
 * 
 * @param {string} token - JWT token
 * @returns {Promise<boolean>} Whether token is expired
 */
export async function isTokenExpired(token) {
  try {
    await verifyAccessToken(token);
    return false;
  } catch (error) {
    return error.message === 'Token expired' || error.message.includes('expired');
  }
}

/**
 * Check if token needs refresh
 * 
 * @param {string} token - JWT token
 * @param {number} threshold - Threshold in milliseconds (default: 5 minutes)
 * @returns {Promise<boolean>} Whether token needs refresh
 */
export async function needsRefresh(token, threshold = TOKEN_CONFIG.REFRESH_THRESHOLD) {
  try {
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'edurock',
      audience: 'edurock-api',
    });

    if (!payload.exp) {
      return true; // No expiry, consider it needs refresh
    }

    const expiryTime = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;

    return timeUntilExpiry < threshold;
  } catch (error) {
    return true; // If verification fails, needs refresh
  }
}

/**
 * Get token expiry time
 * 
 * @param {string} token - JWT token
 * @returns {Promise<Date|null>} Expiry date or null
 */
export async function getTokenExpiry(token) {
  try {
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'edurock',
      audience: 'edurock-api',
    });

    if (payload.exp) {
      return new Date(payload.exp * 1000);
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * 
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
export function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Token Configuration
 */
export const TokenConfig = TOKEN_CONFIG;

export default {
  generateToken,
  hashToken,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  isTokenExpired,
  needsRefresh,
  getTokenExpiry,
  extractTokenFromHeader,
  TokenConfig,
};


