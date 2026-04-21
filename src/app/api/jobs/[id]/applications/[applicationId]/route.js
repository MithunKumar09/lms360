/**
 * Job Application Update API Route
 * 
 * PUT /api/jobs/[id]/applications/[applicationId] - Update application status (Mentor only)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query, getClient } from '@/lib/db/index.js';

/**
 * PUT /api/jobs/[id]/applications/[applicationId]
 * Update application status
 * Only the mentor who created the job can update applications
 */
export async function PUT(request, { params }) {
  const client = await getClient();
  
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;
    const { id: jobId, applicationId } = params;

    if (!jobId || !applicationId) {
      return NextResponse.json(
        { success: false, error: 'Job ID and Application ID are required' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Verify job exists and belongs to mentor
    const jobCheck = await client.query(
      'SELECT id, created_by FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    const job = jobCheck.rows[0];

    if (job.created_by !== mentorId) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'You can only update applications for your own jobs' },
        { status: 403 }
      );
    }

    // Verify application exists and belongs to this job
    const applicationCheck = await client.query(
      'SELECT id, application_status FROM job_applications WHERE id = $1 AND job_id = $2',
      [applicationId, jobId]
    );

    if (applicationCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { application_status, notes } = body;

    // Validate application_status if provided
    const validStatuses = ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted', 'withdrawn'];
    if (application_status && !validStatuses.includes(application_status)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: `Invalid application status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (application_status !== undefined) {
      updateFields.push(`application_status = $${paramIndex}`);
      updateValues.push(application_status);
      paramIndex++;
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(notes || null);
      paramIndex++;
    }

    // If status is being changed to something other than pending, set reviewed_at and reviewed_by
    if (application_status && application_status !== 'pending') {
      updateFields.push(`reviewed_at = CURRENT_TIMESTAMP`);
      updateFields.push(`reviewed_by = $${paramIndex}`);
      updateValues.push(mentorId);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Always update updated_at
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    updateValues.push(applicationId);

    const updateQuery = `
      UPDATE job_applications 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, updateValues);

    await client.query('COMMIT');

    const application = updateResult.rows[0];

    // Get user details
    const userResult = await client.query(
      `SELECT id, first_name, last_name, email, avatar_url 
       FROM users WHERE id = $1`,
      [application.user_id]
    );

    const applicant = userResult.rows[0] ? {
      id: userResult.rows[0].id,
      first_name: userResult.rows[0].first_name,
      last_name: userResult.rows[0].last_name,
      email: userResult.rows[0].email,
      avatar_url: userResult.rows[0].avatar_url,
    } : null;

    return NextResponse.json({
      success: true,
      message: 'Application updated successfully',
      data: {
        application: {
          id: application.id,
          job_id: application.job_id,
          user_id: application.user_id,
          application_status: application.application_status,
          cover_letter: application.cover_letter,
          resume_url: application.resume_url,
          applied_at: application.applied_at,
          reviewed_at: application.reviewed_at,
          reviewed_by: application.reviewed_by,
          notes: application.notes,
          created_at: application.created_at,
          updated_at: application.updated_at,
          applicant,
        },
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Update job application error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update application' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
