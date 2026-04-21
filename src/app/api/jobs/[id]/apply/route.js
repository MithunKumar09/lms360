/**
 * Job Application API Route
 * 
 * POST /api/jobs/[id]/apply - Apply for a job
 * GET /api/jobs/[id]/apply - Check application status
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query, getClient } from '@/lib/db/index.js';

/**
 * POST /api/jobs/[id]/apply
 * Apply for a job
 */
export async function POST(request, { params }) {
  const client = await getClient();
  
  try {
    // Allow any authenticated user to apply (jobs are open to all)
    const session = await requireRole(request, ['student', 'alumni', 'parent', 'instructor', 'vendor', 'mentor', 'admin', 'superadmin']);
    const userId = session.user.id;
    const jobId = params.id;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Verify job exists and is published
    const jobCheck = await client.query(
      `SELECT id, title, status, application_deadline
       FROM jobs 
       WHERE id = $1 AND status = 'published'`,
      [jobId]
    );

    if (jobCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Job not found or not available for applications' },
        { status: 404 }
      );
    }

    const job = jobCheck.rows[0];

    // Check if application deadline has passed
    if (job.application_deadline) {
      const deadline = new Date(job.application_deadline);
      const now = new Date();
      if (deadline < now) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'Application deadline has passed' },
          { status: 400 }
        );
      }
    }

    // Check if user already applied
    const existingApplication = await client.query(
      `SELECT id, application_status FROM job_applications
       WHERE job_id = $1 AND user_id = $2`,
      [jobId, userId]
    );

    if (existingApplication.rows.length > 0) {
      const app = existingApplication.rows[0];
      if (app.application_status !== 'withdrawn') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'You have already applied for this job' },
          { status: 400 }
        );
      }
      // If withdrawn, allow re-application by updating the existing record
      const body = await request.json().catch(() => ({}));
      const { cover_letter, resume_url } = body;

      const updateResult = await client.query(
        `UPDATE job_applications 
         SET application_status = 'pending',
             cover_letter = COALESCE($1, cover_letter),
             resume_url = COALESCE($2, resume_url),
             applied_at = CURRENT_TIMESTAMP,
             reviewed_at = NULL,
             reviewed_by = NULL,
             notes = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, applied_at, application_status`,
        [cover_letter || null, resume_url || null, app.id]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Application submitted successfully',
        application: updateResult.rows[0],
      });
    }

    // Create new application
    const body = await request.json().catch(() => ({}));
    const { cover_letter, resume_url } = body;

    // Validate resume URL format if provided
    if (resume_url && !resume_url.match(/^https?:\/\//)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Resume URL must be a valid HTTP/HTTPS URL' },
        { status: 400 }
      );
    }

    const applicationResult = await client.query(
      `INSERT INTO job_applications (
        job_id, user_id, application_status, cover_letter, resume_url
      ) VALUES ($1, $2, 'pending', $3, $4)
      RETURNING id, applied_at, application_status`,
      [jobId, userId, cover_letter || null, resume_url || null]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: applicationResult.rows[0],
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Job application error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit application' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * GET /api/jobs/[id]/apply
 * Check application status
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['student', 'alumni', 'parent', 'instructor', 'vendor', 'mentor', 'admin', 'superadmin']);
    const userId = session.user.id;
    const jobId = params.id;

    const applicationResult = await query(
      `SELECT * FROM job_applications WHERE job_id = $1 AND user_id = $2`,
      [jobId, userId]
    );

    if (applicationResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        isApplied: false,
      });
    }

    return NextResponse.json({
      success: true,
      isApplied: true,
      application: applicationResult.rows[0],
    });
  } catch (error) {
    console.error('Check job application error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check application' },
      { status: 500 }
    );
  }
}
