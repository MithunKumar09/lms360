/**
 * Workshops API Route
 * 
 * GET /api/workshops - List workshops (with filters)
 * POST /api/workshops - Create a new workshop (Vendor/Mentor only)
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';

/**
 * GET /api/workshops
 * List workshops with optional filters and role-based filtering
 */
export async function GET(request) {
  try {
    console.log('🎓 [WORKSHOPS] ===== LIST WORKSHOPS STARTED =====');
    
    // Optional authentication - get session if available
    let session = null;
    try {
      session = await auth();
    } catch (error) {
      // Session not available, continue as public user
      console.log('🎓 [WORKSHOPS] No session found, treating as public user');
    }
    
    const userRole = session?.user?.role || null;
    const userId = session?.user?.id || null;
    const userOrgId = session?.user?.orgId || null;
    
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    
    const organizationId = searchParams.get('organization_id'); // Filter by organization
    const createdBy = searchParams.get('created_by'); // Filter by creator user ID
    const creatorRole = searchParams.get('creator_role'); // Filter by creator role (vendor/mentor)
    const status = searchParams.get('status'); // Filter by status
    const mode = searchParams.get('mode'); // Filter by mode
    const dateFilter = searchParams.get('date_filter'); // Filter by date: upcoming, current, past, all
    const search = searchParams.get('search'); // Full-text search
    const publishedOnly = searchParams.get('published_only') === 'true'; // Only published workshops

    // Build WHERE conditions
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Role-based filtering
    if (userRole === 'superadmin') {
      // Superadmin: Show all workshops, optional organization filter
      if (organizationId) {
        whereConditions.push(`w.organization_id = $${paramIndex}`);
        queryParams.push(organizationId);
        paramIndex++;
      }
    } else if (userRole === 'admin') {
      // Admin: Only their organization's workshops
      if (userOrgId) {
        whereConditions.push(`w.organization_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        // Admin without org - return empty
        return NextResponse.json({
          success: true,
          data: {
            workshops: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }
        }, { status: 200 });
      }
    } else if (userRole === 'instructor' || userRole === 'student') {
      // Instructor/Student: Only their organization's workshops
      if (userOrgId) {
        whereConditions.push(`w.organization_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        // User without org - return empty
        return NextResponse.json({
          success: true,
          data: {
            workshops: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }
        }, { status: 200 });
      }
    } else if (userRole === 'mentor') {
      // Mentor: Only their organization's workshops
      if (userOrgId) {
        whereConditions.push(`w.organization_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        // Mentor without org - return empty
        return NextResponse.json({
          success: true,
          data: {
            workshops: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }
        }, { status: 200 });
      }
    } else if (userRole === 'vendor') {
      // Vendor: Only assigned organizations' workshops, exclude mentor-created workshops
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
              workshops: [],
              pagination: { page, limit, total: 0, totalPages: 0 }
            }
          }, { status: 200 });
        }
        
        // Filter by vendor's assigned organizations
        whereConditions.push(`w.organization_id = ANY($${paramIndex}::uuid[])`);
        queryParams.push(vendorOrgIds);
        paramIndex++;
        
        // Exclude mentor-created workshops
        const mentorIdsResult = await query(
          `SELECT id FROM users WHERE role = 'mentor'`,
          []
        );
        const mentorIds = mentorIdsResult.rows.map(row => row.id);
        
        if (mentorIds.length > 0) {
          whereConditions.push(`w.created_by != ALL($${paramIndex}::uuid[])`);
          queryParams.push(mentorIds);
          paramIndex++;
        }
      } else {
        // Vendor without user ID - return empty
        return NextResponse.json({
          success: true,
          data: {
            workshops: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }
        }, { status: 200 });
      }
    } else {
      // Public user: Only published workshops
      if (!publishedOnly) {
        whereConditions.push(`w.status = 'published'`);
      }
    }

    // Additional filters
    if (createdBy) {
      whereConditions.push(`w.created_by = $${paramIndex}`);
      queryParams.push(createdBy);
      paramIndex++;
    }

    if (creatorRole) {
      // Filter by creator role (vendor or mentor)
      const creatorRoleIdsResult = await query(
        `SELECT id FROM users WHERE role = $1`,
        [creatorRole]
      );
      const creatorRoleIds = creatorRoleIdsResult.rows.map(row => row.id);
      
      if (creatorRoleIds.length > 0) {
        whereConditions.push(`w.created_by = ANY($${paramIndex}::uuid[])`);
        queryParams.push(creatorRoleIds);
        paramIndex++;
      } else {
        // No users with this role - return empty
        return NextResponse.json({
          success: true,
          data: {
            workshops: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }
        }, { status: 200 });
      }
    }

    if (status) {
      whereConditions.push(`w.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    } else if (publishedOnly && !userRole) {
      // Public users: only published by default
      whereConditions.push(`w.status = 'published'`);
    }

    if (mode) {
      whereConditions.push(`w.mode = $${paramIndex}`);
      queryParams.push(mode);
      paramIndex++;
    }

    // Date-based filtering
    if (dateFilter) {
      const now = new Date().toISOString();
      if (dateFilter === 'upcoming') {
        whereConditions.push(`w.start_date > $${paramIndex}`);
        queryParams.push(now);
        paramIndex++;
      } else if (dateFilter === 'current') {
        whereConditions.push(`w.start_date <= $${paramIndex} AND w.end_date >= $${paramIndex + 1}`);
        queryParams.push(now, now);
        paramIndex += 2;
      } else if (dateFilter === 'past') {
        whereConditions.push(`w.end_date < $${paramIndex}`);
        queryParams.push(now);
        paramIndex++;
      }
      // 'all' - no date filter
    }

    if (search) {
      whereConditions.push(`to_tsvector('simple', coalesce(w.title, '') || ' ' || coalesce(w.description, '')) @@ plainto_tsquery('simple', $${paramIndex})`);
      queryParams.push(search);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM workshops w ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get workshops with pagination
    const workshopsQuery = `
      SELECT 
        w.id,
        w.title,
        w.description,
        w.banner_url,
        w.start_date,
        w.end_date,
        w.mode,
        w.external_link,
        w.is_free,
        w.price,
        w.capacity,
        w.created_by,
        w.organization_id,
        w.status,
        w.created_at,
        w.updated_at,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        u.email as creator_email,
        u.role as creator_role,
        o.name as organization_name
      FROM workshops w
      LEFT JOIN users u ON w.created_by = u.id
      LEFT JOIN organizations o ON w.organization_id = o.id
      ${whereClause}
      ORDER BY w.start_date DESC, w.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const workshopsResult = await query(workshopsQuery, queryParams);

    const workshops = workshopsResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      banner_url: row.banner_url,
      start_date: row.start_date,
      end_date: row.end_date,
      mode: row.mode,
      external_link: row.external_link,
      is_free: row.is_free,
      price: row.price ? parseFloat(row.price) : null,
      capacity: row.capacity ? parseInt(row.capacity, 10) : null,
      created_by: row.created_by,
      organization_id: row.organization_id,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      creator: {
        first_name: row.creator_first_name,
        last_name: row.creator_last_name,
        email: row.creator_email,
        role: row.creator_role,
      },
      organization: row.organization_name ? {
        id: row.organization_id,
        name: row.organization_name,
      } : null,
    }));

    const totalPages = Math.ceil(total / limit);

    console.log('🎓 [WORKSHOPS] ✅ Workshops fetched:', workshops.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          workshops,
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
    console.error('🎓 [WORKSHOPS] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch workshops' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workshops
 * Create a new workshop (Vendor/Mentor only)
 */
export async function POST(request) {
  const client = await getClient();
  
  try {
    console.log('🎓 [WORKSHOPS] ===== CREATE WORKSHOP STARTED =====');
    
    // Require vendor or mentor role
    const session = await requireRole(request, ['vendor', 'mentor']);
    const creatorId = session.user.id;
    const creatorRole = session.user.role;
    const creatorOrgId = session.user.orgId;

    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      banner_url,
      start_date,
      end_date,
      mode,
      external_link,
      is_free,
      price,
      capacity,
      organization_id,
      status = 'draft',
    } = body;

    // Validation
    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Title is required and must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!start_date || !end_date) {
      return NextResponse.json(
        { success: false, error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    if (new Date(end_date) < new Date(start_date)) {
      return NextResponse.json(
        { success: false, error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    if (!['online', 'offline', 'live'].includes(mode)) {
      return NextResponse.json(
        { success: false, error: 'Mode must be online, offline, or live' },
        { status: 400 }
      );
    }

    if (mode === 'online' && !external_link) {
      return NextResponse.json(
        { success: false, error: 'External link is required for online workshops' },
        { status: 400 }
      );
    }

    if (is_free === false && (!price || price < 0)) {
      return NextResponse.json(
        { success: false, error: 'Price is required and must be >= 0 for paid workshops' },
        { status: 400 }
      );
    }

    if (capacity !== null && capacity !== undefined && capacity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Capacity must be greater than 0 if provided' },
        { status: 400 }
      );
    }

    // Validate organization_id
    let finalOrgId = organization_id || creatorOrgId;
    if (creatorRole === 'vendor' && finalOrgId) {
      // For vendors, verify organization is assigned to them
      const orgCheck = await client.query(
        `SELECT vo.organization_id 
         FROM vendor_organizations vo
         WHERE vo.vendor_id = $1 AND vo.organization_id = $2`,
        [creatorId, finalOrgId]
      );
      if (orgCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Organization not assigned to this vendor' },
          { status: 403 }
        );
      }
    } else if (creatorRole === 'mentor') {
      // For mentors, use their organization_id
      finalOrgId = creatorOrgId;
    }

    await client.query('BEGIN');

    // Insert workshop
    const insertResult = await client.query(
      `INSERT INTO workshops (
        title, description, banner_url, start_date, end_date,
        mode, external_link, is_free, price, capacity,
        created_by, organization_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        title.trim(),
        description?.trim() || null,
        banner_url || null,
        start_date,
        end_date,
        mode,
        external_link || null,
        is_free !== false, // Default to true
        is_free === false ? price : null,
        capacity || null,
        creatorId,
        finalOrgId,
        status,
      ]
    );

    await client.query('COMMIT');

    const workshop = insertResult.rows[0];

    console.log('🎓 [WORKSHOPS] ✅ Workshop created:', workshop.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          workshop: {
            id: workshop.id,
            title: workshop.title,
            description: workshop.description,
            banner_url: workshop.banner_url,
            start_date: workshop.start_date,
            end_date: workshop.end_date,
            mode: workshop.mode,
            external_link: workshop.external_link,
            is_free: workshop.is_free,
            price: workshop.price ? parseFloat(workshop.price) : null,
            capacity: workshop.capacity ? parseInt(workshop.capacity, 10) : null,
            created_by: workshop.created_by,
            organization_id: workshop.organization_id,
            status: workshop.status,
            created_at: workshop.created_at,
            updated_at: workshop.updated_at,
          }
        }
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('🎓 [WORKSHOPS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create workshop' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

