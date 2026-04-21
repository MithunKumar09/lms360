'use server';

/**
 * R2 Direct Upload API Route
 * 
 * Accepts multipart/form-data and uploads file server-side to Cloudflare R2
 * using the S3-compatible API. This avoids browser CORS issues with presigned PUT.
 * 
 * POST /api/uploads/r2/direct
 * 
 * Form fields:
 * - file: File (required)
 * - keyPrefix: string (required) e.g., 'orgs/brand'
 * - contentType: string (optional) if not present, inferred from file
 */

import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/guards.js';
import { getClientIp } from '@/lib/auth/validation.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  getR2Client,
  getR2BucketName,
  buildR2Key,
  buildR2PublicUrl,
} from '@/lib/r2/config.js';
import { createAuditEvent } from '@/lib/db/auditEvents.js';

export async function POST(request) {
  try {
    // AuthZ
    const session = await requireSuperadmin(request);
    const ipAddress = getClientIp(request);

    const formData = await request.formData();
    const file = formData.get('file');
    const keyPrefix = (formData.get('keyPrefix') || '').toString();
    let contentType = (formData.get('contentType') || '').toString();

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'Missing file' },
        { status: 400 }
      );
    }
    if (!keyPrefix) {
      return NextResponse.json(
        { success: false, error: 'Missing keyPrefix' },
        { status: 400 }
      );
    }

    if (!contentType) {
      contentType = file.type || 'application/octet-stream';
    }

    // Build key: prefix/<uuid>.<ext> is expected to be provided client-side, but fall back if not
    let key = formData.get('key');
    if (!key) {
      // Fallback: random key using timestamp
      const filename = formData.get('filename') || 'upload';
      const ext = (filename.toString().split('.').pop() || 'bin').toLowerCase();
      key = `${keyPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    }
    key = key.toString();

    const r2Client = getR2Client();
    const bucket = getR2BucketName();
    const fullKey = buildR2Key(key);

    const arrayBuffer = await file.arrayBuffer();

    const put = new PutObjectCommand({
      Bucket: bucket,
      Key: fullKey,
      Body: Buffer.from(arrayBuffer),
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(put);

    const publicUrl = buildR2PublicUrl(key);

    // Audit (best-effort)
    try {
      await createAuditEvent({
        actor_id: session.user.id,
        action: 'upload_direct',
        target_type: 'upload',
        metadata: {
          keyPrefix,
          key: fullKey,
          contentType,
          bytes: arrayBuffer.byteLength,
          method: 'server_direct',
        },
        ip_address: ipAddress,
        user_agent: request.headers.get('user-agent'),
      });
    } catch (e) {
      console.error('Failed to create audit event:', e);
    }

    return NextResponse.json(
      { success: true, key: fullKey, publicUrl },
      { status: 200 }
    );
  } catch (error) {
    console.error('R2 direct upload error:', error);
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Superadmin access required.' },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}


