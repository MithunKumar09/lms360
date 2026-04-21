/**
 * S3 Utilities
 * 
 * Provides functions for S3 operations: presigned URLs, object metadata, and validation.
 * 
 * @module aws/s3
 */

import { PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  getS3Client,
  getS3BucketName,
  buildS3Key,
  buildCloudFrontUrl,
} from './config.js';

/**
 * Allowed image content types
 */
const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
];

/**
 * Maximum file size for logos (2MB)
 */
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

/**
 * Generate presigned PUT URL for direct browser-to-S3 upload
 * 
 * @param {string} key - S3 object key (without prefix)
 * @param {string} contentType - Content type (e.g., image/png)
 * @param {number} [expiresIn=60] - Expiration time in seconds (default: 60)
 * @param {Object} [metadata] - Optional metadata to set
 * @returns {Promise<string>} Presigned PUT URL
 */
export async function generatePresignedPutUrl(key, contentType, expiresIn = 60, metadata = {}) {
  try {
    const s3Client = getS3Client();
    const bucketName = getS3BucketName();
    const fullKey = buildS3Key(key);

    // Validate content type
    if (!ALLOWED_IMAGE_TYPES.includes(contentType.toLowerCase())) {
      throw new Error(`Invalid content type: ${contentType}. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
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
    const url = await getSignedUrl(s3Client, command, {
      expiresIn,
    });

    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
}

/**
 * Get object metadata from S3
 * 
 * @param {string} key - S3 object key (without prefix)
 * @returns {Promise<Object>} Object metadata
 */
export async function headObject(key) {
  try {
    const s3Client = getS3Client();
    const bucketName = getS3BucketName();
    const fullKey = buildS3Key(key);

    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: fullKey,
    });

    const response = await s3Client.send(command);

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
 * Validate uploaded image
 * Checks type and size constraints
 * 
 * @param {string} key - S3 object key (without prefix)
 * @returns {Promise<Object>} Validation result
 */
export async function validateImageUpload(key) {
  try {
    const metadata = await headObject(key);

    if (!metadata) {
      return {
        valid: false,
        error: 'Image not found in S3',
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
 * Get public URL for S3 object (via CloudFront if configured, otherwise S3)
 * 
 * @param {string} key - S3 object key (without prefix)
 * @returns {string} Public URL
 */
export function getPublicUrl(key) {
  return buildCloudFrontUrl(buildS3Key(key));
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
};

