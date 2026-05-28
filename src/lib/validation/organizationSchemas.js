//src/lib/validation/organizationSchemas.js
/**
 * Organization Validation Schemas
 * 
 * Zod validation schemas for organization forms (create, update, bulk import).
 * Provides type-safe validation with user-friendly error messages.
 * 
 * @module validation/organizationSchemas
 */

import { z } from 'zod';
import { emailSchema, urlSchema, validateForm } from './schemas.js';

/**
 * Valid academic level values
 */
const VALID_ACADEMIC_LEVELS = [
  'primary',
  'high_school',
  'puc',
  'degree',
  'diploma',
  'engineering',
  'post_graduation',
];

/**
 * Valid organization types
 */
const VALID_ORG_TYPES = [
  'college',
  'university',
  'institute',
  'department',
  'training_center',
];

/**
 * Valid brand asset key names
 */
const VALID_BRAND_ASSET_KEYS = [
  'header_logo',
  'square_icon',
  'splash_image',
  'loading_mark',
];

/**
 * Valid brand asset variants
 */
const VALID_BRAND_ASSET_VARIANTS = [
  'light',
  'dark',
  'default',
];

// ============================================================================
// FIELD SCHEMAS
// ============================================================================

/**
 * Organization name schema (3-120 characters)
 */
export const organizationNameSchema = z
  .string()
  .min(1, 'Organization name is required')
  .min(3, 'Organization name must be at least 3 characters')
  .max(120, 'Organization name must be at most 120 characters')
  .trim();

/**
 * Organization slug schema (auto-generated, editable, unique check)
 * Format: lowercase, a-z0-9-, 3-120 chars
 */
export const organizationSlugSchema = z
  .string()
  .min(1, 'Slug is required')
  .min(3, 'Slug must be at least 3 characters')
  .max(120, 'Slug must be at most 120 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase and contain only letters, numbers, and hyphens')
  .refine((slug) => !slug.startsWith('-') && !slug.endsWith('-'), {
    message: 'Slug cannot start or end with a hyphen',
  })
  .refine((slug) => !slug.includes('--'), {
    message: 'Slug cannot contain consecutive hyphens',
  })
  .toLowerCase()
  .trim();

/**
 * Organization subdomain schema
 * Format: lowercase, a-z0-9-, 3-63 chars
 */
export const organizationSubdomainSchema = z
  .string()
  .min(1, 'Subdomain is required')
  .min(3, 'Subdomain must be at least 3 characters')
  .max(63, 'Subdomain must be at most 63 characters')
  .regex(
    /^[a-z0-9-]+$/,
    'Subdomain must contain only lowercase letters, numbers, and hyphens'
  )
  .refine((value) => !value.startsWith('-') && !value.endsWith('-'), {
    message: 'Subdomain cannot start or end with a hyphen',
  })
  .refine((value) => !value.includes('--'), {
    message: 'Subdomain cannot contain consecutive hyphens',
  })
  .refine(
  (value) =>
    ![
      'www',
      'api',
      'admin',
      'app',
      'mail',
      'smtp',
      'dashboard',
      'superadmin',
      'root',
      'system',
      'cdn',
      'assets',
      'static',
    ].includes(value),
  {
    message: 'This subdomain is reserved',
  }
)
  .toLowerCase()
  .trim();

/**
 * Organization type schema (enum)
 */
export const organizationTypeSchema = z.enum(VALID_ORG_TYPES, {
  errorMap: () => ({ message: 'Please select a valid organization type' }),
});

/**
 * Organization code schema (2-8 chars, A-Z0-9, unique check)
 */
export const organizationCodeSchema = z
  .string()
  .min(1, 'Organization code is required')
  .min(2, 'Organization code must be at least 2 characters')
  .max(8, 'Organization code must be at most 8 characters')
  .trim()
  .regex(/^[A-Za-z0-9]+$/, 'Organization code must contain only letters and numbers')
  .transform((val) => val.toUpperCase());

/**
 * Academic levels array schema
 */
export const academicLevelsSchema = z
  .array(z.enum(VALID_ACADEMIC_LEVELS))
  .optional()
  .default([]);

