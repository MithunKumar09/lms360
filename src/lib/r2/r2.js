/**
 * Cloudflare R2 Utilities
 * 
 * Provides functions for R2 operations: presigned URLs, object metadata, and validation.
 * R2 is S3-compatible, so we use AWS SDK v3 with R2-specific endpoints.
 * 
 * @module r2/r2
 */

import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  getR2Client,
  getR2BucketName,
  buildR2Key,
  buildR2PublicUrl,
  buildTenantR2Key,
  buildTenantR2PublicUrl,
  buildR2PublicUrlFromFullKey,
} from './config.js';

// Re-export for convenience (legacy + new)
export {
  buildR2Key,
  buildR2PublicUrl,
  buildTenantR2Key,
  buildTenantR2PublicUrl,
  buildR2PublicUrlFromFullKey,
};

/**
 * Allowed image content types
 */
const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
  'image/bmp',
];

/**
 * Allowed document content types
 */
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Allowed video content types
 */
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
];

/**
 * Maximum file size for logos (2MB)
 */
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

/**
 * Generate presigned PUT URL for direct browser-to-R2 upload
 * 
 * @param {string} key - R2 object key (without prefix)
 * @param {string} contentType - Content type (e.g., image/png, application/pdf)
 * @param {number} [expiresIn=60] - Expiration time in seconds (default: 60)
 * @param {Object} [metadata] - Optional metadata to set
 * @param {string[]} [allowedTypes] - Optional array of allowed content types. If not provided, defaults to image types only (for backward compatibility)
 * @returns {Promise<string>} Presigned PUT URL
 */
/**
 * Generate presigned PUT URL for direct browser-to-R2 upload.
 *
 * Phase D addition: optional `tenantContext` validates that the uploading
 * user's org matches the key's org to prevent cross-tenant uploads.
 *
 * @param {string}   key
 * @param {string}   contentType
 * @param {number}   [expiresIn=60]
 * @param {Object}   [metadata]
 * @param {string[]} [allowedTypes]
 * @param {Object}   [tenantContext]            — NEW
 * @param {string}   [tenantContext.keyOrgId]   org embedded in the key
 * @param {string}   [tenantContext.sessionOrgId] org from the user's session
 */
export async function generatePresignedPutUrl(
  key,
  contentType,
  expiresIn = 60,
  metadata = {},
  allowedTypes = null,
  tenantContext = {}
) {
  // Cross-tenant upload prevention (Gap 1 of Phase D)
  const { keyOrgId, sessionOrgId } = tenantContext;
  if (keyOrgId && sessionOrgId && keyOrgId !== sessionOrgId) {
    throw new Error('Cross-tenant upload not permitted');
  }

  try {
    const r2Client = getR2Client();
    const bucketName = getR2BucketName();
    // If caller passes a full tenant key (starts with 'tenants/' or 'platform/'),
    // use it directly; otherwise apply the legacy prefix.
    const fullKey = key.startsWith('tenants/') || key.startsWith('platform/')
      ? key
      : buildR2Key(key);

    // Validate content type (use provided allowedTypes or default to image types for backward compatibility)
    const typesToCheck = allowedTypes || ALLOWED_IMAGE_TYPES;
    if (!typesToCheck.includes(contentType.toLowerCase())) {
      throw new Error(`Invalid content type: ${contentType}. Allowed types: ${typesToCheck.join(', ')}`);
    }

    // Build metadata headers
    const metadataHeaders = {};
    Object.keys(metadata).forEach((key) => {
      if (key.length > 0 && key.length <= 2000) {
        metadataHeaders[`x-amz-meta-${key}`] = metadata[key];
      }
    });

    // Create PutObject command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fullKey,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
      // Metadata
      ...metadataHeaders,
    });

    // Generate presigned URL
    const url = await getSignedUrl(r2Client, command, {
      expiresIn,
    });

    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
}

/**
 * Get object metadata from R2
 * 
 * @param {string} key - R2 object key (without prefix)
 * @returns {Promise<Object>} Object metadata
 */
