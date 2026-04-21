/**
 * Job Applications API Route
 * 
 * GET /api/jobs/[id]/applications - List all applications for a job (Mentor only)
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/jobs/[id]/applications
 * List all applications for a job
 * Only the mentor who created the job can view applications
 */
export async function GET(request, { params }) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;
    const jobId = params.id;

    if (!jobId) {
      return NextResponse.json(
        { success: false, error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Verify job exists and belongs to mentor
    const jobCheck = await query(
      'SELECT id, title, created_by FROM jobs WHERE id = $1',
      [jobId]
    );

    if (jobCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }

    const job = jobCheck.rows[0];

    if (job.created_by !== mentorId) {
      return NextResponse.json(
        { success: false, error: 'You can only view applications for your own jobs' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status'); // Filter by application_status
    const search = searchParams.get('search'); // Search by user name/email

    const offset = (page - 1) * limit;

    // Build query with filters
    let whereConditions = ['ja.job_id = $1'];
    const queryParams = [jobId];
    let paramIndex = 2;

    if (status) {
      whereConditions.push(`ja.application_status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        u.first_name ILIKE $${paramIndex} OR 
        u.last_name ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*)::int as total
       FROM job_applications ja
       JOIN users u ON ja.user_id = u.id
       ${whereClause}`,
      queryParams
    );
    const total = countResult.rows[0]?.total || 0;

    // Get applications with user details
    const applicationsResult = await query(
      `SELECT 
        ja.id,
        ja.job_id,
        ja.user_id,
        ja.application_status,
        ja.cover_letter,
        ja.resume_url,
        ja.applied_at,
        ja.reviewed_at,
        ja.reviewed_by,
        ja.notes,
        ja.created_at,
        ja.updated_at,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url
       FROM job_applications ja
       JOIN users u ON ja.user_id = u.id
       ${whereClause}
       ORDER BY ja.applied_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, limit, offset]
    );

    const applications = applicationsResult.rows.map(row => ({
      id: row.id,
      job_id: row.job_id,
      user_id: row.user_id,
      application_status: row.application_status,
      cover_letter: row.cover_letter,
      resume_url: row.resume_url,
      applied_at: row.applied_at,
      reviewed_at: row.reviewed_at,
      reviewed_by: row.reviewed_by,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      applicant: {
        id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        avatar_url: row.avatar_url,
      },
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        applications,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get job applications error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
