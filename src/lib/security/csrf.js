/**
 * CSRF Protection Utilities
 * 
 * Implements CSRF token generation and validation for API endpoints.
 */

import crypto from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

/**
 * Generate a CSRF token
 * @returns {string} CSRF token
 */
export function generateCsrfToken() {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Validate CSRF token
 * @param {string} token - Token from request
 * @param {string} sessionToken - Token from session
 * @returns {boolean} True if valid
 */
export function validateCsrfToken(token, sessionToken) {
  if (!token || !sessionToken) {
    return false;
  }
  
  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(sessionToken)
  );
}

/**
 * Extract CSRF token from request
 * @param {Request} request - Next.js request object
 * @returns {string|null} CSRF token or null
 */
export function extractCsrfToken(request) {
  // Try header first
  const headerToken = request.headers.get('X-CSRF-Token');
  if (headerToken) {
    return headerToken;
  }
  
  // Try cookie
  const cookies = request.headers.get('cookie');
  if (cookies) {
    const match = cookies.match(/csrf-token=([^;]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  
  return null;
}

/**
 * Middleware to validate CSRF token
 * @param {Request} request - Next.js request object
 * @param {string} sessionToken - CSRF token from session
 * @returns {Object} Validation result
 */
export function validateCsrf(request, sessionToken) {
  const token = extractCsrfToken(request);
  
  if (!token) {
    return {
      valid: false,
      error: 'CSRF token missing',
    };
  }
  
  if (!validateCsrfToken(token, sessionToken)) {
    return {
      valid: false,
      error: 'Invalid CSRF token',
    };
  }
  
  return {
    valid: true,
  };
}
