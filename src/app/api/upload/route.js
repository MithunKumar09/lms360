/**
 * File Upload API Route
 * 
 * Handles file uploads for media (videos, images, files).
 * Supports multipart/form-data uploads with progress tracking.
 */

import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';

// Allowed file types
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [...ALLOWED_VIDEO_TYPES, ...ALLOWED_IMAGE_TYPES, 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// File size limits (in bytes)
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * POST /api/upload
 * 
 * Uploads a file and returns the URL.
 * 
 * Request: multipart/form-data
 * - file: File to upload
 * - mediaType: 'video' | 'image' | 'file'
 * 
 * Response:
 * {
 *   success: boolean,
 *   url: string,
 *   error?: string
 * }
 */
export async function POST(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file');
    const mediaType = formData.get('mediaType') || 'file';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileType = file.type;
    let isValidType = false;
    let maxSize = MAX_FILE_SIZE;

    if (mediaType === 'video') {
      isValidType = ALLOWED_VIDEO_TYPES.includes(fileType);
      maxSize = MAX_VIDEO_SIZE;
    } else if (mediaType === 'image') {
      isValidType = ALLOWED_IMAGE_TYPES.includes(fileType);
      maxSize = MAX_IMAGE_SIZE;
    } else {
      isValidType = ALLOWED_FILE_TYPES.includes(fileType);
      maxSize = MAX_FILE_SIZE;
    }

    if (!isValidType) {
      return NextResponse.json(
        { success: false, error: `Invalid file type. Expected ${mediaType} file.` },
        { status: 400 }
      );
    }

    // Validate file size
    const fileSize = file.size;
    if (fileSize > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return NextResponse.json(
        { success: false, error: `File size exceeds ${maxSizeMB}MB limit.` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `${timestamp}-${randomString}.${fileExtension}`;

    // Determine upload directory based on media type
    const uploadDir = join(process.cwd(), 'public', 'uploads', mediaType);
    
    // Create directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Save file
    const filePath = join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Generate public URL
    const publicUrl = `/uploads/${mediaType}/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: file.name,
      fileSize: fileSize,
      fileType: fileType,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

