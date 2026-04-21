/**
 * Virtual Internship Task Submission API Route
 * 
 * POST /api/virtual-internships/tasks/[taskId]/submit - Submit task (student only)
 * PUT /api/virtual-internships/tasks/[taskId]/submit - Update submission (student only)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { getClient } from '@/lib/db/index.js';
import {
  createVirtualInternshipSubmission,
  getSubmissionByTaskAndStudent,
  addSubmissionFile,
  getSubmissionFiles,
} from '@/lib/db/virtual-internships/submissions.js';
import { getVirtualInternshipTask, hasAccessToTask } from '@/lib/db/virtual-internships/tasks.js';
import { isStudentEnrolled } from '@/lib/db/virtual-internships/enrollments.js';
import { getVirtualInternshipProgram } from '@/lib/db/virtual-internships/programs.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  getR2Client,
  getR2BucketName,
  buildR2Key,
  buildR2PublicUrl,
} from '@/lib/r2/config.js';

async function uploadFileToR2(file, keyPrefix) {
  const r2Client = getR2Client();
  const bucket = getR2BucketName();
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).slice(2);
  const fileName = file.name || 'upload';
  const ext = fileName.split('.').pop() || 'bin';
  const key = `${keyPrefix}/${timestamp}-${randomStr}.${ext.toLowerCase()}`;
  const fullKey = buildR2Key(key);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: fullKey,
    Body: buffer,
    ContentType: file.type || 'application/octet-stream',
    CacheControl: 'public, max-age=31536000, immutable',
  });
  await r2Client.send(putCommand);
  return {
    key,
    publicUrl: buildR2PublicUrl(key),
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSizeBytes: buffer.length,
  };
}

export async function POST(request, { params }) {
  const client = await getClient();
  try {
    const session = await requireRole(request, ['student']);
    const userId = session.user.id;
    const taskId = params.taskId;

    // Get task and verify access
    const task = await getVirtualInternshipTask(taskId);
    if (!task || !task.programId) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    // Verify student is enrolled
    const enrolled = await isStudentEnrolled(task.programId, userId);
    if (!enrolled) {
      return NextResponse.json({ success: false, error: 'Not enrolled in program' }, { status: 403 });
    }

    // Check if task is published
    if (task.status !== 'published') {
      return NextResponse.json({ success: false, error: 'Task is not available' }, { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files');
    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'At least one file is required' }, { status: 400 });
    }

    // Check if already submitted
    const existing = await getSubmissionByTaskAndStudent(taskId, userId);
    if (existing) {
      return NextResponse.json({ success: false, error: 'Already submitted. Use PUT to update.' }, { status: 400 });
    }

    // Check late submission
    const isLate = new Date() > new Date(task.dueDate) && !task.allowLateSubmission;

    // Create submission
    const submission = await createVirtualInternshipSubmission({
      taskId,
      studentId: userId,
      programId: task.programId,
      isLate,
    });

    // Upload files
    for (const file of files) {
      if (file instanceof File) {
        const uploaded = await uploadFileToR2(file, `virtual-internships/submissions/${submission.id}`);
        await addSubmissionFile({
          submissionId: submission.id,
          ...uploaded,
        });
      }
    }

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error('❌ [API] [Virtual Internship Submit] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to submit' }, { status: error.status || 500 });
  } finally {
    client.release();
  }
}

export async function PUT(request, { params }) {
  const client = await getClient();
  try {
    const session = await requireRole(request, ['student']);
    const userId = session.user.id;
    const taskId = params.taskId;

    const existing = await getSubmissionByTaskAndStudent(taskId, userId);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files');

    // Upload new files
    for (const file of files) {
      if (file instanceof File) {
        const uploaded = await uploadFileToR2(file, `virtual-internships/submissions/${existing.id}`);
        await addSubmissionFile({
          submissionId: existing.id,
          ...uploaded,
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Submission updated' });
  } catch (error) {
    console.error('❌ [API] [Virtual Internship Submit Update] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to update' }, { status: error.status || 500 });
  } finally {
    client.release();
  }
}
