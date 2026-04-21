/**
 * Mentor Job Applications API Route
 * 
 * GET /api/mentors/jobs/applications - Get all applications across all mentor's jobs
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/mentors/jobs/applications
 * Get all applications across all mentor's jobs
 */
export async function GET(request) {
  try {
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status'); // Filter by application_status
    const jobId = searchParams.get('job_id'); // Filter by specific job
    const dateFrom = searchParams.get('date_from'); // Filter by application date from
    const dateTo = searchParams.get('date_to'); // Filter by application date to
    const search = searchParams.get('search'); // Search by applicant name/email or job title

    const offset = (page - 1) * limit;

    // Build query with filters
    let whereConditions = ['j.created_by = $1'];
    const queryParams = [mentorId];
    let paramIndex = 2;

    if (status) {
      whereConditions.push(`ja.application_status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (jobId) {
      whereConditions.push(`ja.job_id = $${paramIndex}`);
      queryParams.push(jobId);
      paramIndex++;
    }

    if (dateFrom) {
      whereConditions.push(`ja.applied_at >= $${paramIndex}`);
      queryParams.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      whereConditions.push(`ja.applied_at <= $${paramIndex}`);
      queryParams.push(dateTo);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        u.first_name ILIKE $${paramIndex} OR 
        u.last_name ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR
        j.title ILIKE $${paramIndex} OR
        j.company ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*)::int as total
       FROM job_applications ja
       JOIN jobs j ON ja.job_id = j.id
       JOIN users u ON ja.user_id = u.id
       ${whereClause}`,
      queryParams
    );
    const total = countResult.rows[0]?.total || 0;

    // Get applications with job and user details
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
        j.title as job_title,
        j.company as job_company,
        j.location as job_location,
        j.job_type as job_type,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_url
       FROM job_applications ja
       JOIN jobs j ON ja.job_id = j.id
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
      job: {
        id: row.job_id,
        title: row.job_title,
        company: row.job_company,
        location: row.job_location,
        job_type: row.job_type,
      },
      applicant: {
        id: row.user_id,
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        avatar_url: row.avatar_url,
      },
    }));

    // Get summary statistics
    const statsResult = await query(
      `SELECT 
        COUNT(*)::int as total_applications,
        COUNT(DISTINCT ja.job_id)::int as jobs_with_applications,
        COUNT(CASE WHEN ja.application_status = 'pending' THEN 1 END)::int as pending_count,
        COUNT(CASE WHEN ja.application_status = 'reviewed' THEN 1 END)::int as reviewed_count,
        COUNT(CASE WHEN ja.application_status = 'shortlisted' THEN 1 END)::int as shortlisted_count,
        COUNT(CASE WHEN ja.application_status = 'rejected' THEN 1 END)::int as rejected_count,
        COUNT(CASE WHEN ja.application_status = 'accepted' THEN 1 END)::int as accepted_count
       FROM job_applications ja
       JOIN jobs j ON ja.job_id = j.id
       WHERE j.created_by = $1`,
      [mentorId]
    );

    const stats = statsResult.rows[0] || {
      total_applications: 0,
      jobs_with_applications: 0,
      pending_count: 0,
      reviewed_count: 0,
      shortlisted_count: 0,
      rejected_count: 0,
      accepted_count: 0,
    };

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
        statistics: {
          total_applications: stats.total_applications,
          jobs_with_applications: stats.jobs_with_applications,
          by_status: {
            pending: stats.pending_count,
            reviewed: stats.reviewed_count,
            shortlisted: stats.shortlisted_count,
            rejected: stats.rejected_count,
            accepted: stats.accepted_count,
          },
        },
      },
    });
  } catch (error) {
    console.error('Get mentor job applications error:', error);
    
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
