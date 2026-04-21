/**
 * Authentication Validation Utilities
 * 
 * Provides validation functions for authentication inputs.
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return {
      valid: false,
      error: 'Email is required',
    };
  }

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  
  if (!emailRegex.test(email.trim())) {
    return {
      valid: false,
      error: 'Invalid email format',
    };
  }

  if (email.length > 255) {
    return {
      valid: false,
      error: 'Email is too long (max 255 characters)',
    };
  }

  return {
    valid: true,
    email: email.trim().toLowerCase(),
  };
}

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      error: 'Password is required',
    };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: 'Password must be at least 8 characters',
    };
  }

  if (password.length > 128) {
    return {
      valid: false,
      error: 'Password is too long (max 128 characters)',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Validate TOTP code (6 digits)
 * @param {string} code - TOTP code to validate
 * @returns {Object} Validation result
 */
export function validateTotpCode(code) {
  if (!code || typeof code !== 'string') {
    return {
      valid: false,
      error: 'TOTP code is required',
    };
  }

  const codeRegex = /^\d{6}$/;
  
  if (!codeRegex.test(code)) {
    return {
      valid: false,
      error: 'TOTP code must be 6 digits',
    };
  }

  return {
    valid: true,
    code: code.trim(),
  };
}

/**
 * Get client IP address from request
 * @param {Request} request - Next.js request object
 * @returns {string} IP address
 */
export function getClientIp(request) {
  // Check various headers for IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Fallback to localhost for development
  return '127.0.0.1';
}

/**
 * Sanitize user input
 * @param {string} input - Input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input.trim().replace(/[<>]/g, '');
}

export default {
  validateEmail,
  validatePassword,
  validateTotpCode,
  getClientIp,
  sanitizeInput,
};


