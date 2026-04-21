/**
 * Assignment Submission API Route
 * 
 * POST /api/assignments/:id/submit - Create assignment submission
 * PUT /api/assignments/:id/submit - Update assignment submission
 * 
 * Request Body (FormData):
 * - files: File[] (multiple files)
 * - submissionId: UUID (optional, for updates)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query, getClient } from '@/lib/db/index.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import {
  getR2Client,
  getR2BucketName,
  buildR2Key,
  buildR2PublicUrl,
} from '@/lib/r2/config.js';

/**
 * Upload file to R2
 */
async function uploadFileToR2(file, keyPrefix) {
  const r2Client = getR2Client();
  const bucket = getR2BucketName();

  // Generate unique key
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).slice(2);
  const fileName = file.name || 'upload';
  const ext = fileName.split('.').pop() || 'bin';
  const key = `${keyPrefix}/${timestamp}-${randomStr}.${ext.toLowerCase()}`;
  const fullKey = buildR2Key(key);

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to R2
  const putCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: fullKey,
    Body: buffer,
    ContentType: file.type || 'application/octet-stream',
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await r2Client.send(putCommand);

  const publicUrl = buildR2PublicUrl(key);

  return {
    key,
    publicUrl,
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSizeBytes: buffer.length,
  };
}

/**
 * Validate file against assignment requirements
 */
