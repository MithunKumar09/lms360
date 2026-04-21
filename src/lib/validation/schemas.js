/**
 * Validation Schemas
 * 
 * Zod validation schemas for form validation.
 * Provides type-safe validation with user-friendly error messages.
 */

import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .toLowerCase()
  .trim();

/**
 * Password validation schema
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export const passwordSchema = z
  .string()
  .min(1, 'Password is required')
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

/**
 * Password confirmation schema
 */
export const passwordConfirmSchema = (passwordField = 'password') =>
  z
    .string()
    .min(1, 'Please confirm your password')
    .refine((data, ctx) => {
      const formData = ctx.path.length > 0 ? ctx.path[0] : null;
      // This will be handled in the form validation
      return true;
    }, 'Passwords do not match');

/**
 * TOTP code validation schema (6 digits)
 */
export const totpCodeSchema = z
  .string()
  .min(1, 'Code is required')
  .length(6, 'Code must be exactly 6 digits')
  .regex(/^\d{6}$/, 'Code must contain only numbers');

/**
 * Backup code validation schema (8-10 alphanumeric characters)
 */
export const backupCodeSchema = z
  .string()
  .min(1, 'Backup code is required')
  .min(8, 'Backup code must be at least 8 characters')
  .max(10, 'Backup code must be at most 10 characters')
  .regex(/^[A-Za-z0-9]+$/, 'Backup code must contain only letters and numbers');

/**
 * Phone number validation schema
 */
export const phoneSchema = z
  .string()
  .min(1, 'Phone number is required')
  .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number');

/**
 * URL validation schema
 */
export const urlSchema = z
  .string()
  .min(1, 'URL is required')
  .url('Please enter a valid URL');

/**
 * Login form schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

/**
 * MFA verification schema
 */
export const mfaVerifySchema = z.object({
  email: emailSchema,
  code: totpCodeSchema,
  isBackupCode: z.boolean().optional().default(false),
});

/**
 * MFA setup verification schema
 */
export const mfaSetupVerifySchema = z.object({
  code: totpCodeSchema,
});

/**
 * Forgot password schema (request reset email)
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

/**
 * Reset password schema (set new password after token verification)
 * Uses 12-char minimum to align with backend validatePasswordStrength()
 */
export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .min(12, 'Password must be at least 12 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Change password schema
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Update user schema
 */
export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be at most 50 characters').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be at most 50 characters').optional(),
  phone: phoneSchema.optional(),
});

/**
 * Profile update schema (extended for settings page)
 */
export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name must be at most 50 characters').optional(),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be at most 50 characters').optional(),
  username: z.string().max(30, 'Username must be at most 30 characters').optional().nullable(),
  phone: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val === '' || /^\+?[1-9]\d{1,14}$/.test(val), {
      message: 'Please enter a valid phone number',
    }),
  skill: z.string().max(100, 'Skill must be at most 100 characters').optional().nullable(),
  displayName: z.string().max(100, 'Display name must be at most 100 characters').optional().nullable(),
  bio: z.string().max(1000, 'Bio must be at most 1000 characters').optional().nullable(),
  avatar_url: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'Invalid URL format',
    }),
});

/**
 * Social links schema
 */
export const socialLinksSchema = z.object({
  facebook: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'Invalid Facebook URL',
    }),
  twitter: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'Invalid Twitter URL',
    }),
  linkedin: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'Invalid LinkedIn URL',
    }),
  website: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'Invalid website URL',
    }),
  github: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || val === '' || z.string().url().safeParse(val).success, {
      message: 'Invalid GitHub URL',
    }),
});

/**
 * Generic string schema with min/max length
 */
export const stringSchema = (min = 1, max = null) => {
  let schema = z.string().min(min, `Must be at least ${min} characters`);
  if (max) {
    schema = schema.max(max, `Must be at most ${max} characters`);
  }
  return schema;
};

/**
 * Generic number schema with min/max
 */
export const numberSchema = (min = null, max = null) => {
  let schema = z.number();
  if (min !== null) {
    schema = schema.min(min, `Must be at least ${min}`);
  }
  if (max !== null) {
    schema = schema.max(max, `Must be at most ${max}`);
  }
  return schema;
};

/**
 * Validate data against schema
 * @param {z.ZodSchema} schema - Zod schema
 * @param {*} data - Data to validate
 * @returns {Object} Validation result
 */
export const validateSchema = (schema, data) => {
  try {
    const result = schema.parse(data);
    return {
      success: true,
      data: result,
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = (error.issues || []).map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return {
        success: false,
        data: null,
        errors,
      };
    }
    throw error;
  }
};

/**
 * Safe parse (doesn't throw)
 * @param {z.ZodSchema} schema - Zod schema
 * @param {*} data - Data to validate
 * @returns {Object} Validation result
 */
export const safeParse = (schema, data) => {
  const result = schema.safeParse(data);
  if (result.success) {
    return {
      success: true,
      data: result.data,
      errors: null,
    };
  } else {
    const issues = result.error?.issues || [];
    const errors = issues.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    }));
    return {
      success: false,
      data: null,
      errors,
    };
  }
};

/**
 * Validate form data against schema (alias for safeParse with error formatting)
 * @param {z.ZodSchema} schema - Zod schema
 * @param {*} data - Data to validate
 * @returns {Object} Validation result with errors formatted as object
 */
export const validateForm = (schema, data) => {
  const result = safeParse(schema, data);
  
  if (!result.success && result.errors) {
    // Convert array of errors to object format for easier form handling
    const errorsObj = {};
    result.errors.forEach((error) => {
      // Use the path as key, or 'general' if no path
      const key = error.path || 'general';
      errorsObj[key] = error.message;
    });
    return {
      success: false,
      data: null,
      errors: errorsObj,
    };
  }
  
  return {
    success: result.success,
    data: result.data,
    errors: result.success ? {} : null,
  };
};

const schemas = {
  emailSchema,
  passwordSchema,
  passwordConfirmSchema,
  totpCodeSchema,
  backupCodeSchema,
  phoneSchema,
  urlSchema,
  loginSchema,
  mfaVerifySchema,
  mfaSetupVerifySchema,
  changePasswordSchema,
  updateUserSchema,
  updateProfileSchema,
  socialLinksSchema,
  stringSchema,
  numberSchema,
  validateSchema,
  safeParse,
  validateForm,
};

export default schemas;