export async function headObject(key) {
  try {
    const r2Client = getR2Client();
    const bucketName = getR2BucketName();
    const fullKey = buildR2Key(key);

    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: fullKey,
    });

    const response = await r2Client.send(command);

    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      etag: response.ETag,
      lastModified: response.LastModified,
      metadata: response.Metadata || {},
    };
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return null; // Object not found
    }
    console.error('Error getting object metadata:', error);
    throw new Error(`Failed to get object metadata: ${error.message}`);
  }
}

/**
 * HeadObject using a pre-built full key (no legacy prefix applied).
 * Used by getFileWithFallback and migration scripts.
 *
 * @param {string} fullKey  — The complete R2 key (no prefix will be added)
 * @returns {Promise<Object|null>}
 */
export async function headObjectByFullKey(fullKey) {
  try {
    const r2Client = getR2Client();
    const bucketName = getR2BucketName();
    const command = new HeadObjectCommand({ Bucket: bucketName, Key: fullKey });
    const response = await r2Client.send(command);
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      etag: response.ETag,
      lastModified: response.LastModified,
      metadata: response.Metadata || {},
    };
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Dual-path file resolver for zero-downtime storage migration (Phase D).
 *
 * Attempts the new tenant-isolated path first, then falls back to the legacy
 * `org-uploads/` path. Once all files are migrated (Phase H), the fallback
 * branch can be removed.
 *
 * @param {string}   orgId
 * @param {string}   category  e.g. 'courses', 'users', 'certificates'
 * @param {...string} segments  Remaining key parts
 * @returns {Promise<string>}   Public URL for the found object
 */
export async function getFileWithFallback(orgId, category, ...segments) {
  const newKey = buildTenantR2Key(orgId, category, ...segments);
  const existsInNewPath = await headObjectByFullKey(newKey);
  if (existsInNewPath) {
    return buildR2PublicUrlFromFullKey(newKey);
  }
  // Fallback: legacy path (org-uploads/{category}/{...segments})
  const legacyKey = buildR2Key([category, ...segments].join('/'));
  return buildR2PublicUrlFromFullKey(legacyKey);
}

/**
 * Validate uploaded image
 * Checks type and size constraints
 * 
 * @param {string} key - R2 object key (without prefix)
 * @returns {Promise<Object>} Validation result
 */
export async function validateImageUpload(key) {
  try {
    const metadata = await headObject(key);

    if (!metadata) {
      return {
        valid: false,
        error: 'Image not found in R2',
      };
    }

    // Validate content type
    const contentType = metadata.contentType?.toLowerCase();
    if (!contentType || !ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return {
        valid: false,
        error: `Invalid image type: ${contentType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
        contentType,
        contentLength: metadata.contentLength,
      };
    }

    // Validate file size (2MB max for logos)
    if (metadata.contentLength > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `Image size (${(metadata.contentLength / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        contentType,
        contentLength: metadata.contentLength,
      };
    }

    return {
      valid: true,
      contentType,
      contentLength: metadata.contentLength,
      etag: metadata.etag,
    };
  } catch (error) {
    console.error('Error validating image upload:', error);
    return {
      valid: false,
      error: error.message || 'Failed to validate image upload',
    };
  }
}

/**
 * Get public URL for R2 object (via custom domain or public URL)
 * 
 * @param {string} key - R2 object key (without prefix)
 * @returns {string} Public URL
 */
export function getPublicUrl(key) {
  return buildR2PublicUrl(key);
}

/**
 * Validate content type for images
 * 
 * @param {string} contentType - Content type to validate
 * @returns {boolean} Whether content type is valid
 */
export function isValidImageType(contentType) {
  return ALLOWED_IMAGE_TYPES.includes(contentType?.toLowerCase());
}

/**
 * Get maximum allowed file size
 * 
 * @returns {number} Maximum file size in bytes
 */
export function getMaxFileSize() {
  return MAX_FILE_SIZE;
}

/**
 * Get allowed image types
 * 
 * @returns {string[]} Array of allowed content types
 */
export function getAllowedImageTypes() {
  return [...ALLOWED_IMAGE_TYPES];
}

export default {
  generatePresignedPutUrl,
  headObject,
  validateImageUpload,
  getPublicUrl,
  isValidImageType,
  getMaxFileSize,
  getAllowedImageTypes,
  buildR2Key,
  buildR2PublicUrl,
};

