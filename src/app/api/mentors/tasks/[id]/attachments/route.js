/**
 * Task Attachments API Route
 * 
 * POST /api/mentors/tasks/:id/attachments - Upload attachment to task
 * GET /api/mentors/tasks/:id/attachments - Get task attachments
 * DELETE /api/mentors/tasks/:id/attachments/:attachmentId - Delete attachment
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import { getR2Client, getR2BucketName, buildR2Key, buildR2PublicUrl } from '@/lib/r2/config.js';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * POST /api/mentors/tasks/:id/attachments
 * Upload attachment to task
 * 
 * FormData:
 * - file: File (required)
 */
export async function POST(request, { params }) {
  try {
    console.log('📎 [TASK ATTACHMENTS] ===== UPLOAD ATTACHMENT STARTED =====');
    
    const { id } = params;

    // Require mentor or student role (both can upload)
    const session = await requireRole(request, ['mentor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;

    // Verify task exists and user has access
    const taskQuery = `
      SELECT id, mentor_id, student_id
      FROM mentor_tasks
      WHERE id = $1
    `;
    const taskResult = await query(taskQuery, [id]);

    if (taskResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = taskResult.rows[0];

    // Verify user has access (mentor who created or student assigned)
    if (userRole === 'mentor' && task.mentor_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    if (userRole === 'student' && task.student_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { success: false, error: 'Missing file' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Generate file key
    const filename = file.name || 'attachment';
    const ext = filename.split('.').pop() || 'bin';
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).slice(2);
    const key = `mentor-tasks/${id}/${timestamp}-${randomStr}.${ext}`;
    const fullKey = buildR2Key(key);

    // Upload to R2
    const r2Client = getR2Client();
    const bucket = getR2BucketName();
    const arrayBuffer = await file.arrayBuffer();
    const contentType = file.type || 'application/octet-stream';

    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: fullKey,
      Body: Buffer.from(arrayBuffer),
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await r2Client.send(putCommand);
    const publicUrl = buildR2PublicUrl(key);

    // Save attachment record
    const insertQuery = `
      INSERT INTO mentor_task_attachments (
        task_id,
        file_key,
        file_url,
        file_name,
        file_type,
        file_size_bytes,
        uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const insertResult = await query(insertQuery, [
      id,
      key,
      publicUrl,
      filename,
      contentType,
      file.size,
      userId,
    ]);

    const attachment = insertResult.rows[0];

    const attachmentResponse = {
      id: attachment.id,
      taskId: attachment.task_id,
      fileKey: attachment.file_key,
      fileUrl: attachment.file_url,
      fileName: attachment.file_name,
      fileType: attachment.file_type,
      fileSizeBytes: attachment.file_size_bytes,
      uploadedBy: attachment.uploaded_by,
      createdAt: attachment.created_at,
    };

    console.log('📎 [TASK ATTACHMENTS] ✅ Attachment uploaded:', attachment.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          attachment: attachmentResponse,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('📎 [TASK ATTACHMENTS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to upload attachment' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mentors/tasks/:id/attachments
 * Get task attachments
 */
export async function GET(request, { params }) {
  try {
    console.log('📎 [TASK ATTACHMENTS] ===== GET ATTACHMENTS STARTED =====');
    
    const { id } = params;

    // Require mentor or student role
    const session = await requireRole(request, ['mentor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;

    // Verify task exists and user has access
    const taskQuery = `
      SELECT id, mentor_id, student_id
      FROM mentor_tasks
      WHERE id = $1
    `;
    const taskResult = await query(taskQuery, [id]);

    if (taskResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = taskResult.rows[0];

    // Verify user has access
    if (userRole === 'mentor' && task.mentor_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }
    if (userRole === 'student' && task.student_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get attachments with uploader info
    const attachmentsQuery = `
      SELECT 
        mta.id,
        mta.task_id,
        mta.file_key,
        mta.file_url,
        mta.file_name,
        mta.file_type,
        mta.file_size_bytes,
        mta.uploaded_by,
        mta.created_at,
        u.id as uploader_user_id,
        u.first_name as uploader_first_name,
        u.last_name as uploader_last_name,
        u.email as uploader_email,
        u.avatar_url as uploader_avatar_url
      FROM mentor_task_attachments mta
      INNER JOIN users u ON mta.uploaded_by = u.id
      WHERE mta.task_id = $1
      ORDER BY mta.created_at DESC
    `;

    const attachmentsResult = await query(attachmentsQuery, [id]);

    const attachments = attachmentsResult.rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      fileKey: row.file_key,
      fileUrl: row.file_url,
      fileName: row.file_name,
      fileType: row.file_type,
      fileSizeBytes: row.file_size_bytes,
      uploadedBy: row.uploaded_by,
      createdAt: row.created_at,
      uploader: {
        id: row.uploader_user_id,
        firstName: row.uploader_first_name,
        lastName: row.uploader_last_name,
        email: row.uploader_email,
        avatarUrl: row.uploader_avatar_url,
      },
    }));

    console.log('📎 [TASK ATTACHMENTS] ✅ Attachments fetched:', attachments.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          attachments,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📎 [TASK ATTACHMENTS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch attachments' 
      },
      { status: 500 }
    );
  }
}
