/**
 * Cloudflare R2 Configuration Module
 * 
 * Initializes Cloudflare R2 client with credentials using S3-compatible API.
 * R2 is faster, cheaper, and has no egress fees compared to S3.
 * 
 * Environment Variables Required:
 * - R2_ACCOUNT_ID: Cloudflare account ID
 * - R2_ACCESS_KEY_ID: R2 access key ID
 * - R2_SECRET_ACCESS_KEY: R2 secret access key
 * - R2_BUCKET_NAME: R2 bucket name for uploads
 * - R2_BUCKET_PREFIX: R2 bucket prefix (e.g., org-uploads/)
 * - R2_PUBLIC_URL: R2 public URL or custom domain (e.g., https://pub-xxx.r2.dev or https://cdn.example.com)
 * - R2_CUSTOM_DOMAIN: Custom domain for R2 (optional, falls back to R2_PUBLIC_URL)
 * 
 * @module r2/config
 */

import { S3Client } from '@aws-sdk/client-s3';

/**
 * R2 Configuration
 */
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_BUCKET_PREFIX = process.env.R2_BUCKET_PREFIX || 'org-uploads/';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || process.env.R2_CUSTOM_DOMAIN;
const R2_CUSTOM_DOMAIN = process.env.R2_CUSTOM_DOMAIN;

/**
 * R2 endpoint URL format: https://<account-id>.r2.cloudflarestorage.com
 */
const R2_ENDPOINT = R2_ACCOUNT_ID
  ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  : null;

/**
 * Validate R2 configuration
 */
function validateConfig() {
  const errors = [];

  if (!R2_ACCOUNT_ID) {
    errors.push('R2_ACCOUNT_ID is not set');
  }

  if (!R2_ACCESS_KEY_ID) {
    errors.push('R2_ACCESS_KEY_ID is not set');
  }

  if (!R2_SECRET_ACCESS_KEY) {
    errors.push('R2_SECRET_ACCESS_KEY is not set');
  }

  if (!R2_BUCKET_NAME) {
    errors.push('R2_BUCKET_NAME is not set');
  }

  if (errors.length > 0) {
    console.warn('⚠️  R2 Configuration Errors:', errors.join(', '));
    console.warn('Please set the required environment variables in .env.local');
  }

  return errors.length === 0;
}

/**
 * Create R2 Client (S3-compatible)
 * Uses R2 credentials and endpoint
 */
let r2Client = null;

export function getR2Client() {
  if (r2Client) {
    return r2Client;
  }

  if (!R2_ENDPOINT) {
    throw new Error('R2_ENDPOINT is not configured. Please set R2_ACCOUNT_ID.');
  }

  const credentials = R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
    ? {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      }
    : undefined;

  // Create S3-compatible client for R2
  r2Client = new S3Client({
    region: 'auto', // R2 uses 'auto' for region
    endpoint: R2_ENDPOINT,
    credentials,
    // Force path style for R2 (required)
    forcePathStyle: true,
  });

  return r2Client;
}

/**
 * Get R2 bucket name
 */
export function getR2BucketName() {
  return R2_BUCKET_NAME;
}

/**
 * Get R2 bucket prefix
 */
export function getR2BucketPrefix() {
  return R2_BUCKET_PREFIX;
}

/**
 * Get R2 public URL or custom domain
 */
export function getR2PublicUrl() {
  return R2_PUBLIC_URL || R2_CUSTOM_DOMAIN;
}

/**
 * Get R2 custom domain
 */
export function getR2CustomDomain() {
  return R2_CUSTOM_DOMAIN;
}

/**
 * Get R2 account ID
 */
export function getR2AccountId() {
  return R2_ACCOUNT_ID;
}

/**
 * Get R2 endpoint
 */
export function getR2Endpoint() {
  return R2_ENDPOINT;
}

