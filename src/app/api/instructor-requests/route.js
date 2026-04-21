/**
 * Instructor Requests API Route
 * 
 * Handles instructor promotion requests:
 * - POST: Create a new instructor request
 * - GET: List instructor requests (admin only)
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * POST /api/instructor-requests
 * Create a new instructor request
 * 
 * Request body:
 * {
 *   cohorts: string[], // Array of cohort IDs
 *   subjects: string[], // Array of subject IDs
 *   phone_number?: string,
 *   bio?: string
 * }
 */
export async function POST(request) {
  try {
    console.log('📝 [INSTRUCTOR REQUEST] ===== CREATE REQUEST STARTED =====');
    
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      console.log('📝 [INSTRUCTOR REQUEST] ❌ Not authenticated');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userOrgId = session.user.orgId;
    const userRole = session.user.role;

    // Check if user is allowed to request (not admin, superadmin, orgparent, orginstructor)
    const restrictedRoles = ['admin', 'superadmin', 'orgparent', 'orginstructor'];
    if (restrictedRoles.includes(userRole)) {
      console.log('📝 [INSTRUCTOR REQUEST] ❌ User role not allowed:', userRole);
      return NextResponse.json(
        { success: false, error: 'Your role cannot request instructor promotion' },
        { status: 403 }
      );
    }

    // Check if user has org_id
    if (!userOrgId) {
      console.log('📝 [INSTRUCTOR REQUEST] ❌ User has no organization');
      return NextResponse.json(
        { success: false, error: 'You must belong to an organization to request instructor promotion' },
        { status: 400 }
      );
    }

    // Check if user already has a pending request
    const existingRequest = await query(
      `SELECT id, status FROM instructor_requests 
       WHERE user_id = $1 AND status = 'pending'`,
      [userId]
    );

    if (existingRequest.rows.length > 0) {
      console.log('📝 [INSTRUCTOR REQUEST] ❌ Pending request already exists');
      return NextResponse.json(
        { 
          success: false, 
          error: 'You already have a pending instructor request',
          existing_request_id: existingRequest.rows[0].id
        },
        { status: 409 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const { cohorts, subjects, phone_number, bio } = body;

    // Validate required fields
    if (!cohorts || !Array.isArray(cohorts) || cohorts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one cohort is required' },
        { status: 400 }
      );
    }

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one subject is required' },
        { status: 400 }
      );
    }

    // Validate cohorts and subjects are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const invalidCohorts = cohorts.filter(id => !uuidRegex.test(id));
    const invalidSubjects = subjects.filter(id => !uuidRegex.test(id));

    if (invalidCohorts.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid cohort IDs provided' },
        { status: 400 }
      );
    }

    if (invalidSubjects.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid subject IDs provided' },
        { status: 400 }
      );
    }

    // Validate phone number format if provided
    if (phone_number && phone_number.trim()) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone_number.trim())) {
        return NextResponse.json(
          { success: false, error: 'Invalid phone number format' },
          { status: 400 }
        );
      }
    }

    // Prepare cohorts and subjects as JSONB
    // Frontend should send full cohort/subject objects, but we'll accept IDs and fetch details
    const cohortsJsonb = JSON.stringify(cohorts);
    const subjectsJsonb = JSON.stringify(subjects);

    // Create the request
    const result = await query(
      `INSERT INTO instructor_requests (user_id, org_id, cohorts, subjects, phone_number, bio, status)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, 'pending')
       RETURNING id, status, created_at`,
      [
        userId,
        userOrgId,
        cohortsJsonb,
        subjectsJsonb,
        phone_number?.trim() || null,
        bio?.trim() || null
      ]
    );

    const requestData = result.rows[0];
    console.log('📝 [INSTRUCTOR REQUEST] ✅ Request created:', requestData.id);

    // Create notification for organization admin
    // Find organization admin(s)
    const adminResult = await query(
      `SELECT id FROM users 
       WHERE org_id = $1 AND role = 'admin' AND is_active = true`,
      [userOrgId]
    );

    if (adminResult.rows.length > 0) {
      // Create notification for each admin
      for (const admin of adminResult.rows) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, data, action_url)
           VALUES ($1, 'instructor_request', $2, $3, $4::jsonb, $5)`,
          [
            admin.id,
            'New Instructor Request',
            `A user has requested to become an instructor in your organization.`,
            JSON.stringify({
              request_id: requestData.id,
              requester_id: userId,
              org_id: userOrgId
            }),
            `/dashboards/admin-instructor-requests?id=${requestData.id}`
          ]
        );
      }
      console.log('📝 [INSTRUCTOR REQUEST] ✅ Notifications created for admins');
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: requestData.id,
          status: requestData.status,
          created_at: requestData.created_at
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('📝 [INSTRUCTOR REQUEST] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create instructor request' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/instructor-requests
 * List instructor requests (Admin only)
 * 
 * Query params:
 * - status?: 'pending' | 'accepted' | 'rejected'
 * - page?: number (default: 1)
 * - limit?: number (default: 20, max: 50)
 */
export async function GET(request) {
  try {
    console.log('📋 [INSTRUCTOR REQUESTS] ===== LIST REQUESTS STARTED =====');
    
    // Check authentication and require admin role
    const session = await requireRole(request, ['admin', 'superadmin']);
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Validate status if provided
    if (status && !['pending', 'accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status filter' },
        { status: 400 }
      );
    }

    // Build query based on role
    let whereClause = '';
    const queryParams = [];
    let paramIndex = 1;

    // Admin can only see requests from their organization
    if (userRole === 'admin' && userOrgId) {
      whereClause = `WHERE ir.org_id = $${paramIndex}`;
      queryParams.push(userOrgId);
      paramIndex++;
    }

    // Add status filter if provided
    if (status) {
      whereClause += whereClause ? ` AND ir.status = $${paramIndex}` : `WHERE ir.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM instructor_requests ir ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get requests with user and organization details
    const requestsQuery = `
      SELECT 
        ir.id,
        ir.user_id,
        ir.org_id,
        ir.status,
        ir.cohorts,
        ir.subjects,
        ir.phone_number,
        ir.bio,
        ir.mfa_method,
        ir.reviewed_by,
        ir.reviewed_at,
        ir.rejection_reason,
        ir.created_at,
        ir.updated_at,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.avatar_url as user_avatar_url,
        u.role as user_role,
        o.name as org_name,
        reviewer.email as reviewer_email,
        reviewer.first_name as reviewer_first_name,
        reviewer.last_name as reviewer_last_name
      FROM instructor_requests ir
      INNER JOIN users u ON ir.user_id = u.id
      INNER JOIN organizations o ON ir.org_id = o.id
      LEFT JOIN users reviewer ON ir.reviewed_by = reviewer.id
      ${whereClause}
      ORDER BY ir.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const requestsResult = await query(requestsQuery, queryParams);

    // Enrich cohorts and subjects with names
    const requests = await Promise.all(
      requestsResult.rows.map(async (row) => {
        // Get cohort details if cohorts exist
        let enrichedCohorts = [];
        if (row.cohorts && Array.isArray(row.cohorts) && row.cohorts.length > 0) {
          const cohortIds = row.cohorts.filter(id => typeof id === 'string' && id.length > 0);
          if (cohortIds.length > 0) {
            const cohortsQuery = `
              SELECT 
                c.id,
                c.code,
                c.level,
                pn.title as program_node_name,
                pn.code as program_node_code,
                s.label as section_name,
                t.label as term_name,
                ac.code as session_code
              FROM cohorts c
              LEFT JOIN program_nodes pn ON c.program_node_id = pn.id
              LEFT JOIN sections s ON c.section_id = s.id
              LEFT JOIN terms t ON c.term_id = t.id
              LEFT JOIN academic_sessions ac ON c.session_id = ac.id
              WHERE c.id = ANY($1::uuid[])
            `;
            const cohortsResult = await query(cohortsQuery, [cohortIds]);
            const cohortMap = new Map(cohortsResult.rows.map(c => [c.id, c]));
            
            enrichedCohorts = cohortIds.map(id => {
              const cohort = cohortMap.get(id);
              if (cohort) {
                return {
                  id: cohort.id,
                  name: cohort.code || `Cohort ${id.substring(0, 8)}`,
                  cohort_code: cohort.code,
                  code: cohort.code,
                  level: cohort.level,
                  program_node: cohort.program_node_name ? {
                    name: cohort.program_node_name,
                    code: cohort.program_node_code
                  } : null,
                  section_name: cohort.section_name,
                  term_name: cohort.term_name,
                  session_code: cohort.session_code
                };
              }
              return { id, name: `Cohort ${id.substring(0, 8)}` };
            });
          }
        }

        // Get subject details if subjects exist
        let enrichedSubjects = [];
        if (row.subjects && Array.isArray(row.subjects) && row.subjects.length > 0) {
          const subjectIds = row.subjects.filter(id => typeof id === 'string' && id.length > 0);
          if (subjectIds.length > 0) {
            const subjectsQuery = `
              SELECT id, code, title
              FROM subject_catalog
              WHERE id = ANY($1::uuid[])
            `;
            const subjectsResult = await query(subjectsQuery, [subjectIds]);
            const subjectMap = new Map(subjectsResult.rows.map(s => [s.id, s]));
            
            enrichedSubjects = subjectIds.map(id => {
              const subject = subjectMap.get(id);
              if (subject) {
                return {
                  id: subject.id,
                  name: subject.title || subject.code || `Subject ${id.substring(0, 8)}`,
                  title: subject.title,
                  code: subject.code
                };
              }
              return { id, name: `Subject ${id.substring(0, 8)}` };
            });
          }
        }

        return {
          id: row.id,
          user: {
            id: row.user_id,
            email: row.user_email,
            first_name: row.user_first_name,
            last_name: row.user_last_name,
            avatar_url: row.user_avatar_url,
            role: row.user_role
          },
          organization: {
            id: row.org_id,
            name: row.org_name
          },
          status: row.status,
          cohorts: enrichedCohorts,
          subjects: enrichedSubjects,
          phone_number: row.phone_number,
          bio: row.bio,
          mfa_method: row.mfa_method,
          reviewed_by: row.reviewed_by ? {
            id: row.reviewed_by,
            email: row.reviewer_email,
            first_name: row.reviewer_first_name,
            last_name: row.reviewer_last_name
          } : null,
          reviewed_at: row.reviewed_at,
          rejection_reason: row.rejection_reason,
          created_at: row.created_at,
          updated_at: row.updated_at
        };
      })
    );

    const totalPages = Math.ceil(total / limit);

    console.log('📋 [INSTRUCTOR REQUESTS] ✅ Requests fetched:', requests.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          requests,
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
    console.error('📋 [INSTRUCTOR REQUESTS] ❌ Error:', error);
    
    // Handle authentication errors
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch instructor requests' 
      },
      { status: 500 }
    );
  }
}

