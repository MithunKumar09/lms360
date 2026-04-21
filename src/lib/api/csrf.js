/**
 * CSRF Protection Utilities
 * Origin/Referer checks for same-site requests.
 */

export function checkCsrf(request) {
	const origin = request.headers.get('origin');
	const referer = request.headers.get('referer');

	// Allow localhost in development
	const isDev = process.env.NODE_ENV !== 'production';

	// Derive expected host from NEXTAUTH_URL or request URL
	let expectedHost = null;
	if (process.env.NEXTAUTH_URL) {
		try { expectedHost = new URL(process.env.NEXTAUTH_URL).origin; } catch {}
	}
	if (!expectedHost) {
		try { expectedHost = new URL(request.url).origin; } catch {}
	}

	// If no expected host, skip (best-effort)
	if (!expectedHost) return { ok: true };

	const originOk = !origin || origin === expectedHost || (isDev && origin.startsWith('http://localhost'));
	const refererOk = !referer || referer.startsWith(expectedHost) || (isDev && referer.startsWith('http://localhost'));

	if (originOk || refererOk) return { ok: true };

	return { ok: false, error: 'CSRF validation failed' };
}

// Note: default export is provided at the bottom; avoid multiple default exports.

/**
 * CSRF Protection Utility
 * 
 * Validates CSRF protection via Origin and Referer headers.
 * For API routes that modify data (POST, PATCH, DELETE).
 * 
 * @module api/csrf
 */

/**
 * Allowed origins for CSRF protection
 * In development, localhost is allowed
 * In production, only the dashboard domain is allowed
 */
function getAllowedOrigins() {
  const allowedOrigins = [];

  // Development: allow localhost
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://127.0.0.1:3000');
  }

  // Production: add dashboard domain from environment
  const dashboardUrl = process.env.NEXTAUTH_URL || process.env.DASHBOARD_URL;
  if (dashboardUrl) {
    try {
      const url = new URL(dashboardUrl);
      allowedOrigins.push(url.origin);
    } catch (error) {
      console.warn('Invalid dashboard URL in environment:', dashboardUrl);
    }
  }

  // Add any additional allowed origins from environment
  const additionalOrigins = process.env.CSRF_ALLOWED_ORIGINS;
  if (additionalOrigins) {
    additionalOrigins.split(',').forEach((origin) => {
      const trimmed = origin.trim();
      if (trimmed) {
        allowedOrigins.push(trimmed);
      }
    });
  }

  return allowedOrigins;
}

/**
 * Validate CSRF protection via Origin/Referer headers
 * 
 * @param {Request} request - Next.js request object
 * @returns {Object} Validation result
 */
export function validateCSRF(request) {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const allowedOrigins = getAllowedOrigins();

  // In development, be more lenient
  if (process.env.NODE_ENV !== 'production') {
    // Allow if no origin/referer (direct API calls from server)
    if (!origin && !referer) {
      return { valid: true };
    }

    // Allow localhost
    if (origin && origin.includes('localhost')) {
      return { valid: true };
    }
    if (referer && referer.includes('localhost')) {
      return { valid: true };
    }
  }

  // Check Origin header (preferred)
  if (origin) {
    if (allowedOrigins.includes(origin)) {
      return { valid: true };
    }

    // Check if origin matches any allowed origin pattern
    const originUrl = new URL(origin);
    for (const allowed of allowedOrigins) {
      try {
        const allowedUrl = new URL(allowed);
        if (originUrl.origin === allowedUrl.origin) {
          return { valid: true };
        }
      } catch (error) {
        // Skip invalid URLs
      }
    }
  }

  // Check Referer header (fallback)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = refererUrl.origin;

      if (allowedOrigins.includes(refererOrigin)) {
        return { valid: true };
      }

      // Check if referer matches any allowed origin pattern
      for (const allowed of allowedOrigins) {
        try {
          const allowedUrl = new URL(allowed);
          if (refererOrigin === allowedUrl.origin) {
            return { valid: true };
          }
        } catch (error) {
          // Skip invalid URLs
        }
      }
    } catch (error) {
      // Invalid referer URL
    }
  }

  // No valid origin or referer found
  return {
    valid: false,
    error: 'CSRF validation failed: Invalid origin or referer',
    origin,
    referer,
    allowedOrigins,
  };
}

/**
 * Require CSRF validation (throws error if invalid)
 * 
 * @param {Request} request - Next.js request object
 * @throws {Error} If CSRF validation fails
 */
export function requireCSRF(request) {
  const validation = validateCSRF(request);
  if (!validation.valid) {
    const error = new Error(validation.error || 'CSRF validation failed');
    error.status = 403;
    error.code = 'CSRF_VALIDATION_FAILED';
    throw error;
  }
}

export default {
  checkCsrf,
  validateCSRF,
  requireCSRF,
  getAllowedOrigins,
};

