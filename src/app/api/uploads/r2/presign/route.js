/**
 * R2 Presigned URL API Route
 * 
 * Generates presigned PUT URLs for direct browser-to-R2 uploads.
 * Allowed roles: superadmin, admin, vendor, instructor, mentor, student, brand, parent
 * Uses Cloudflare R2 for faster, cheaper storage with no egress fees.
 * 
 * Environment Variables:
 * - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
 * - R2_BUCKET_NAME, R2_BUCKET_PREFIX
 * - R2_PUBLIC_URL or R2_CUSTOM_DOMAIN
 * 
 * POST /api/uploads/r2/presign
 * 
 * Request body:
 * {
 *   contentType: string,    // e.g., image/png
 *   ext: string,            // File extension (e.g., png)
 *   keyPrefix: string,      // R2 key prefix (e.g., orgs/brand)
 *   bytes: number,          // File size in bytes (for size guard)
 *   checksum?: string       // Optional MD5/SHA256 checksum
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   uploadUrl: string,      // Presigned PUT URL
 *   key: string,            // Full R2 key
 *   publicUrl: string,      // Public R2 URL
 *   headersToSet: {         // Headers to set when uploading
 *     'Content-Type': string,
 *     'Cache-Control': string
 *   }
 * }
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { generatePresignedPutUrl } from '@/lib/r2/r2.js';
import { buildTenantR2Key, buildR2PublicUrlFromFullKey } from '@/lib/r2/config.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';
import crypto from 'crypto';

// Simple in-memory rate limiter (use Upstash Redis for production)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

/**
 * Check rate limit for user/IP
 */
function checkRateLimit(identifier) {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now - record.firstRequest > RATE_LIMIT_WINDOW) {
    // New window or expired window
    rateLimitMap.set(identifier, {
      count: 1,
      firstRequest: now,
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count };
}

/**
 * POST /api/uploads/r2/presign
 */
export async function POST(request) {
  try {
    // Authentication: superadmin, admin, vendor, instructor, mentor, student, brand, or parent
    const session = await requireRole(request, ['superadmin', 'admin', 'vendor', 'instructor', 'mentor', 'student', 'brand', 'parent']);
    const ipAddress = getClientIp(request);

    // Rate limiting
    const rateLimit = checkRateLimit(`${session.user.id}:${ipAddress}`);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          rateLimited: true,
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { contentType, ext, keyPrefix, bytes, checksum } = body;

    // Validate required fields
    if (!contentType || !ext || !keyPrefix) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: contentType, ext, keyPrefix',
        },
        { status: 400 }
      );
    }

    // Validation: allowed types and size depend on prefix
    // announcements and assignments allow images + docs + videos
    const normalizedType = (contentType || '').toLowerCase();
    const isAnnouncements = typeof keyPrefix === 'string' && keyPrefix.startsWith('announcements');
    const isAssignments = typeof keyPrefix === 'string' && keyPrefix.startsWith('assignments');

    const IMAGE_TYPES = ['image/png','image/jpeg','image/jpg','image/webp','image/svg+xml', 'image/gif', 'image/bmp'];
    const DOC_TYPES = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    const ALLOWED_TYPES = (isAnnouncements || isAssignments) 
      ? [...IMAGE_TYPES, ...DOC_TYPES, ...VIDEO_TYPES] 
      : IMAGE_TYPES;

    if (!ALLOWED_TYPES.includes(normalizedType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid content type: ${contentType}. Allowed types: ${ALLOWED_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    const MAX_DEFAULT = 2 * 1024 * 1024; // 2MB
    const MAX_ANNOUNCEMENTS = 5 * 1024 * 1024; // 5MB
    const MAX_ASSIGNMENTS = 50 * 1024 * 1024; // 50MB (same as AddAssignmentForm)
    const maxBytes = isAssignments 
      ? MAX_ASSIGNMENTS 
      : (isAnnouncements ? MAX_ANNOUNCEMENTS : MAX_DEFAULT);
    if (bytes && bytes > maxBytes) {
      return NextResponse.json(
        {
          success: false,
          error: `File size (${(bytes / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${maxBytes / 1024 / 1024}MB)`,
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
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'ogg': 'video/ogg',
      'mov': 'video/quicktime',
    };

    const expectedContentType = extMap[ext.toLowerCase()];
    if (expectedContentType && expectedContentType !== contentType.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: `Extension .${ext} does not match content type ${contentType}`,
        },
        { status: 400 }
      );
    }

    // Generate unique R2 key — Phase D: use tenant-isolated path
    const orgId = session.user.orgId ?? null;
    const uuid = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const checksumPart = checksum ? checksum.substring(0, 8) : uuid.substring(0, 8);
    const filename = `${uuid}-${checksumPart}.${ext}`;
    // keyPrefix becomes the category segment (e.g., 'courses', 'assignments')
    const fullKey = buildTenantR2Key(orgId, keyPrefix, filename);

    // Generate presigned URL (60 seconds expiry)
    const metadata = {};
    if (checksum) metadata.checksum = checksum;
    if (bytes) metadata.filesize = bytes.toString();

    // Pass the full tenant key directly; generatePresignedPutUrl accepts pre-built keys
    const uploadUrl = await generatePresignedPutUrl(
      fullKey, contentType, 60, metadata, ALLOWED_TYPES,
      { keyOrgId: orgId, sessionOrgId: orgId } // same — presign guard satisfied
    );

    // Public URL for the tenant-isolated key
    const publicUrl = buildR2PublicUrlFromFullKey(fullKey);

    // Headers to set when uploading
    const headersToSet = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    // Create audit event
    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'upload_presign',
        target_type: 'upload',
        metadata: {
          contentType,
          ext,
          keyPrefix,
          bytes,
          key: fullKey,
          orgId,
        },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (auditError) {
      // Don't fail the request if audit logging fails
      console.error('Failed to create audit event:', auditError);
    }

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
    console.error('Error generating presigned URL:', error);

    // Handle authentication errors
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized. Insufficient permissions to upload files.',
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate presigned URL',
      },
      { status: 500 }
    );
  }
}