/**
 * Build a tenant-isolated R2 key (Phase D — new path structure).
 *
 * Path conventions:
 *   Tenant uploads:  tenants/{orgId}/{category}/{...segments}
 *   Platform global: platform/global/{category}/{...segments}
 *
 * @param {string|null} orgId      The organization UUID, or null for platform-global.
 * @param {string}      category   e.g. 'courses', 'users', 'assignments', 'certificates'
 * @param {...string}   segments   Remaining path parts (joined with '/')
 * @returns {string}
 */
export function buildTenantR2Key(orgId, category, ...segments) {
  const path = segments.join('/');
  if (!orgId) {
    return `platform/global/${category}${path ? '/' + path : ''}`;
  }
  return `tenants/${orgId}/${category}${path ? '/' + path : ''}`;
}

/**
 * Build a tenant-isolated public URL for an R2 object (Phase D).
 *
 * @param {string|null} orgId
 * @param {string}      category
 * @param {...string}   segments
 * @returns {string}
 */
export function buildTenantR2PublicUrl(orgId, category, ...segments) {
  const key = buildTenantR2Key(orgId, category, ...segments);
  return buildR2PublicUrlFromFullKey(key);
}

/**
 * Build R2 key with legacy prefix (kept for backward-compat reads during migration).
 * New writes should use buildTenantR2Key instead.
 *
 * @param {string} key - Object key (without prefix)
 * @returns {string} Full R2 key with legacy prefix
 */
export function buildR2Key(key) {
  const prefix = R2_BUCKET_PREFIX.endsWith('/')
    ? R2_BUCKET_PREFIX
    : `${R2_BUCKET_PREFIX}/`;
  return `${prefix}${key}`;
}

/**
 * Build public URL directly from a full (already-prefixed) key.
 * Shared by both buildR2PublicUrl and buildTenantR2PublicUrl.
 *
 * @param {string} fullKey
 * @returns {string}
 */
export function buildR2PublicUrlFromFullKey(fullKey) {
  if (R2_PUBLIC_URL && !R2_PUBLIC_URL.includes('your-domain.com')) {
    const url = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
    return `${url}/${fullKey}`;
  }
  if (R2_CUSTOM_DOMAIN && !R2_CUSTOM_DOMAIN.includes('your-domain.com')) {
    const url = R2_CUSTOM_DOMAIN.endsWith('/') ? R2_CUSTOM_DOMAIN.slice(0, -1) : R2_CUSTOM_DOMAIN;
    return `${url}/${fullKey}`;
  }
  if (R2_ACCOUNT_ID && R2_BUCKET_NAME) {
    console.warn('⚠️  R2_PUBLIC_URL not set. Using default R2 public URL format.');
    return `https://pub-${R2_ACCOUNT_ID.substring(0, 8)}.r2.dev/${R2_BUCKET_NAME}/${fullKey}`;
  }
  throw new Error('R2 public URL is not configured. Please set R2_PUBLIC_URL or R2_CUSTOM_DOMAIN.');
}

/**
 * Build public URL for R2 object (legacy path, uses buildR2Key prefix).
 * New code should use buildTenantR2PublicUrl.
 *
 * @param {string} key - R2 object key (without prefix)
 * @returns {string} Public URL
 */
export function buildR2PublicUrl(key) {
  const fullKey = buildR2Key(key);
  return buildR2PublicUrlFromFullKey(fullKey);
}

/**
 * Build R2 endpoint URL from key
 * @param {string} key - R2 object key
 * @returns {string} R2 endpoint URL
 */
export function buildR2Url(key) {
  const fullKey = buildR2Key(key);
  return `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${fullKey}`;
}

// Validate configuration on module load (in development)
if (process.env.NODE_ENV !== 'production') {
  validateConfig();
}

const r2Config = {
  getR2Client,
  getR2BucketName,
  getR2BucketPrefix,
  getR2PublicUrl,
  getR2CustomDomain,
  getR2AccountId,
  getR2Endpoint,
  // Phase D — tenant-isolated paths (new writes)
  buildTenantR2Key,
  buildTenantR2PublicUrl,
  buildR2PublicUrlFromFullKey,
  // Legacy paths (backward-compat reads during migration)
  buildR2Key,
  buildR2PublicUrl,
  buildR2Url,
};

export default r2Config;

