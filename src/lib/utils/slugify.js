/**
 * Slugify Utility
 * 
 * Client-side slug generation utility.
 * Converts text to URL-friendly slugs (lowercase, a-z0-9-, no spaces).
 * 
 * @module utils/slugify
 */

/**
 * Convert text to slug
 * 
 * @param {string} text - Text to convert
 * @returns {string} Slug string
 * 
 * @example
 * slugify('Example University') // 'example-university'
 * slugify('Test & Demo!') // 'test-demo'
 */
export function slugify(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toString()
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove special characters except hyphens
    .replace(/[^\w\-]+/g, '')
    // Replace multiple hyphens with single hyphen
    .replace(/\-\-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Validate slug format
 * 
 * @param {string} slug - Slug to validate
 * @returns {boolean} True if valid
 */
export function isValidSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return false;
  }

  // Must be lowercase, a-z0-9-, 3-120 chars
  const slugRegex = /^[a-z0-9-]{3,120}$/;
  if (!slugRegex.test(slug)) {
    return false;
  }

  // Cannot start or end with hyphen
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return false;
  }

  // Cannot contain consecutive hyphens
  if (slug.includes('--')) {
    return false;
  }

  return true;
}

export default slugify;

