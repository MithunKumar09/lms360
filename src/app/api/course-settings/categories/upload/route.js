/**
 * Category Thumbnail Upload API Route
 * 
 * POST /api/course-settings/categories/upload
 * Generates presigned URL for category thumbnail upload
 * Uses R2 for image storage
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { hasFeatureAccess, FEATURE_NAMES } from '@/lib/api/course-settings/accessControl.js';
import { getAccessControlSetting } from '@/lib/db/course-settings/accessControl.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { generatePresignedPutUrl, getPublicUrl } from '@/lib/r2/r2.js';
import { buildR2Key } from '@/lib/r2/config.js';
import crypto from 'crypto';

/**
 * POST /api/course-settings/categories/upload
 * Generate presigned URL for category thumbnail upload
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['superadmin', 'admin']);
    // Normalize role to handle orgadmin -> admin mapping
    const userRole = normalizeRole(session.user.role);

    // Check write access for admin
    // For uploads, we're more lenient: if the access control setting doesn't exist, allow the upload
    // (uploads are less sensitive than creating/modifying categories)
    if (userRole === 'admin') {
      // Check if access control setting exists
      const setting = await getAccessControlSetting('admin', FEATURE_NAMES.categories);
      
      if (setting) {
        // Setting exists - enforce the check
        const hasAccess = await hasFeatureAccess(userRole, FEATURE_NAMES.categories, 'write');
        if (!hasAccess) {
          return NextResponse.json(
            {
              success: false,
              error: 'Access denied. You don\'t have write permission for categories.',
            },
            { status: 403 }
          );
        }
      }
      // If setting doesn't exist, allow upload (default behavior for uploads)
    }

    // Parse request body
    const body = await request.json();
    const { contentType, ext, bytes, checksum } = body;

    // Validate required fields
    if (!contentType || !ext) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: contentType, ext',
        },
        { status: 400 }
      );
    }

    // Validate content type (images only)
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    const normalizedType = contentType.toLowerCase();
    if (!ALLOWED_TYPES.includes(normalizedType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid content type: ${contentType}. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate file size (max 2MB for thumbnails)
    const MAX_BYTES = 2 * 1024 * 1024; // 2MB
    if (bytes && bytes > MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(bytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (2MB)`,
        },
        { status: 400 }
      );
    }

    // Validate extension matches content type
    const extMap = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
    };

    const expectedContentType = extMap[ext.toLowerCase()];
    if (expectedContentType && expectedContentType !== normalizedType) {
      return NextResponse.json(
        {
          success: false,
          error: `Extension .${ext} does not match content type ${contentType}`,
        },
        { status: 400 }
      );
    }

    // Generate unique R2 key
    const uuid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const checksumPart = checksum ? checksum.substring(0, 8) : uuid.substring(0, 8);
    const filename = `${uuid}-${checksumPart}.${ext}`;
    const key = `course-settings/categories/${filename}`;
    const fullKey = buildR2Key(key);

    // Generate presigned URL (60 seconds expiry)
    const metadata = {};
    if (checksum) metadata.checksum = checksum;
    if (bytes) metadata.filesize = bytes.toString();

    const uploadUrl = await generatePresignedPutUrl(key, contentType, 60, metadata);
    const publicUrl = getPublicUrl(key);

    // Headers to set when uploading
    const headersToSet = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    return NextResponse.json(
      {
        success: true,
        uploadUrl,
        key: fullKey,
        publicUrl,
        headersToSet,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in POST /api/course-settings/categories/upload:', error);

    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Unauthorized. Access denied.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate upload URL',
      },
      { status: 500 }
    );
  }
}

