/**
 * Individual Job API Route
 * 
 * GET /api/jobs/[id] - Get job by ID
 * PUT /api/jobs/[id] - Update job (Mentor only, own jobs)
 * DELETE /api/jobs/[id] - Delete job (Mentor only, own jobs)
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/jobs/[id]
 * Get job by ID
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const jobResult = await query(
      `SELECT 
        j.id,
        j.title,
        j.company,
        j.location,
        j.job_type,
        j.salary_min,
        j.salary_max,
        j.salary_currency,
        j.skills,
        j.description,
        j.full_description,
        j.application_deadline,
        j.external_apply_link,
        j.created_by,
        j.organization_id,
        j.status,
        j.created_at,
        j.updated_at,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        u.email as creator_email,
        o.name as organization_name
      FROM jobs j
      LEFT JOIN users u ON j.created_by = u.id
      LEFT JOIN organizations o ON j.organization_id = o.id
      WHERE j.id = $1`,
      [id]
    );

    if (jobResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    const row = jobResult.rows[0];
    const job = {
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      job_type: row.job_type,
      salary_min: row.salary_min ? parseFloat(row.salary_min) : null,
      salary_max: row.salary_max ? parseFloat(row.salary_max) : null,
      salary_currency: row.salary_currency,
      skills: row.skills || [],
      description: row.description,
      full_description: row.full_description,
      application_deadline: row.application_deadline,
      external_apply_link: row.external_apply_link,
      created_by: row.created_by,
      organization_id: row.organization_id,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      creator: {
        first_name: row.creator_first_name,
        last_name: row.creator_last_name,
        email: row.creator_email,
      },
      organization: row.organization_name ? {
        id: row.organization_id,
        name: row.organization_name,
      } : null,
    };

    return NextResponse.json(
      {
        success: true,
        data: { job }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('💼 [JOBS] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch job' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/jobs/[id]
 * Update job (Mentor only, own jobs)
 */
export async function PUT(request, { params }) {
  const client = await getClient();
  
  try {
    const { id } = params;
    
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Verify job exists and belongs to mentor
    const jobCheck = await client.query(
      'SELECT created_by FROM jobs WHERE id = $1',
      [id]
    );

    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    if (jobCheck.rows[0].created_by !== mentorId) {
      return NextResponse.json(
        { success: false, error: 'You can only update your own jobs' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      company,
      location,
      job_type,
      salary_min,
      salary_max,
      salary_currency,
      skills,
      description,
      full_description,
      application_deadline,
      external_apply_link,
      status,
    } = body;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (title !== undefined) {
      if (title.trim().length < 3) {
        return NextResponse.json(
          { success: false, error: 'Title must be at least 3 characters' },
          { status: 400 }
        );
      }
      updateFields.push(`title = $${paramIndex}`);
      updateValues.push(title.trim());
      paramIndex++;
    }

    if (company !== undefined) {
      if (company.trim().length < 1) {
        return NextResponse.json(
          { success: false, error: 'Company is required' },
          { status: 400 }
        );
      }
      updateFields.push(`company = $${paramIndex}`);
      updateValues.push(company.trim());
      paramIndex++;
    }

    if (location !== undefined) {
      updateFields.push(`location = $${paramIndex}`);
      updateValues.push(location?.trim() || null);
      paramIndex++;
    }

    if (job_type !== undefined) {
      if (!['full_time', 'part_time', 'contract', 'internship', 'freelance'].includes(job_type)) {
        return NextResponse.json(
          { success: false, error: 'Invalid job type' },
          { status: 400 }
        );
      }
      updateFields.push(`job_type = $${paramIndex}`);
      updateValues.push(job_type);
      paramIndex++;
    }

    if (salary_min !== undefined) {
      if (salary_min !== null && salary_min < 0) {
        return NextResponse.json(
          { success: false, error: 'Salary min must be >= 0' },
          { status: 400 }
        );
      }
      updateFields.push(`salary_min = $${paramIndex}`);
      updateValues.push(salary_min || null);
      paramIndex++;
    }

    if (salary_max !== undefined) {
      if (salary_max !== null && salary_max < 0) {
        return NextResponse.json(
          { success: false, error: 'Salary max must be >= 0' },
          { status: 400 }
        );
      }
      updateFields.push(`salary_max = $${paramIndex}`);
      updateValues.push(salary_max || null);
      paramIndex++;
    }

    if (salary_currency !== undefined) {
      updateFields.push(`salary_currency = $${paramIndex}`);
      updateValues.push(salary_currency || 'INR');
      paramIndex++;
    }

    if (skills !== undefined) {
      updateFields.push(`skills = $${paramIndex}`);
      updateValues.push(skills ? JSON.stringify(skills) : null);
      paramIndex++;
    }

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description?.trim() || null);
      paramIndex++;
    }

    if (full_description !== undefined) {
      updateFields.push(`full_description = $${paramIndex}`);
      updateValues.push(full_description?.trim() || null);
      paramIndex++;
    }

    if (application_deadline !== undefined) {
      updateFields.push(`application_deadline = $${paramIndex}`);
      updateValues.push(application_deadline || null);
      paramIndex++;
    }

    if (external_apply_link !== undefined) {
      if (external_apply_link && !external_apply_link.match(/^https?:\/\//)) {
        return NextResponse.json(
          { success: false, error: 'External apply link must be a valid URL' },
          { status: 400 }
        );
      }
      updateFields.push(`external_apply_link = $${paramIndex}`);
      updateValues.push(external_apply_link || null);
      paramIndex++;
    }

    if (status !== undefined) {
      if (!['draft', 'published', 'closed', 'expired'].includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(status);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Validate salary range if both are being updated
    if (salary_min !== undefined && salary_max !== undefined) {
      if (salary_min !== null && salary_max !== null && salary_max < salary_min) {
        return NextResponse.json(
          { success: false, error: 'Salary max must be >= salary min' },
          { status: 400 }
        );
      }
    }

    await client.query('BEGIN');

    updateValues.push(id);
    const updateQuery = `
      UPDATE jobs 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, updateValues);

    await client.query('COMMIT');

    const job = updateResult.rows[0];

    return NextResponse.json(
      {
        success: true,
        data: {
          job: {
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            job_type: job.job_type,
            salary_min: job.salary_min ? parseFloat(job.salary_min) : null,
            salary_max: job.salary_max ? parseFloat(job.salary_max) : null,
            salary_currency: job.salary_currency,
            skills: job.skills || [],
            description: job.description,
            full_description: job.full_description,
            application_deadline: job.application_deadline,
            external_apply_link: job.external_apply_link,
            created_by: job.created_by,
            organization_id: job.organization_id,
            status: job.status,
            created_at: job.created_at,
            updated_at: job.updated_at,
          }
        }
      },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💼 [JOBS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update job' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/jobs/[id]
 * Delete job (Mentor only, own jobs)
 */
export async function DELETE(request, { params }) {
  const client = await getClient();
  
  try {
    const { id } = params;
    
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Verify job exists and belongs to mentor
    const jobCheck = await client.query(
      'SELECT created_by FROM jobs WHERE id = $1',
      [id]
    );

    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    if (jobCheck.rows[0].created_by !== mentorId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own jobs' },
        { status: 403 }
      );
    }

    await client.query('BEGIN');

    await client.query('DELETE FROM jobs WHERE id = $1', [id]);

    await client.query('COMMIT');

    return NextResponse.json(
      {
        success: true,
        message: 'Job deleted successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💼 [JOBS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete job' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