/**
 * IANA timezone schema
 * Format: Continent/City (e.g., Asia/Kolkata)
 */
export const timezoneSchema = z
  .string()
  .min(1, 'Timezone is required')
  .regex(/^[A-Za-z_]+\/[A-Za-z_]+$/, 'Timezone must be in IANA format (e.g., Asia/Kolkata)')
  .trim();

/**
 * Locale schema
 * Format: ll-CC (e.g., en-IN)
 */
export const localeSchema = z
  .string()
  .min(1, 'Locale is required')
  .trim()
  .transform((val) => {
    const parts = String(val).trim().split('-');
    if (parts.length === 1) {
      return parts[0].toLowerCase();
    }
    const [lang, country] = parts;
    return `${String(lang).toLowerCase()}-${String(country).toUpperCase()}`;
  })
  .refine((val) => /^[a-z]{2}(-[A-Z]{2})?$/.test(val), {
    message: 'Locale must be in format: ll-CC (e.g., en-IN)',
  });

/**
 * ISO-4217 currency code schema (3 uppercase letters)
 */
export const currencySchema = z
  .string()
  .min(1, 'Currency is required')
  .trim()
  .length(3, 'Currency must be exactly 3 characters')
  .transform((val) => val.toUpperCase())
  .refine((val) => /^[A-Z]{3}$/.test(val), {
    message: 'Currency must be a valid ISO-4217 code (3 uppercase letters)',
  });

/**
 * Academic year start month schema (1-12)
 */
export const academicYearStartMonthSchema = z
  .number()
  .int('Academic year start month must be a whole number')
  .min(1, 'Academic year start month must be between 1 and 12')
  .max(12, 'Academic year start month must be between 1 and 12');

/**
 * Brand asset URL schema (for image URLs)
 */
export const brandAssetUrlSchema = z
  .string()
  .min(1, 'URL is required')
  .url('Please enter a valid image URL')
  .refine(
    (url) => {
      const lowerUrl = url.toLowerCase();
      return (
        lowerUrl.endsWith('.png') ||
        lowerUrl.endsWith('.jpg') ||
        lowerUrl.endsWith('.jpeg') ||
        lowerUrl.endsWith('.svg') ||
        lowerUrl.endsWith('.webp') ||
        lowerUrl.includes('image') ||
        lowerUrl.includes('logo') ||
        lowerUrl.includes('icon')
      );
    },
    {
      message: 'URL must point to a valid image (PNG, JPG, SVG, or WebP)',
    }
  );

/**
 * Extended phone schema for contact phone
 */
export const contactPhoneSchema = z
  .string()
  .regex(/^\+?[0-9\s\-\(\)]{7,20}$/, 'Please enter a valid phone number')
  .optional()
  .nullable();

/**
 * Website URL schema (optional)
 */
export const websiteUrlSchema = urlSchema.optional().nullable();

/**
 * Display name schema (optional)
 */
export const displayNameSchema = z
  .string()
  .max(255, 'Display name must be at most 255 characters')
  .optional()
  .nullable();

// ============================================================================
// NESTED SCHEMAS
// ============================================================================

/**
 * Primary admin schema
 */
export const primaryAdminSchema = z.object({
  name: z
    .string()
    .min(1, 'Primary admin name is required')
    .max(255, 'Primary admin name must be at most 255 characters')
    .trim(),
  email: emailSchema,
});

/**
 * Brand asset schema
 */
export const brandAssetSchema = z.object({
  key_name: z.enum(VALID_BRAND_ASSET_KEYS, {
    errorMap: () => ({ message: 'Invalid brand asset key' }),
  }),
  url: brandAssetUrlSchema,
  variant: z.enum(VALID_BRAND_ASSET_VARIANTS).optional().default('default'),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  format: z.enum(['png', 'jpeg', 'svg', 'webp']).optional().nullable(),
  bytes: z.number().int().positive().optional().nullable(),
  checksum: z.string().length(32).or(z.string().length(64)).optional().nullable(),
});

/**
 * Brand assets array schema (optional)
 */
export const brandAssetsSchema = z.array(brandAssetSchema).optional().default([]);

// ============================================================================
// MAIN SCHEMAS
// ============================================================================

