/**
 * Organization Validation Helpers
 * 
 * Custom validation helper functions for organizations.
 * Provides utilities for slug generation, uniqueness checks, and bulk import validation.
 * 
 * @module validation/organizationValidators
 */

/**
 * Convert text to URL-friendly slug
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes consecutive hyphens
 * - Removes leading/trailing hyphens
 * 
 * @param {string} text - Text to convert to slug
 * @returns {string} Generated slug
 */
export function slugify(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    // Remove special characters, keep only alphanumeric and hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate slug uniqueness (client-side check)
 * Note: Server will double-check this, this is for UX only
 * 
 * @param {string} slug - Slug to check
 * @param {string} [excludeId] - Organization ID to exclude from check (for updates)
 * @param {Function} [checkFn] - Async function to check uniqueness (returns Promise<boolean>)
 * @returns {Promise<Object>} Validation result
 */
export async function validateUniqueSlug(slug, excludeId = null, checkFn = null) {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'Slug is required' };
  }

  // If no check function provided, return format validation only
  if (!checkFn) {
    return { valid: true, isUnique: null, slug };
  }

  try {
    const isUnique = await checkFn(slug, excludeId);
    return {
      valid: true,
      isUnique: !isUnique, // checkFn returns true if exists, so invert
      slug,
      message: isUnique ? 'This slug is already taken' : 'Slug is available',
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to check slug uniqueness',
      slug,
    };
  }
}

/**
 * Validate organization code uniqueness (client-side check)
 * Note: Server will double-check this, this is for UX only
 * 
 * @param {string} code - Code to check
 * @param {string} [excludeId] - Organization ID to exclude from check (for updates)
 * @param {Function} [checkFn] - Async function to check uniqueness (returns Promise<boolean>)
 * @returns {Promise<Object>} Validation result
 */
export async function validateUniqueCode(code, excludeId = null, checkFn = null) {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Organization code is required' };
  }

  // Normalize to uppercase
  const normalizedCode = code.trim().toUpperCase();

  // If no check function provided, return format validation only
  if (!checkFn) {
    return { valid: true, isUnique: null, code: normalizedCode };
  }

  try {
    const isUnique = await checkFn(normalizedCode, excludeId);
    return {
      valid: true,
      isUnique: !isUnique, // checkFn returns true if exists, so invert
      code: normalizedCode,
      message: isUnique ? 'This organization code is already taken' : 'Code is available',
    };
  } catch (error) {
    return {
      valid: false,
      error: 'Failed to check code uniqueness',
      code: normalizedCode,
    };
  }
}

/**
 * Validate timezone against common IANA timezones (client-side helper)
 * This is a basic format check - full validation happens server-side
 * 
 * @param {string} timezone - Timezone to validate
 * @returns {Object} Validation result
 */
export function validateTimezone(timezone) {
  if (!timezone || typeof timezone !== 'string') {
    return { valid: false, error: 'Timezone is required' };
  }

  const trimmed = timezone.trim();

  // Basic format check: must contain at least one slash
  const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$/;
  if (!timezoneRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Timezone must be in IANA format (e.g., Asia/Kolkata)',
    };
  }

  return { valid: true, timezone: trimmed };
}

/**
 * Validate image URL format and basic structure (client-side)
 * Full validation (type, size) happens server-side
 * 
 * @param {string} url - URL to validate
 * @returns {Object} Validation result
 */
export function validateImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = url.trim();

  // Basic URL format check
  try {
    new URL(trimmed);
  } catch (error) {
    return { valid: false, error: 'URL must be in a valid format' };
  }

  // Check for image-like extensions (basic check)
  const lowerUrl = trimmed.toLowerCase();
  const hasImageExtension =
    lowerUrl.endsWith('.png') ||
    lowerUrl.endsWith('.jpg') ||
    lowerUrl.endsWith('.jpeg') ||
    lowerUrl.endsWith('.svg') ||
    lowerUrl.endsWith('.webp') ||
    lowerUrl.includes('image') ||
    lowerUrl.includes('logo') ||
    lowerUrl.includes('icon');

  if (!hasImageExtension) {
    return {
      valid: false,
      error: 'URL should point to an image (PNG, JPG, SVG, or WebP)',
    };
  }

  return { valid: true, url: trimmed };
}

/**
 * Validate and parse bulk import row
 * Validates a single CSV/XLSX row and returns parsed data with errors
 * 
 * @param {Object} row - Row data from CSV/XLSX
 * @param {number} index - Row index (0-based) for error reporting
 * @param {z.ZodSchema} schema - Zod schema for validation
 * @returns {Object} Validation result with data and errors
 */
export function validateBulkImportRow(row, index, schema) {
  try {
    const result = schema.safeParse(row);

    if (result.success) {
      return {
        rowIndex: index,
        valid: true,
        data: result.data,
        errors: null,
      };
    }

    // Format errors
    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    return {
      rowIndex: index,
      valid: false,
      data: null,
      errors,
    };
  } catch (error) {
    return {
      rowIndex: index,
      valid: false,
      data: null,
      errors: [
        {
          field: 'general',
          message: error.message || 'Failed to validate row',
          code: 'UNKNOWN',
        },
      ],
    };
  }
}

