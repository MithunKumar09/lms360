/**
 * Database Validation Helpers
 * 
 * Provides validation functions for organization-related data.
 * These functions validate data format and constraints before database operations.
 * 
 * @module db/validations
 */

/**
 * Valid academic level values
 */
export const VALID_ACADEMIC_LEVELS = [
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
export const VALID_ORG_TYPES = [
  'college',
  'university',
  'institute',
  'department',
  'training_center',
];

/**
 * Valid brand asset key names
 */
export const VALID_BRAND_ASSET_KEYS = [
  'header_logo',
  'square_icon',
  'splash_image',
  'loading_mark',
];

/**
 * Valid brand asset variants
 */
export const VALID_BRAND_ASSET_VARIANTS = [
  'light',
  'dark',
  'default',
];

/**
 * Common IANA timezones (common ones for India and surrounding regions)
 * For full list, check: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
 */
const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Kuala_Lumpur',
  'Asia/Bangkok',
  'Asia/Dhaka',
  'Asia/Karachi',
  'Asia/Colombo',
  'Asia/Kathmandu',
  'Asia/Dili',
  'Asia/Manila',
  'Asia/Jakarta',
  'Asia/Ho_Chi_Minh',
  'Asia/Tashkent',
  'Asia/Almaty',
  'Asia/Baku',
  'Asia/Yerevan',
  'Asia/Tbilisi',
  'Asia/Baghdad',
  'Asia/Riyadh',
  'Asia/Tehran',
  'Asia/Qatar',
  'Asia/Kuwait',
  'Asia/Muscat',
  'Asia/Bahrain',
  'Asia/Aden',
  'Asia/Amman',
  'Asia/Beirut',
  'Asia/Damascus',
  'Asia/Gaza',
  'Asia/Hebron',
  'Asia/Jerusalem',
  'Asia/Nicosia',
  'Asia/Famagusta',
];

/**
 * Common locales (language-country codes)
 */
const COMMON_LOCALES = [
  'en-IN', // English (India)
  'en-US', // English (United States)
  'en-GB', // English (United Kingdom)
  'hi-IN', // Hindi (India)
  'ta-IN', // Tamil (India)
  'te-IN', // Telugu (India)
  'kn-IN', // Kannada (India)
  'ml-IN', // Malayalam (India)
  'mr-IN', // Marathi (India)
  'gu-IN', // Gujarati (India)
  'pa-IN', // Punjabi (India)
  'bn-IN', // Bengali (India)
  'ur-IN', // Urdu (India)
];

/**
 * Common ISO-4217 currency codes
 */
const COMMON_CURRENCIES = [
  'INR', // Indian Rupee
  'USD', // US Dollar
  'EUR', // Euro
  'GBP', // British Pound
  'AED', // UAE Dirham
  'SAR', // Saudi Riyal
  'SGD', // Singapore Dollar
  'MYR', // Malaysian Ringgit
  'THB', // Thai Baht
  'BDT', // Bangladeshi Taka
  'PKR', // Pakistani Rupee
  'LKR', // Sri Lankan Rupee
  'NPR', // Nepalese Rupee
  'PHP', // Philippine Peso
  'IDR', // Indonesian Rupiah
  'VND', // Vietnamese Dong
  'CNY', // Chinese Yuan
  'JPY', // Japanese Yen
  'KRW', // South Korean Won
  'AUD', // Australian Dollar
  'CAD', // Canadian Dollar
  'CHF', // Swiss Franc
];

/**
 * Validate slug format
 * Slug must be lowercase, contain only a-z, 0-9, and hyphens, and be 3-120 characters
 * @param {string} slug - Slug to validate
 * @returns {Object} Validation result with valid boolean and error message
 */