function validateFile(file, assignment) {
  const errors = [];

  // Check file size
  const maxSizeBytes = (assignment.maxFileSizeMb || 10) * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    errors.push(`File "${file.name}" exceeds maximum size of ${assignment.maxFileSizeMb}MB`);
  }

  // Check file type if restrictions exist
  if (assignment.allowedFileTypes && assignment.allowedFileTypes.length > 0) {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const fileType = file.type || '';
    
    const isAllowed = assignment.allowedFileTypes.some(allowedType => {
      const normalizedAllowed = allowedType.toLowerCase().replace(/^\./, '');
      return fileExtension === normalizedAllowed || 
             fileType.includes(normalizedAllowed) ||
             fileType === allowedType;
    });

    if (!isAllowed) {
      errors.push(`File "${file.name}" has invalid type. Allowed types: ${assignment.allowedFileTypes.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function POST(request, context) {
  const params = await context.params;
  return handleSubmit(request, params, false);
}

export async function PUT(request, context) {
  const params = await context.params;
  return handleSubmit(request, params, true);
}

async function handleSubmit(request, params, isUpdate) {
  const client = await getClient();
  
  try {
    const session = await requireRole(request, ['student']);
    
    // Safety check for session structure
    if (!session || !session.user || !session.user.id) {
      console.error('❌ [API] [Assignment Submit] Invalid session structure:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        hasUserId: !!session?.user?.id,
        session: session ? Object.keys(session) : null,
      });
      return NextResponse.json(
        { success: false, error: 'Invalid session. Please login again.' },
        { status: 401 }
      );
    }
    
    // Safety check for params
    if (!params || !params.id) {
      console.error('❌ [API] [Assignment Submit] Invalid params:', params);
      return NextResponse.json(
        { success: false, error: 'Assignment ID is required' },
        { status: 400 }
      );
    }
    
    const userId = session.user.id;
    const assignmentId = params.id;

    // Verify student has access to assignment
    // Note: 
    // - course_assignments uses cohort_id (not class_id) - cohorts table represents classes
    // - course_assignments.subject_id references subject_catalog.id
    // - user_class_subject_links.subject_offering_id references subject_offerings.id
    // - Need to join through subject_offerings to match subject_id with subject_offering_id
    const accessQuery = `
      SELECT DISTINCT a.id
      FROM assignments a
      INNER JOIN courses c ON a.course_id = c.id
      INNER JOIN course_assignments ca ON ca.course_id = c.id
      INNER JOIN user_class_subject_links ucsl ON (
        (ca.cohort_id IS NOT NULL AND ucsl.cohort_id = ca.cohort_id) OR
        (ca.subject_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM subject_offerings so
          WHERE so.subject_id = ca.subject_id
          AND so.id = ucsl.subject_offering_id
          AND so.cohort_id = ucsl.cohort_id
        ))
      )
      WHERE a.id = $1
        AND ucsl.user_id = $2
        AND ucsl.link_type = 'student'
        AND ca.is_active = true
        AND a.status = 'published'
    `;
    const accessResult = await query(accessQuery, [assignmentId, userId]);

    if (accessResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found or you do not have access' },
        { status: 404 }
      );
    }

    // Get assignment details
    const assignmentQuery = `
      SELECT 
        id,
        due_date,
        allow_late_submission,
        max_file_size_mb,
        allowed_file_types,
        status
      FROM assignments
      WHERE id = $1
    `;
    const assignmentResult = await query(assignmentQuery, [assignmentId]);

    if (assignmentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assignment not found' },
        { status: 404 }
      );
    }

    const assignment = assignmentResult.rows[0];

    // Check if assignment is closed
    if (assignment.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Assignment is closed and no longer accepts submissions' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files');
    const submissionIdParam = formData.get('submissionId');
    const existingFilesToKeepParam = formData.get('existingFilesToKeep');
    const linksParam = formData.get('links');
    
    // Parse file metadata (titles and descriptions) - these are arrays matching the files array
    const fileTitles = formData.getAll('fileTitles');
    const fileDescriptions = formData.getAll('fileDescriptions');
    
    // Parse links/YouTube URLs
    let links = [];
    if (linksParam) {
      try {
        links = JSON.parse(linksParam);
      } catch (e) {
        console.error('[API] Error parsing links:', e);
        links = [];
      }
    }
    
    // Parse existing files to keep (file IDs that should not be deleted)
    let existingFilesToKeep = [];
    if (existingFilesToKeepParam) {
      try {
        existingFilesToKeep = JSON.parse(existingFilesToKeepParam);
      } catch (e) {
        console.error('[API] Error parsing existingFilesToKeep:', e);
        existingFilesToKeep = [];
      }
    }

    // Validate that we have at least one item to submit (files, links, or existing files to keep)
    const totalItems = (files ? files.length : 0) + links.length + existingFilesToKeep.length;
    if (totalItems === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one file or link is required' },
        { status: 400 }
      );
    }

    // Validate each file
    const assignmentData = {
      maxFileSizeMb: assignment.max_file_size_mb,
      allowedFileTypes: assignment.allowed_file_types || [],
    };

    const validationErrors = [];
    for (const file of files) {
      if (!(file instanceof File)) {
        validationErrors.push('Invalid file provided');
        continue;
      }
      const validation = validateFile(file, assignmentData);
      if (!validation.valid) {
        validationErrors.push(...validation.errors);
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join('; ') },
        { status: 400 }
      );
    }

    // Check if submission exists (for updates)
    let existingSubmissionId = null;
    if (isUpdate || submissionIdParam) {
      const existingQuery = `
        SELECT id FROM assignment_submissions
        WHERE assignment_id = $1 AND student_id = $2
      `;
      const existingResult = await query(existingQuery, [assignmentId, userId]);
      if (existingResult.rows.length > 0 && existingResult.rows[0]?.id) {
        existingSubmissionId = existingResult.rows[0].id;
      } else {
        return NextResponse.json(
          { success: false, error: 'Submission not found' },
          { status: 404 }
        );
      }
    }

    // Check if submission already exists (for new submissions)
    if (!isUpdate && !submissionIdParam) {
      const existingQuery = `
        SELECT id FROM assignment_submissions
        WHERE assignment_id = $1 AND student_id = $2
      `;
      const existingResult = await query(existingQuery, [assignmentId, userId]);
      if (existingResult.rows.length > 0) {
        return NextResponse.json(
          { success: false, error: 'Submission already exists. Use PUT to update.' },
          { status: 400 }
        );
      }
    }

    // Calculate if submission is late
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    const isLate = now > dueDate && (!assignment.allow_late_submission);

    // Start transaction
    await client.query('BEGIN');

    try {
      // Create or update submission
      let submissionId;
      if (isUpdate && existingSubmissionId) {
        // Update existing submission
        const updateQuery = `
          UPDATE assignment_submissions
          SET submitted_at = CURRENT_TIMESTAMP,
              is_late = $1,
              status = 'submitted',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING id
        `;
        const updateResult = await client.query(updateQuery, [isLate, existingSubmissionId]);
        if (!updateResult.rows[0]?.id) {
          throw new Error('Failed to update submission - no ID returned');
        }
        submissionId = updateResult.rows[0].id;

        // Delete old files, but keep files that are in existingFilesToKeep
        if (existingFilesToKeep.length > 0) {
          // Extract file IDs from existingFilesToKeep array
          const fileIdsToKeep = existingFilesToKeep
            .map(f => f.id)
            .filter(id => id && typeof id === 'string'); // Ensure valid UUIDs
          
          if (fileIdsToKeep.length > 0) {
            // Delete all files except those in fileIdsToKeep
            await client.query(
              `DELETE FROM assignment_submission_files 
               WHERE submission_id = $1 AND id NOT IN (${fileIdsToKeep.map((_, i) => `$${i + 2}`).join(', ')})`,
              [submissionId, ...fileIdsToKeep]
            );
          } else {
            // No valid IDs to keep, delete all files
            await client.query(
              'DELETE FROM assignment_submission_files WHERE submission_id = $1',
              [submissionId]
            );
          }
        } else {
          // No existing files to keep, delete all old files
          await client.query(
            'DELETE FROM assignment_submission_files WHERE submission_id = $1',
            [submissionId]
          );
        }
      } else {
        // Create new submission
        const insertQuery = `
          INSERT INTO assignment_submissions (
            assignment_id,
            student_id,
            submitted_at,
            is_late,
            status
          ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'submitted')
          ON CONFLICT (assignment_id, student_id)
          DO UPDATE SET
            submitted_at = CURRENT_TIMESTAMP,
            is_late = $3,
            status = 'submitted',
            updated_at = CURRENT_TIMESTAMP
          RETURNING id
        `;
        const insertResult = await client.query(insertQuery, [assignmentId, userId, isLate]);
        if (!insertResult.rows[0]?.id) {
          throw new Error('Failed to create submission - no ID returned');
        }
        submissionId = insertResult.rows[0].id;
      }

      // Upload files to R2 and store metadata
      const uploadedFiles = [];
      const keyPrefix = `assignments/submissions/${assignmentId}/${userId}`;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadResult = await uploadFileToR2(file, keyPrefix);
        
        // Use user-provided title if available, otherwise use filename
        const fileTitle = (fileTitles[i] && fileTitles[i].trim()) || uploadResult.fileName;
        const fileDescription = (fileDescriptions[i] && fileDescriptions[i].trim()) || null;

        // Insert file record with title and description
        const fileInsertQuery = `
          INSERT INTO assignment_submission_files (
            submission_id,
            file_key,
            file_url,
            file_name,
            file_type,
            file_size_bytes,
            description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, created_at
        `;
        const fileResult = await client.query(fileInsertQuery, [
          submissionId,
          uploadResult.key,
          uploadResult.publicUrl,
          fileTitle, // Use user-provided title
          uploadResult.fileType,
          uploadResult.fileSizeBytes,
          fileDescription || null, // Store description (nullable)
        ]);

        if (!fileResult.rows[0]?.id) {
          throw new Error(`Failed to save file metadata for ${fileTitle}`);
        }

        uploadedFiles.push({
          id: fileResult.rows[0].id,
          fileName: fileTitle, // Use the title that was stored (user-provided or filename)
          fileUrl: uploadResult.publicUrl,
          fileType: uploadResult.fileType,
          fileSizeBytes: uploadResult.fileSizeBytes,
          createdAt: fileResult.rows[0].created_at,
        });
      }

      // Insert links/YouTube URLs (not File objects)
      for (const link of links) {
        // For links, we use the URL as both file_key and file_url
        // Use file_size_bytes = 1 (minimum required by constraint)
        const linkInsertQuery = `
          INSERT INTO assignment_submission_files (
            submission_id,
            file_key,
            file_url,
            file_name,
            file_type,
            file_size_bytes,
            description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, created_at
        `;
        
        // Use URL as file_key for links (since there's no actual file)
        const fileKey = link.fileUrl || '';
        const fileType = link.fileType === 'youtube' ? 'youtube' : 'link';
        const linkDescription = (link.description && link.description.trim()) || null;
        
        const linkResult = await client.query(linkInsertQuery, [
          submissionId,
          fileKey, // Use URL as key for links
          link.fileUrl,
          link.title,
          fileType,
          1, // file_size_bytes = 1 for links (constraint requires > 0)
          linkDescription || null, // Store description (nullable)
        ]);

        if (!linkResult.rows[0]?.id) {
          throw new Error(`Failed to save link metadata for ${link.title}`);
        }

        uploadedFiles.push({
          id: linkResult.rows[0].id,
          fileName: link.title,
          fileUrl: link.fileUrl,
          fileType: fileType,
          fileSizeBytes: 1,
          createdAt: linkResult.rows[0].created_at,
        });
      }

      // Commit transaction
      await client.query('COMMIT');

      // Get submission details
      const submissionQuery = `
        SELECT 
          sub.id,
          sub.assignment_id,
          sub.student_id,
          sub.submitted_at,
          sub.is_late,
          sub.status,
          a.course_id
        FROM assignment_submissions sub
        JOIN assignments a ON sub.assignment_id = a.id
        WHERE sub.id = $1
      `;
      const submissionResult = await query(submissionQuery, [submissionId]);

      if (!submissionResult.rows[0]) {
        throw new Error('Failed to retrieve submission after creation');
      }

      const submission = submissionResult.rows[0];
      const courseId = submission.course_id;

      // Check for milestone completion if assignment is submitted
      let milestoneResult = null;
      if (courseId) {
        try {
          const { detectMilestoneAfterAssignmentSubmission } = await import('@/lib/services/milestoneDetection.js');
          milestoneResult = await detectMilestoneAfterAssignmentSubmission(
            userId,
            courseId,
            assignmentId
          );
        } catch (error) {
          console.error('Error detecting milestone after assignment submission:', error);
          // Don't fail the request if milestone detection fails
        }
      }

      return NextResponse.json({
        success: true,
        submission: {
          id: submission.id,
          assignmentId: submission.assignment_id,
          studentId: submission.student_id,
          submittedAt: submission.submitted_at,
          isLate: submission.is_late,
          status: submission.status,
          files: uploadedFiles,
        },
        milestoneCompleted: milestoneResult ? {
          milestoneNumber: milestoneResult.milestoneNumber,
          stampType: milestoneResult.stampType,
          stampAwarded: !milestoneResult.alreadyAwarded,
        } : null,
        message: isUpdate ? 'Assignment updated successfully' : 'Assignment submitted successfully',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ [API] [Assignment Submit] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to submit assignment',
      },
      { status: error.status || 500 }
    );
  } finally {
    client.release();
  }
}