/**
 * Organization create schema (full validation)
 */
export const organizationCreateSchema = z
  .object({
    // Basic info
    name: organizationNameSchema,
    slug: organizationSlugSchema,
    subdomain: organizationSubdomainSchema,
    org_type: organizationTypeSchema,
    display_name: displayNameSchema,
    org_code: organizationCodeSchema,

    // Location
    country: z
      .string()
      .min(1, 'Country is required')
      .max(100, 'Country must be at most 100 characters')
      .trim(),
    state: z
      .string()
      .min(1, 'State is required')
      .max(100, 'State must be at most 100 characters')
      .trim(),
    city: z
      .string()
      .min(1, 'City is required')
      .max(100, 'City must be at most 100 characters')
      .trim(),

    // Settings
    timezone: timezoneSchema,
    default_locale: localeSchema,
    currency: currencySchema,
    academic_year_start_month: academicYearStartMonthSchema,
    academic_levels: academicLevelsSchema,

    // Primary admin
    primary_admin: primaryAdminSchema,

    // Contact info (optional)
    contact_email: emailSchema.optional().nullable(),
    contact_phone: contactPhoneSchema,
    website_url: websiteUrlSchema,

    // Brand assets (optional)
    brand_assets: brandAssetsSchema,

    // Status (optional, defaults to active)
    status: z.enum(['active', 'inactive', 'suspended']).optional().default('active'),
  })
  .refine(
    (data) => {
      // Validate slug uniqueness will be checked server-side
      // This is just format validation
      return true;
    },
    {
      message: 'Slug must be unique',
      path: ['slug'],
    }
  )
  .refine(
    (data) => {
      // Validate code uniqueness will be checked server-side
      return true;
    },
    {
      message: 'Organization code must be unique',
      path: ['org_code'],
    }
  );

/**
 * Organization update schema (partial validation)
 * All fields are optional except for the ones being updated
 */
export const organizationUpdateSchema = z
  .object({
    // Basic info (all optional)
    name: organizationNameSchema.optional(),
    slug: organizationSlugSchema.optional(),
    subdomain: organizationSubdomainSchema.optional(),
    org_type: organizationTypeSchema.optional(),
    display_name: displayNameSchema,
    org_code: organizationCodeSchema.optional(),

    // Location (all optional)
    country: z
      .string()
      .min(1, 'Country cannot be empty')
      .max(100, 'Country must be at most 100 characters')
      .trim()
      .optional(),
    state: z
      .string()
      .min(1, 'State cannot be empty')
      .max(100, 'State must be at most 100 characters')
      .trim()
      .optional(),
    city: z
      .string()
      .min(1, 'City cannot be empty')
      .max(100, 'City must be at most 100 characters')
      .trim()
      .optional(),

    // Settings (all optional)
    timezone: timezoneSchema.optional(),
    default_locale: localeSchema.optional(),
    currency: currencySchema.optional(),
    academic_year_start_month: academicYearStartMonthSchema.optional(),
    academic_levels: z.array(z.enum(VALID_ACADEMIC_LEVELS)).optional().nullable(),

    // Primary admin (optional, but if provided, both fields required)
    primary_admin: primaryAdminSchema.optional(),

    // Contact info (all optional)
    contact_email: emailSchema.optional().nullable(),
    contact_phone: contactPhoneSchema,
    website_url: websiteUrlSchema,

    // Brand assets (optional)
    brand_assets: brandAssetsSchema,

    // Status (optional)
    status: z.enum(['active', 'inactive', 'suspended']).optional(),

    // Plan tier (optional, superadmin only — enforced at API layer)
    plan_tier: z.enum(['basic', 'pro', 'enterprise']).optional(),
  })
  .refine(
    (data) => {
      // If primary_admin is provided, both name and email must be present
      if (data.primary_admin !== undefined && data.primary_admin !== null) {
        return (
          data.primary_admin.name !== undefined &&
          data.primary_admin.email !== undefined
        );
      }
      return true;
    },
    {
      message: 'Primary admin must include both name and email',
      path: ['primary_admin'],
    }
  );

/**
 * Organization bulk import schema (for CSV/XLSX rows)
 * Similar to create schema but allows some fields to be optional or have defaults
 */
