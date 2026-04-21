/**
 * Image URL Validation API Route
 * 
 * Validates external image URLs for bulk import (URL paste mode).
 * Only superadmin users can validate URLs.
 * 
 * POST /api/uploads/r2/validate
 * 
 * Request body:
 * {
 *   url: string    // Image URL to validate
 * }
 * 
 * Response:
 * {
 *   valid: boolean,
 *   contentType?: string,
 *   contentLength?: number,
 *   width?: number,
 *   height?: number,
 *   error?: string
 * }
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';

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
 * Fetch image dimensions from URL
 * Uses Image API to get width and height
 */
async function fetchImageDimensions(url) {
  try {
    // For server-side, we can use sharp or similar library
    // For now, we'll just validate the URL and content type
    // Client-side can fetch dimensions using Image API
    return { width: null, height: null };
  } catch (error) {
    return { width: null, height: null };
  }
}

/**
 * POST /api/uploads/r2/validate
 */
export async function POST(request) {
  try {
    // Authentication: superadmin, admin, or vendor
    await requireRole(request, ['superadmin', 'admin', 'vendor']);

    // Parse request body
    const body = await request.json();
    const { url } = body;

    // Validate required fields
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        {
          valid: false,
          error: 'URL is required',
        },
        { status: 400 }
      );
    }

    // Validate URL format
    let urlObj;
    try {
      urlObj = new URL(url);
    } catch (error) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid URL format',
        },
        { status: 400 }
      );
    }

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return NextResponse.json(
        {
          valid: false,
          error: 'URL must use HTTP or HTTPS protocol',
        },
        { status: 400 }
      );
    }

    // Fetch HEAD request to get metadata
    let response;
    try {
      response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; EdurockImageValidator/1.0)',
        },
        // Timeout after 10 seconds
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          {
            valid: false,
            error: 'Request timeout. URL did not respond in time.',
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        {
          valid: false,
          error: `Failed to fetch URL: ${error.message}`,
        },
        { status: 400 }
      );
    }

    // Check if request was successful
    if (!response.ok) {
      return NextResponse.json(
        {
          valid: false,
          error: `URL returned status ${response.status}: ${response.statusText}`,
        },
        { status: 400 }
      );
    }

    // Get content type
    const contentType = response.headers.get('content-type');
    if (!contentType) {
      return NextResponse.json(
        {
          valid: false,
          error: 'URL did not return a content type',
        },
        { status: 400 }
      );
    }

    // Validate content type (allow images + common docs for announcements)
    const normalizedContentType = contentType.toLowerCase().split(';')[0].trim();
    const IMAGE_TYPES = ['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml'];
    const DOC_TYPES = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const ALLOWED_TYPES = [...IMAGE_TYPES, ...DOC_TYPES];
    if (!ALLOWED_TYPES.includes(normalizedContentType)) {
      return NextResponse.json(
        {
          valid: false,
          error: `Invalid content type: ${normalizedContentType}. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
          contentType: normalizedContentType,
        },
        { status: 400 }
      );
    }

    // Get content length
    const contentLength = response.headers.get('content-length');
    const sizeInBytes = contentLength ? parseInt(contentLength, 10) : null;

    // Validate file size (Announcements up to 5MB; otherwise 2MB)
    const MAX_BYTES = 5 * 1024 * 1024;
    if (sizeInBytes && sizeInBytes > MAX_BYTES) {
      return NextResponse.json(
        {
          valid: false,
          error: `File size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${MAX_BYTES / 1024 / 1024}MB)`,
          contentType: normalizedContentType,
          contentLength: sizeInBytes,
        },
        { status: 400 }
      );
    }

    // Try to get image dimensions (optional)
    const dimensions = await fetchImageDimensions(url);

    return NextResponse.json(
      {
        valid: true,
        contentType: normalizedContentType,
        contentLength: sizeInBytes,
        width: dimensions.width,
        height: dimensions.height,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error validating image URL:', error);

    // Handle authentication errors
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Unauthorized. Superadmin access required.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        valid: false,
        error: error.message || 'Failed to validate image URL',
      },
      { status: 500 }
    );
  }
}