export function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'Slug is required and must be a string' };
  }

  const trimmed = slug.trim();

  if (trimmed.length < 3 || trimmed.length > 120) {
    return { valid: false, error: 'Slug must be between 3 and 120 characters' };
  }

  // Must be lowercase and contain only a-z, 0-9, and hyphens
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(trimmed)) {
    return { valid: false, error: 'Slug must be lowercase and contain only letters, numbers, and hyphens' };
  }

  // Cannot start or end with hyphen
  if (trimmed.startsWith('-') || trimmed.endsWith('-')) {
    return { valid: false, error: 'Slug cannot start or end with a hyphen' };
  }

  // Cannot have consecutive hyphens
  if (trimmed.includes('--')) {
    return { valid: false, error: 'Slug cannot contain consecutive hyphens' };
  }

  return { valid: true, slug: trimmed };
}

/**
 * Validate organization code format
 * Code must be uppercase, contain only A-Z and 0-9, and be 2-8 characters
 * @param {string} code - Code to validate
 * @returns {Object} Validation result with valid boolean and error message
 */
export function validateOrgCode(code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Organization code is required and must be a string' };
  }

  const trimmed = code.trim().toUpperCase();

  if (trimmed.length < 2 || trimmed.length > 8) {
    return { valid: false, error: 'Organization code must be between 2 and 8 characters' };
  }

  // Must contain only A-Z and 0-9
  const codeRegex = /^[A-Z0-9]+$/;
  if (!codeRegex.test(trimmed)) {
    return { valid: false, error: 'Organization code must contain only uppercase letters and numbers' };
  }

  return { valid: true, code: trimmed };
}

/**
 * Validate timezone against common IANA timezones
 * @param {string} timezone - Timezone to validate
 * @returns {Object} Validation result with valid boolean and error message
 */
export function validateTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string') {
    return { valid: false, error: 'Timezone is required and must be a string' };
  }

  const trimmed = timezone.trim();

  // Basic format check: must contain at least one slash (e.g., Asia/Kolkata)
  const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$/;
  if (!timezoneRegex.test(trimmed)) {
    return { valid: false, error: 'Timezone must be in IANA format (e.g., Asia/Kolkata)' };
  }

  // Check against common timezones (loose validation - allow any valid format)
  // In production, you might want to check against a full IANA timezone list
  // For now, we validate format only and let database constraints handle invalid values

  return { valid: true, timezone: trimmed };
}

/**
 * Validate locale format (e.g., en-IN)
 * @param {string} locale - Locale to validate
 * @returns {Object} Validation result with valid boolean and error message
 */
export function validateLocale(locale) {
  if (!locale || typeof locale !== 'string') {
    return { valid: false, error: 'Locale is required and must be a string' };
  }

  const trimmed = locale.trim();

  // Format: language-code (2 chars) - country-code (2 chars, optional)
  const localeRegex = /^[a-z]{2}(-[A-Z]{2})?$/;
  if (!localeRegex.test(trimmed)) {
    return { valid: false, error: 'Locale must be in format: ll-CC (e.g., en-IN)' };
  }

  return { valid: true, locale: trimmed };
}

/**
 * Validate ISO-4217 currency code
 * @param {string} currency - Currency code to validate
 * @returns {Object} Validation result with valid boolean and error message
 */
export function validateCurrency(currency) {
  if (!currency || typeof currency !== 'string') {
    return { valid: false, error: 'Currency is required and must be a string' };
  }

  const trimmed = currency.trim().toUpperCase();

  // ISO-4217 codes are exactly 3 uppercase letters
  const currencyRegex = /^[A-Z]{3}$/;
  if (!currencyRegex.test(trimmed)) {
    return { valid: false, error: 'Currency must be a valid ISO-4217 code (3 uppercase letters)' };
  }

  return { valid: true, currency: trimmed };
}

/**
 * Validate academic levels array
 * Each level must be one of the valid academic levels
 * @param {Array} levels - Academic levels array
 * @returns {Object} Validation result with valid boolean and error message
 */
export function validateAcademicLevels(levels) {
  if (!Array.isArray(levels)) {
    return { valid: false, error: 'Academic levels must be an array' };
  }

  if (levels.length === 0) {
    return { valid: true, levels: [] };
  }

  // Check for invalid levels
  const invalidLevels = levels.filter((level) => !VALID_ACADEMIC_LEVELS.includes(level));

  if (invalidLevels.length > 0) {
    return {
      valid: false,
      error: `Invalid academic levels: ${invalidLevels.join(', ')}. Valid levels: ${VALID_ACADEMIC_LEVELS.join(', ')}`,
    };
  }

  // Remove duplicates
  const uniqueLevels = [...new Set(levels)];

  return { valid: true, levels: uniqueLevels };
}

