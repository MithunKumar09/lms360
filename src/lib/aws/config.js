/**
 * AWS Configuration Module
 * 
 * Initializes AWS S3 and CloudFront clients with credentials.
 * 
 * Environment Variables Required:
 * - AWS_REGION: AWS region (e.g., ap-south-1)
 * - AWS_ACCESS_KEY_ID: AWS access key ID
 * - AWS_SECRET_ACCESS_KEY: AWS secret access key
 * - S3_BUCKET_NAME: S3 bucket name for uploads
 * - S3_BUCKET_PREFIX: S3 bucket prefix (e.g., org-uploads/)
 * - CLOUDFRONT_DOMAIN: CloudFront domain name (optional)
 * - CLOUDFRONT_PUBLIC_URL: CloudFront public URL (e.g., https://d1234567890.cloudfront.net)
 * 
 * @module aws/config
 */

import { S3Client } from '@aws-sdk/client-s3';

/**
 * AWS Configuration
 */
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
const S3_BUCKET_PREFIX = process.env.S3_BUCKET_PREFIX || 'org-uploads/';
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN;
const CLOUDFRONT_PUBLIC_URL = process.env.CLOUDFRONT_PUBLIC_URL;

/**
 * Validate AWS configuration
 */
function validateConfig() {
  const errors = [];

  if (!AWS_ACCESS_KEY_ID) {
    errors.push('AWS_ACCESS_KEY_ID is not set');
  }

  if (!AWS_SECRET_ACCESS_KEY) {
    errors.push('AWS_SECRET_ACCESS_KEY is not set');
  }

  if (!S3_BUCKET_NAME) {
    errors.push('S3_BUCKET_NAME is not set');
  }

  if (errors.length > 0) {
    console.warn('⚠️  AWS Configuration Errors:', errors.join(', '));
    console.warn('Please set the required environment variables in .env.local');
  }

  return errors.length === 0;
}

/**
 * Create S3 Client
 * Uses credentials from environment variables
 */
let s3Client = null;

export function getS3Client() {
  if (s3Client) {
    return s3Client;
  }

  const credentials = AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

  s3Client = new S3Client({
    region: AWS_REGION,
    credentials,
    // Additional configuration if needed
    ...(process.env.NODE_ENV === 'production' && {
      // Production-specific config
    }),
  });

  return s3Client;
}

/**
 * Get S3 bucket name
 */
export function getS3BucketName() {
  return S3_BUCKET_NAME;
}

/**
 * Get S3 bucket prefix
 */
export function getS3BucketPrefix() {
  return S3_BUCKET_PREFIX;
}

/**
 * Get CloudFront domain
 */
export function getCloudFrontDomain() {
  return CLOUDFRONT_DOMAIN;
}

/**
 * Get CloudFront public URL
 */
export function getCloudFrontPublicUrl() {
  return CLOUDFRONT_PUBLIC_URL;
}

/**
 * Get AWS region
 */
export function getAWSRegion() {
  return AWS_REGION;
}

/**
 * Build S3 key with prefix
 * @param {string} key - Object key (without prefix)
 * @returns {string} Full S3 key with prefix
 */
export function buildS3Key(key) {
  const prefix = S3_BUCKET_PREFIX.endsWith('/') 
    ? S3_BUCKET_PREFIX 
    : `${S3_BUCKET_PREFIX}/`;
  
  return `${prefix}${key}`;
}

/**
 * Build CloudFront URL from S3 key
 * @param {string} key - S3 object key
 * @returns {string} CloudFront URL
 */
export function buildCloudFrontUrl(key) {
  if (!CLOUDFRONT_PUBLIC_URL) {
    // Fallback to S3 URL if CloudFront not configured
    return `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  }

  const url = CLOUDFRONT_PUBLIC_URL.endsWith('/')
    ? CLOUDFRONT_PUBLIC_URL.slice(0, -1)
    : CLOUDFRONT_PUBLIC_URL;

  return `${url}/${key}`;
}

/**
 * Build S3 URL from key
 * @param {string} key - S3 object key
 * @returns {string} S3 URL
 */
export function buildS3Url(key) {
  return `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

// Validate configuration on module load (in development)
if (process.env.NODE_ENV !== 'production') {
  validateConfig();
}

export default {
  getS3Client,
  getS3BucketName,
  getS3BucketPrefix,
  getCloudFrontDomain,
  getCloudFrontPublicUrl,
  getAWSRegion,
  buildS3Key,
  buildCloudFrontUrl,
  buildS3Url,
};