/**
 * Validate bulk import file
 * Checks file type and size
 * 
 * @param {File} file - File object
 * @param {Object} options - Validation options
 * @param {number} [options.maxSize=5*1024*1024] - Maximum file size in bytes (default: 5MB)
 * @param {string[]} [options.allowedTypes=['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']] - Allowed MIME types
 * @returns {Object} Validation result
 */
export function validateBulkImportFile(file, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  } = options;

  if (!file) {
    return { valid: false, error: 'File is required' };
  }

  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }

  // Check file type
  const fileType = file.type || '';
  const fileName = file.name || '';
  const isCSV = fileName.toLowerCase().endsWith('.csv');
  const isXLS = fileName.toLowerCase().endsWith('.xls');
  const isXLSX = fileName.toLowerCase().endsWith('.xlsx');
  const isValidType =
    allowedTypes.includes(fileType) || isCSV || isXLS || isXLSX;

  if (!isValidType) {
    return {
      valid: false,
      error: 'File must be CSV or XLSX format',
    };
  }

  return {
    valid: true,
    fileType: isCSV ? 'csv' : isXLSX ? 'xlsx' : isXLS ? 'xls' : 'unknown',
    fileSize: file.size,
  };
}

/**
 * Parse bulk import file (CSV or XLSX) to array of objects
 * This is a client-side parser - actual parsing may need a library like papaparse or xlsx
 * 
 * @param {File} file - File to parse
 * @param {Function} [parseFn] - Custom parse function (receives file, returns Promise<Array>)
 * @returns {Promise<Object>} Parse result with rows array
 */
export async function parseBulkImportFile(file, parseFn = null) {
  if (!file) {
    throw new Error('File is required');
  }

  // If custom parse function provided, use it
  if (parseFn && typeof parseFn === 'function') {
    try {
      const rows = await parseFn(file);
      return {
        success: true,
        rows,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        rows: null,
        error: error.message || 'Failed to parse file',
      };
    }
  }

  // Basic implementation - expects parseFn to be provided
  // In actual implementation, you would use papaparse for CSV or xlsx for XLSX
  return {
    success: false,
    rows: null,
    error: 'Parse function is required. Use papaparse for CSV or xlsx for XLSX files.',
  };
}

/**
 * Generate slug from organization name (auto-generation helper)
 * 
 * @param {string} name - Organization name
 * @param {Function} [checkUniqueFn] - Optional function to check if slug is unique
 * @param {number} [maxAttempts=10] - Maximum attempts to find unique slug
 * @returns {Promise<string>} Generated unique slug
 */
export async function generateUniqueSlug(name, checkUniqueFn = null, maxAttempts = 10) {
  if (!name || typeof name !== 'string') {
    throw new Error('Organization name is required');
  }

  let baseSlug = slugify(name);
  let slug = baseSlug;
  let attempts = 0;

  // If no uniqueness check, return base slug
  if (!checkUniqueFn || typeof checkUniqueFn !== 'function') {
    return baseSlug;
  }

  // Try to find unique slug
  while (attempts < maxAttempts) {
    const exists = await checkUniqueFn(slug);
    if (!exists) {
      return slug; // Found unique slug
    }

    // Append number to make it unique
    attempts++;
    slug = `${baseSlug}-${attempts}`;
  }

  // If couldn't find unique slug, append timestamp
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}

/**
 * Format bulk import errors for display
 * Groups errors by row and field for easier UI display
 * 
 * @param {Array} validationResults - Array of validation results from validateBulkImportRow
 * @returns {Object} Formatted errors grouped by row and field
 */
export function formatBulkImportErrors(validationResults) {
  const errorsByRow = {};
  const errorsByField = {};
  let totalErrors = 0;

  validationResults.forEach((result) => {
    if (!result.valid && result.errors) {
      errorsByRow[result.rowIndex] = result.errors;
      totalErrors += result.errors.length;

      result.errors.forEach((error) => {
        if (!errorsByField[error.field]) {
          errorsByField[error.field] = [];
        }
        errorsByField[error.field].push({
          rowIndex: result.rowIndex,
          message: error.message,
        });
      });
    }
  });

  return {
    errorsByRow,
    errorsByField,
    totalErrors,
    totalRows: validationResults.length,
    validRows: validationResults.filter((r) => r.valid).length,
    invalidRows: validationResults.filter((r) => !r.valid).length,
  };
}

export default {
  slugify,
  validateUniqueSlug,
  validateUniqueCode,
  validateTimezone,
  validateImageUrl,
  validateBulkImportRow,
  validateBulkImportFile,
  parseBulkImportFile,
  generateUniqueSlug,
  formatBulkImportErrors,
};