/**
 * Validate organization type
 * @param {string} orgType - Organization type to validate
 * @returns {Object} Validation result with valid boolean and error message
 */
export function validateOrgType(orgType) {
  if (!orgType || typeof orgType !== 'string') {
    return { valid: false, error: 'Organization type is required and must be a string' };
  }

  const trimmed = orgType.trim().toLowerCase();

  if (!VALID_ORG_TYPES.includes(trimmed)) {
    return {
      valid: false,
      error: `Invalid organization type: ${trimmed}. Valid types: ${VALID_ORG_TYPES.join(', ')}`,
    };
  }

  return { valid: true, orgType: trimmed };
}

/**
 * Validate brand asset key name
 * @param {string} keyName - Brand asset key to validate
 * @returns {Object} Validation result with valid boolean and error message
 */
export function validateBrandAssetKey(keyName) {
  if (!keyName || typeof keyName !== 'string') {
    return { valid: false, error: 'Brand asset key is required and must be a string' };
  }

  const trimmed = keyName.trim().toLowerCase();

  if (!VALID_BRAND_ASSET_KEYS.includes(trimmed)) {
    return {
      valid: false,
      error: `Invalid brand asset key: ${trimmed}. Valid keys: ${VALID_BRAND_ASSET_KEYS.join(', ')}`,
    };
  }

  return { valid: true, keyName: trimmed };
}

/**
 * Validate brand asset variant
 * @param {string} variant - Brand asset variant to validate
 * @returns {Object} Validation result with valid boolean and error message
 */
export function validateBrandAssetVariant(variant) {
  if (!variant || typeof variant !== 'string') {
    return { valid: false, error: 'Brand asset variant is required and must be a string' };
  }

  const trimmed = variant.trim().toLowerCase();

  if (!VALID_BRAND_ASSET_VARIANTS.includes(trimmed)) {
    return {
      valid: false,
      error: `Invalid brand asset variant: ${trimmed}. Valid variants: ${VALID_BRAND_ASSET_VARIANTS.join(', ')}`,
    };
  }

  return { valid: true, variant: trimmed };
}

/**
 * Validate academic year start month (1-12)
 * @param {number} month - Month number to validate
 * @returns {Object} Validation result with valid boolean and error message
 */
export function validateAcademicYearStartMonth(month) {
  if (typeof month !== 'number' || isNaN(month)) {
    return { valid: false, error: 'Academic year start month must be a number' };
  }

  if (month < 1 || month > 12) {
    return { valid: false, error: 'Academic year start month must be between 1 and 12' };
  }

  return { valid: true, month: Math.floor(month) };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} Validation result with valid boolean and error message
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required and must be a string' };
  }

  const trimmed = email.trim().toLowerCase();

  // Basic email regex (same as database constraint)
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Email must be in a valid format' };
  }

  return { valid: true, email: trimmed };
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {Object} Validation result with valid boolean and error message
 */
export function validateUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required and must be a string' };
  }

  const trimmed = url.trim();

  // Basic URL regex (same as database constraint)
  const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/;
  if (!urlRegex.test(trimmed)) {
    return { valid: false, error: 'URL must be in a valid format (http:// or https://)' };
  }

  return { valid: true, url: trimmed };
}

/**
 * Get list of valid academic levels
 * @returns {string[]} Array of valid academic level strings
 */
export function getValidAcademicLevels() {
  return [...VALID_ACADEMIC_LEVELS];
}

/**
 * Get list of valid organization types
 * @returns {string[]} Array of valid organization type strings
 */
export function getValidOrgTypes() {
  return [...VALID_ORG_TYPES];
}

/**
 * Get list of valid brand asset keys
 * @returns {string[]} Array of valid brand asset key strings
 */
export function getValidBrandAssetKeys() {
  return [...VALID_BRAND_ASSET_KEYS];
}

