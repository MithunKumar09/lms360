/**
 * Task Attachment Delete API Route
 * 
 * DELETE /api/mentors/tasks/:id/attachments/:attachmentId - Delete attachment
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import { getR2Client, getR2BucketName, buildR2Key } from '@/lib/r2/config.js';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * DELETE /api/mentors/tasks/:id/attachments/:attachmentId
 * Delete attachment (mentor only, or uploader)
 */
export async function DELETE(request, { params }) {
  try {
    console.log('📎 [TASK ATTACHMENTS] ===== DELETE ATTACHMENT STARTED =====');
    
    const { id, attachmentId } = params;

    // Require mentor or student role
    const session = await requireRole(request, ['mentor', 'student']);
    const userId = session.user.id;
    const userRole = session.user.role;

    // Get attachment
    const attachmentQuery = `
      SELECT mta.*, mt.mentor_id, mt.student_id
      FROM mentor_task_attachments mta
      INNER JOIN mentor_tasks mt ON mta.task_id = mt.id
      WHERE mta.id = $1 AND mta.task_id = $2
    `;
    const attachmentResult = await query(attachmentQuery, [attachmentId, id]);

    if (attachmentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Attachment not found' },
        { status: 404 }
      );
    }

    const attachment = attachmentResult.rows[0];

    // Verify user has permission (mentor of task or uploader)
    const isMentor = userRole === 'mentor' && attachment.mentor_id === userId;
    const isUploader = attachment.uploaded_by === userId;
    
    if (!isMentor && !isUploader) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete from R2
    try {
      const r2Client = getR2Client();
      const bucket = getR2BucketName();
      const fullKey = buildR2Key(attachment.file_key);

      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucket,
        Key: fullKey,
      });

      await r2Client.send(deleteCommand);
    } catch (r2Error) {
      // Log error but continue with DB deletion
      console.error('📎 [TASK ATTACHMENTS] Failed to delete from R2:', r2Error);
    }

    // Delete from database
    const deleteQuery = `
      DELETE FROM mentor_task_attachments
      WHERE id = $1
      RETURNING *
    `;
    await query(deleteQuery, [attachmentId]);

    console.log('📎 [TASK ATTACHMENTS] ✅ Attachment deleted:', attachmentId);

    return NextResponse.json(
      {
        success: true,
        message: 'Attachment deleted successfully',
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
        error: error.message || 'Failed to delete attachment' 
      },
      { status: 500 }
    );
  }
}
