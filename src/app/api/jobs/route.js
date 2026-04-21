/**
 * Jobs API Route
 * 
 * GET /api/jobs - List jobs (with filters)
 * POST /api/jobs - Create a new job (Mentor only)
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';

/**
 * GET /api/jobs
 * List jobs with optional filters and role-based filtering
 */
export async function GET(request) {
  try {
    console.log('💼 [JOBS] ===== LIST JOBS STARTED =====');
    
    // Optional authentication - get session if available
    let session = null;
    try {
      session = await auth();
    } catch (error) {
      // Session not available, continue as public user
      console.log('💼 [JOBS] No session found, treating as public user');
    }
    
    const userRole = session?.user?.role || null;
    const userId = session?.user?.id || null;
    const userOrgId = session?.user?.orgId || null;
    
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    
    const organizationId = searchParams.get('organization_id'); // Filter by organization
    const createdBy = searchParams.get('created_by'); // Filter by creator
    const status = searchParams.get('status'); // Filter by status
    const jobType = searchParams.get('job_type'); // Filter by job type
    const search = searchParams.get('search'); // Full-text search
    const publishedOnly = searchParams.get('published_only') === 'true'; // Only published jobs

    // Build WHERE conditions
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Role-based filtering
    if (userRole === 'superadmin') {
      // Superadmin: Show all jobs, optional organization filter
      if (organizationId) {
        whereConditions.push(`j.organization_id = $${paramIndex}`);
        queryParams.push(organizationId);
        paramIndex++;
      }
    } else if (userRole === 'admin' || userRole === 'instructor' || userRole === 'student') {
      // Admin/Instructor/Student: Only their organization's jobs
      if (userOrgId) {
        whereConditions.push(`j.organization_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        // User without org - return empty
        return NextResponse.json({
          success: true,
          data: {
            jobs: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }
        }, { status: 200 });
      }
    } else if (userRole === 'mentor') {
      // Mentor: Only their organization's jobs (mentors create jobs for their org)
      if (userOrgId) {
        whereConditions.push(`j.organization_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        // Mentor without org - return empty
        return NextResponse.json({
          success: true,
          data: {
            jobs: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }
        }, { status: 200 });
      }
    } else if (userRole === 'vendor') {
      // Vendor: Only assigned organizations' jobs
      if (userId) {
        // Get vendor's assigned organization IDs
        const vendorOrgsResult = await query(
          `SELECT organization_id FROM vendor_organizations WHERE vendor_id = $1`,
          [userId]
        );
        const vendorOrgIds = vendorOrgsResult.rows.map(row => row.organization_id);
        
        if (vendorOrgIds.length === 0) {
          // Vendor with no assigned orgs - return empty
          return NextResponse.json({
            success: true,
            data: {
              jobs: [],
              pagination: { page, limit, total: 0, totalPages: 0 }
            }
          }, { status: 200 });
        }
        
        // Filter by vendor's assigned organizations
        whereConditions.push(`j.organization_id = ANY($${paramIndex}::uuid[])`);
        queryParams.push(vendorOrgIds);
        paramIndex++;
      } else {
        // Vendor without user ID - return empty
        return NextResponse.json({
          success: true,
          data: {
            jobs: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }
        }, { status: 200 });
      }
    } else {
      // Public user: Only published jobs
      if (!publishedOnly) {
        whereConditions.push(`j.status = 'published'`);
      }
    }

    // Additional filters
    if (createdBy) {
      whereConditions.push(`j.created_by = $${paramIndex}`);
      queryParams.push(createdBy);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`j.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    } else if (publishedOnly && !userRole) {
      // Public users: only published by default
      whereConditions.push(`j.status = 'published'`);
    }

    if (jobType) {
      whereConditions.push(`j.job_type = $${paramIndex}`);
      queryParams.push(jobType);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`to_tsvector('simple', coalesce(j.title, '') || ' ' || coalesce(j.company, '') || ' ' || coalesce(j.description, '') || ' ' || coalesce(j.full_description, '')) @@ plainto_tsquery('simple', $${paramIndex})`);
      queryParams.push(search);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM jobs j ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get jobs with pagination
    const jobsQuery = `
      SELECT 
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
      ${whereClause}
      ORDER BY j.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const jobsResult = await query(jobsQuery, queryParams);

    const jobs = jobsResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      job_type: row.job_type,
      salary_min: row.salary_min ? parseFloat(row.salary_min) : null,
      salary_max: row.salary_max ? parseFloat(row.salary_max) : null,
      salary_currency: row.salary_currency || 'INR',
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
    }));

    const totalPages = Math.ceil(total / limit);

    console.log('💼 [JOBS] ✅ Jobs fetched:', jobs.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          jobs,
          pagination: {
            page,
            limit,
            total,
            totalPages
          }
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('💼 [JOBS] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch jobs' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs
 * Create a new job (Mentor only)
 */
export async function POST(request) {
  const client = await getClient();
  
  try {
    console.log('💼 [JOBS] ===== CREATE JOB STARTED =====');
    
    // Require mentor role
    const session = await requireRole(request, ['mentor']);
    const mentorId = session.user.id;
    const mentorOrgId = session.user.orgId;

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
      status = 'draft',
    } = body;

    // Validation
    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Title is required and must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!company || company.trim().length < 1) {
      return NextResponse.json(
        { success: false, error: 'Company is required' },
        { status: 400 }
      );
    }

    if (!['full_time', 'part_time', 'contract', 'internship', 'freelance'].includes(job_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid job type' },
        { status: 400 }
      );
    }

    if (salary_min !== null && salary_min !== undefined && salary_min < 0) {
      return NextResponse.json(
        { success: false, error: 'Salary min must be >= 0' },
        { status: 400 }
      );
    }

    if (salary_max !== null && salary_max !== undefined && salary_max < 0) {
      return NextResponse.json(
        { success: false, error: 'Salary max must be >= 0' },
        { status: 400 }
      );
    }

    if (salary_min !== null && salary_max !== null && salary_max < salary_min) {
      return NextResponse.json(
        { success: false, error: 'Salary max must be >= salary min' },
        { status: 400 }
      );
    }

    if (external_apply_link && !external_apply_link.match(/^https?:\/\//)) {
      return NextResponse.json(
        { success: false, error: 'External apply link must be a valid URL' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Insert job
    const insertResult = await client.query(
      `INSERT INTO jobs (
        title, company, location, job_type,
        salary_min, salary_max, salary_currency,
        skills, description, full_description,
        application_deadline, external_apply_link,
        created_by, organization_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        title.trim(),
        company.trim(),
        location?.trim() || null,
        job_type,
        salary_min || null,
        salary_max || null,
        salary_currency || 'INR',
        skills ? JSON.stringify(skills) : null,
        description?.trim() || null,
        full_description?.trim() || null,
        application_deadline || null,
        external_apply_link || null,
        mentorId,
        mentorOrgId,
        status,
      ]
    );

    await client.query('COMMIT');

    const job = insertResult.rows[0];

    console.log('💼 [JOBS] ✅ Job created:', job.id);

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
      { status: 201 }
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
        error: error.message || 'Failed to create job' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

