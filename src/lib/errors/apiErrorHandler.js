/**
 * API Error Handler
 * 
 * Provides consistent error handling and formatting for API responses.
 */

/**
 * Standard API error response
 */
export class ApiError extends Error {
  constructor(statusCode, message, code = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code || this.getDefaultCode(statusCode);
    this.details = details;
  }

  getDefaultCode(statusCode) {
    const codes = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'SERVER_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codes[statusCode] || 'UNKNOWN_ERROR';
  }

  toJSON() {
    return {
      success: false,
      error: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }
}

/**
 * Validation error
 */
export class ValidationError extends ApiError {
  constructor(message, fields = {}) {
    super(422, message, 'VALIDATION_ERROR', { fields });
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

/**
 * Not found error
 */
export class NotFoundError extends ApiError {
  constructor(resource = 'Resource') {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden') {
    super(403, message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends ApiError {
  constructor(retryAfter = null) {
    super(429, 'Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * Handle API errors and return appropriate response
 * @param {Error} error - Error object
 * @param {Request} request - Next.js request object
 * @returns {Response} Error response
 */
export function handleApiError(error, request = null) {
  console.error('API Error:', error);

  // If it's already an ApiError, use it directly
  if (error instanceof ApiError) {
    return {
      status: error.statusCode,
      body: error.toJSON(),
    };
  }

  // Handle known error types
  if (error.name === 'ValidationError') {
    return {
      status: 422,
      body: {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error.message,
        details: error.fields || {},
      },
    };
  }

  // Database errors
  if (error.code === '23505') { // Unique violation
    return {
      status: 409,
      body: {
        success: false,
        error: 'DUPLICATE_ENTRY',
        message: 'A record with this information already exists',
      },
    };
  }

  if (error.code === '23503') { // Foreign key violation
    return {
      status: 400,
      body: {
        success: false,
        error: 'INVALID_REFERENCE',
        message: 'Referenced record does not exist',
      },
    };
  }

  // Default server error
  return {
    status: 500,
    body: {
      success: false,
      error: 'SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An internal server error occurred'
        : error.message,
    },
  };
}

/**
 * Retry logic wrapper
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries (ms)
 * @returns {Promise} Result of function
 */
export async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on client errors (4xx)
      if (error.statusCode && error.statusCode < 500) {
        throw error;
      }
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