export const organizationBulkImportSchema = z
  .object({
    // Basic info (required)
    name: organizationNameSchema,
    slug: organizationSlugSchema.optional(), // Auto-generated if not provided
    subdomain: organizationSubdomainSchema.optional(),
    org_type: organizationTypeSchema,
    display_name: displayNameSchema,
    org_code: organizationCodeSchema,

    // Location (required)
    country: z.string().min(1, 'Country is required').max(100).trim(),
    state: z.string().min(1, 'State is required').max(100).trim(),
    city: z.string().min(1, 'City is required').max(100).trim(),

    // Settings (required)
    timezone: timezoneSchema,
    default_locale: localeSchema,
    currency: currencySchema,
    academic_year_start_month: academicYearStartMonthSchema,
    academic_levels: z
      .string()
      .optional()
      .transform((val) => {
        // Parse comma-separated or pipe-separated list
        if (!val) return [];
        return val.split(/[,|]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      })
      .pipe(academicLevelsSchema),

    // Primary admin (required)
    primary_admin_name: z
      .string()
      .min(1, 'Primary admin name is required')
      .max(255)
      .trim(),
    primary_admin_email: emailSchema,

    // Contact info (optional)
    contact_email: emailSchema.optional().nullable(),
    contact_phone: contactPhoneSchema,
    website_url: websiteUrlSchema,

    // Brand assets (optional URLs)
    header_logo_url: brandAssetUrlSchema.optional().nullable(),
    square_icon_url: brandAssetUrlSchema.optional().nullable(),
    splash_image_url: brandAssetUrlSchema.optional().nullable(),
    loading_mark_url: brandAssetUrlSchema.optional().nullable(),

    // Status (optional, defaults to active)
    status: z.enum(['active', 'inactive', 'suspended']).optional().default('active'),
  })
  .transform((data) => {
    // Transform bulk import format to create format
    const brandAssets = [];
    if (data.header_logo_url) {
      brandAssets.push({ key_name: 'header_logo', url: data.header_logo_url, variant: 'default' });
    }
    if (data.square_icon_url) {
      brandAssets.push({ key_name: 'square_icon', url: data.square_icon_url, variant: 'default' });
    }
    if (data.splash_image_url) {
      brandAssets.push({ key_name: 'splash_image', url: data.splash_image_url, variant: 'default' });
    }
    if (data.loading_mark_url) {
      brandAssets.push({ key_name: 'loading_mark', url: data.loading_mark_url, variant: 'default' });
    }

    return {
      name: data.name,
      slug: data.slug, // May be undefined, will be auto-generated if not provided
      subdomain: data.subdomain || data.slug,
      org_type: data.org_type,
      display_name: data.display_name,
      org_code: data.org_code,
      country: data.country,
      state: data.state,
      city: data.city,
      timezone: data.timezone,
      default_locale: data.default_locale,
      currency: data.currency,
      academic_year_start_month: data.academic_year_start_month,
      academic_levels: data.academic_levels || [],
      primary_admin: {
        name: data.primary_admin_name,
        email: data.primary_admin_email,
      },
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      website_url: data.website_url || null,
      brand_assets: brandAssets,
      status: data.status || 'active',
    };
  });

// ============================================================================
// EXPORTS
// ============================================================================

export {
  VALID_ACADEMIC_LEVELS,
  VALID_ORG_TYPES,
  VALID_BRAND_ASSET_KEYS,
  VALID_BRAND_ASSET_VARIANTS,
  validateForm,
};

export default {
  organizationCreateSchema,
  organizationUpdateSchema,
  organizationBulkImportSchema,
  // Field schemas
  organizationNameSchema,
  organizationSlugSchema,
  organizationTypeSchema,
  organizationCodeSchema,
  academicLevelsSchema,
  timezoneSchema,
  localeSchema,
  currencySchema,
  academicYearStartMonthSchema,
  brandAssetUrlSchema,
  contactPhoneSchema,
  websiteUrlSchema,
  displayNameSchema,
  // Nested schemas
  primaryAdminSchema,
  brandAssetSchema,
  brandAssetsSchema,
};

