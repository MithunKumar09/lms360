/**
 * Error Messages
 * 
 * Centralized user-friendly error messages.
 * Localization-ready structure for future i18n support.
 */

/**
 * Error Message Categories
 */
export const ErrorCategories = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NETWORK: 'network',
  SERVER: 'server',
  NOT_FOUND: 'not_found',
  RATE_LIMIT: 'rate_limit',
  MFA: 'mfa',
  UNKNOWN: 'unknown',
};

/**
 * User-friendly error messages
 */
export const errorMessages = {
  // Validation errors
  [ErrorCategories.VALIDATION]: {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    emailInvalid: 'The email address format is invalid',
    password: 'Password is required',
    passwordMinLength: 'Password must be at least 8 characters long',
    passwordStrength: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    passwordMatch: 'Passwords do not match',
    totpCode: 'Please enter a valid 6-digit code',
    totpCodeInvalid: 'The code must be exactly 6 digits',
    phoneNumber: 'Please enter a valid phone number',
    url: 'Please enter a valid URL',
    number: 'Please enter a valid number',
    min: (min) => `Value must be at least ${min}`,
    max: (max) => `Value must be at most ${max}`,
    minLength: (min) => `Must be at least ${min} characters`,
    maxLength: (max) => `Must be at most ${max} characters`,
    pattern: 'Invalid format',
  },

  // Authentication errors
  [ErrorCategories.AUTHENTICATION]: {
    invalidCredentials: 'Invalid email or password',
    accountLocked: (minutes) => `Account temporarily locked. Please try again in ${minutes} minute(s).`,
    accountInactive: 'Your account is inactive. Please contact support.',
    sessionExpired: 'Your session has expired. Please log in again.',
    tokenInvalid: 'Invalid or expired token',
    tokenMissing: 'Authentication token is missing',
    loginRequired: 'Please log in to continue',
    logoutFailed: 'Failed to log out. Please try again.',
  },

  // Authorization errors
  [ErrorCategories.AUTHORIZATION]: {
    forbidden: 'You do not have permission to perform this action',
    insufficientPermissions: 'You do not have sufficient permissions',
    roleRequired: (role) => `This action requires ${role} role`,
    accessDenied: 'Access denied',
  },

  // Network errors
  [ErrorCategories.NETWORK]: {
    connectionFailed: 'Connection failed. Please check your internet connection.',
    timeout: 'Request timed out. Please try again.',
    offline: 'You are currently offline. Please check your internet connection.',
    serverUnreachable: 'Server is unreachable. Please try again later.',
  },

  // Server errors
  [ErrorCategories.SERVER]: {
    internalError: 'An internal server error occurred. Please try again later.',
    serviceUnavailable: 'Service is temporarily unavailable. Please try again later.',
    badGateway: 'Bad gateway error. Please try again later.',
    maintenance: 'The service is under maintenance. Please try again later.',
  },

  // Not found errors
  [ErrorCategories.NOT_FOUND]: {
    resourceNotFound: 'The requested resource was not found',
    userNotFound: 'User not found',
    pageNotFound: 'Page not found',
  },

  // Rate limit errors
  [ErrorCategories.RATE_LIMIT]: {
    tooManyRequests: 'Too many requests. Please try again later.',
    rateLimitExceeded: (retryAfter) => `Rate limit exceeded. Please try again after ${retryAfter} seconds.`,
    tooManyLoginAttempts: 'Too many login attempts. Please try again later.',
  },

  // MFA errors
  [ErrorCategories.MFA]: {
    mfaRequired: 'Multi-factor authentication is required',
    mfaInvalidCode: 'Invalid MFA code. Please try again.',
    mfaCodeExpired: 'MFA code has expired. Please request a new one.',
    mfaSetupFailed: 'Failed to set up MFA. Please try again.',
    mfaVerifyFailed: 'MFA verification failed. Please try again.',
    backupCodeInvalid: 'Invalid backup code. Please try again.',
    backupCodeUsed: 'This backup code has already been used.',
    mfaNotEnabled: 'MFA is not enabled for this account',
  },

  // Unknown errors
  [ErrorCategories.UNKNOWN]: {
    unknownError: 'An unexpected error occurred. Please try again.',
    errorOccurred: 'An error occurred. Please try again.',
  },
};

