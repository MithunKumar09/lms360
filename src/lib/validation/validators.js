/**
 * Validation Functions
 * 
 * Reusable validation functions and custom validation rules.
 * Provides validation error formatters.
 */

import { validateSchema, safeParse } from './schemas.js';

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
export const validateEmail = (email) => {
  const { emailSchema } = require('./schemas.js');
  return safeParse(emailSchema, email);
};

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export const validatePassword = (password) => {
  const { passwordSchema } = require('./schemas.js');
  return safeParse(passwordSchema, password);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Password strength result
 */
export const validatePasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const strength = Object.values(checks).filter(Boolean).length;
  const isStrong = strength >= 4 && checks.length;

  return {
    isValid: isStrong,
    strength,
    checks,
    message: isStrong
      ? 'Password is strong'
      : 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  };
};

/**
 * Validate TOTP code
 * @param {string} code - TOTP code to validate
 * @returns {Object} Validation result
 */
export const validateTotpCode = (code) => {
  const { totpCodeSchema } = require('./schemas.js');
  return safeParse(totpCodeSchema, code);
};

/**
 * Validate backup code
 * @param {string} code - Backup code to validate
 * @returns {Object} Validation result
 */
export const validateBackupCode = (code) => {
  const { backupCodeSchema } = require('./schemas.js');
  return safeParse(backupCodeSchema, code);
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {Object} Validation result
 */
export const validatePhone = (phone) => {
  const { phoneSchema } = require('./schemas.js');
  return safeParse(phoneSchema, phone);
};

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {Object} Validation result
 */
export const validateUrl = (url) => {
  const { urlSchema } = require('./schemas.js');
  return safeParse(urlSchema, url);
};

/**
 * Format validation errors for display
 * @param {Array} errors - Validation errors
 * @returns {Object} Formatted errors by field
 */
export const formatValidationErrors = (errors) => {
  if (!errors || !Array.isArray(errors)) {
    return {};
  }

  const formatted = {};
  errors.forEach((error) => {
    const field = error.path || error.field || 'general';
    formatted[field] = error.message || 'Invalid value';
  });

  return formatted;
};

/**
 * Get first validation error message
 * @param {Array} errors - Validation errors
 * @returns {string|null} First error message
 */
export const getFirstError = (errors) => {
  if (!errors || !Array.isArray(errors) || errors.length === 0) {
    return null;
  }

  return errors[0].message || 'Validation error';
};

/**
 * Check if field has error
 * @param {Object} errors - Formatted errors object
 * @param {string} field - Field name
 * @returns {boolean} Whether field has error
 */
export const hasFieldError = (errors, field) => {
  return !!(errors && errors[field]);
};

/**
 * Get field error message
 * @param {Object} errors - Formatted errors object
 * @param {string} field - Field name
 * @returns {string|null} Field error message
 */
export const getFieldError = (errors, field) => {
  return errors && errors[field] ? errors[field] : null;
};

/**
 * Validate form data
 * @param {z.ZodSchema} schema - Validation schema
 * @param {Object} data - Form data
 * @returns {Object} Validation result with formatted errors
 */
export const validateForm = (schema, data) => {
  const result = safeParse(schema, data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: {},
    };
  }

  return {
    success: false,
    data: null,
    errors: formatValidationErrors(result.errors),
  };
};

/**
 * Custom validation rules
 */
export const customRules = {
  /**
   * Check if value matches another field
   */
  matches: (fieldName, message = 'Values do not match') => ({
    validate: (value, formData) => {
      return value === formData[fieldName] || message;
    },
  }),

  /**
   * Check if value is unique (async)
   */
  unique: (checkFn, message = 'Value must be unique') => ({
    validate: async (value) => {
      const isUnique = await checkFn(value);
      return isUnique || message;
    },
  }),

  /**
   * Check if value is not in list
   */
  notIn: (list, message = 'Value is not allowed') => ({
    validate: (value) => {
      return !list.includes(value) || message;
    },
  }),

  /**
   * Check if value is in list
   */
  in: (list, message = 'Value is not valid') => ({
    validate: (value) => {
      return list.includes(value) || message;
    },
  }),
};

export default {
  validateEmail,
  validatePassword,
  validatePasswordStrength,
  validateTotpCode,
  validateBackupCode,
  validatePhone,
  validateUrl,
  formatValidationErrors,
  getFirstError,
  hasFieldError,
  getFieldError,
  validateForm,
  customRules,
};