/**
 * Get user-friendly error message
 * @param {string} category - Error category
 * @param {string} key - Error key
 * @param {*} params - Parameters for message formatting
 * @returns {string} User-friendly error message
 */
export const getErrorMessage = (category, key, params = null) => {
  const categoryMessages = errorMessages[category];
  if (!categoryMessages) {
    return errorMessages[ErrorCategories.UNKNOWN].unknownError;
  }

  const message = categoryMessages[key];
  if (!message) {
    return errorMessages[ErrorCategories.UNKNOWN].unknownError;
  }

  // If message is a function, call it with params
  if (typeof message === 'function') {
    return message(params);
  }

  return message;
};

/**
 * Map technical error to user-friendly message
 * @param {Error|string} error - Error object or message
 * @param {string} category - Error category (optional, will be inferred)
 * @returns {string} User-friendly error message
 */
export const mapErrorToMessage = (error, category = null) => {
  // If error is already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If error is an Error object, check for known error patterns
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Authentication errors
    if (errorMessage.includes('invalid') && (errorMessage.includes('password') || errorMessage.includes('email'))) {
      return getErrorMessage(ErrorCategories.AUTHENTICATION, 'invalidCredentials');
    }
    if (errorMessage.includes('locked')) {
      const minutes = error.data?.minutesRemaining || 15;
      return getErrorMessage(ErrorCategories.AUTHENTICATION, 'accountLocked', minutes);
    }
    if (errorMessage.includes('inactive')) {
      return getErrorMessage(ErrorCategories.AUTHENTICATION, 'accountInactive');
    }
    if (errorMessage.includes('expired') || errorMessage.includes('session')) {
      return getErrorMessage(ErrorCategories.AUTHENTICATION, 'sessionExpired');
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return getErrorMessage(ErrorCategories.NETWORK, 'connectionFailed');
    }
    if (errorMessage.includes('timeout')) {
      return getErrorMessage(ErrorCategories.NETWORK, 'timeout');
    }

    // Rate limit errors
    if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
      return getErrorMessage(ErrorCategories.RATE_LIMIT, 'tooManyRequests');
    }

    // MFA errors
    if (errorMessage.includes('mfa') || errorMessage.includes('totp')) {
      if (errorMessage.includes('invalid')) {
        return getErrorMessage(ErrorCategories.MFA, 'mfaInvalidCode');
      }
      if (errorMessage.includes('expired')) {
        return getErrorMessage(ErrorCategories.MFA, 'mfaCodeExpired');
      }
      return getErrorMessage(ErrorCategories.MFA, 'mfaVerifyFailed');
    }

    // Validation errors
    if (errorMessage.includes('required')) {
      return getErrorMessage(ErrorCategories.VALIDATION, 'required');
    }
    if (errorMessage.includes('email')) {
      return getErrorMessage(ErrorCategories.VALIDATION, 'email');
    }
    if (errorMessage.includes('password')) {
      return getErrorMessage(ErrorCategories.VALIDATION, 'password');
    }

    // Server errors
    if (error.status >= 500) {
      return getErrorMessage(ErrorCategories.SERVER, 'internalError');
    }
    if (error.status === 503) {
      return getErrorMessage(ErrorCategories.SERVER, 'serviceUnavailable');
    }

    // Not found errors
    if (error.status === 404) {
      return getErrorMessage(ErrorCategories.NOT_FOUND, 'resourceNotFound');
    }

    // Forbidden errors
    if (error.status === 403) {
      return getErrorMessage(ErrorCategories.AUTHORIZATION, 'forbidden');
    }

    // Return original message if no mapping found
    return error.message;
  }

  // Default fallback
  return getErrorMessage(ErrorCategories.UNKNOWN, 'unknownError');
};

export default {
  ErrorCategories,
  errorMessages,
  getErrorMessage,
  mapErrorToMessage,
};


