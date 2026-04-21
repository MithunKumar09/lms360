/**
 * Events API Route
 * 
 * GET /api/events - List events (with filters)
 * POST /api/events - Create a new event (Vendor or Mentor)
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';

/**
 * GET /api/events
 * List events with optional filters and role-based filtering
 */
export async function GET(request) {
  try {
    console.log('📅 [EVENTS] ===== LIST EVENTS STARTED =====');
    
    // Optional authentication - get session if available
    let session = null;
    try {
      session = await auth();
    } catch (error) {
      // Session not available, continue as public user
      console.log('📅 [EVENTS] No session found, treating as public user');
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
    const publishedOnly = searchParams.get('published_only') === 'true'; // Only published events

    // Build WHERE conditions
    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Role-based filtering
    if (userRole === 'superadmin') {
      // Superadmin: Show all events, optional organization filter
      if (organizationId) {
        whereConditions.push(`e.organization_id = $${paramIndex}`);
        queryParams.push(organizationId);
        paramIndex++;
      }
    } else if (userRole === 'admin') {
      // Admin: Only their organization's events
      if (userOrgId) {
        whereConditions.push(`e.organization_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        // Admin without org - return empty
        return NextResponse.json({
          success: true,
          data: {
            events: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }
        }, { status: 200 });
      }
    } else if (userRole === 'instructor' || userRole === 'student') {
      // Instructor/Student: Only their organization's events
      if (userOrgId) {
        whereConditions.push(`e.organization_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        // User without org - return empty
        return NextResponse.json({
          success: true,
          data: {
            events: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }
        }, { status: 200 });
      }
    } else if (userRole === 'mentor') {
      // Mentor: Only their organization's events
      if (userOrgId) {
        whereConditions.push(`e.organization_id = $${paramIndex}`);
        queryParams.push(userOrgId);
        paramIndex++;
      } else {
        // Mentor without org - return empty
        return NextResponse.json({
          success: true,
          data: {
            events: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }
        }, { status: 200 });
      }
    } else if (userRole === 'vendor') {
      // Vendor: Only assigned organizations' events, exclude mentor-created events
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
              events: [],
              pagination: { page, limit, total: 0, totalPages: 0 }
            }
          }, { status: 200 });
        }
        
        // Filter by vendor's assigned organizations
        whereConditions.push(`e.organization_id = ANY($${paramIndex}::uuid[])`);
        queryParams.push(vendorOrgIds);
        paramIndex++;
        
        // Exclude mentor-created events
        const mentorIdsResult = await query(
          `SELECT id FROM users WHERE role = 'mentor'`,
          []
        );
        const mentorIds = mentorIdsResult.rows.map(row => row.id);
        
        if (mentorIds.length > 0) {
          whereConditions.push(`e.created_by != ALL($${paramIndex}::uuid[])`);
          queryParams.push(mentorIds);
          paramIndex++;
        }
      } else {
        // Vendor without user ID - return empty
        return NextResponse.json({
          success: true,
          data: {
            events: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }
        }, { status: 200 });
      }
    } else {
      // Public user: Only published events
      if (!publishedOnly) {
        whereConditions.push(`e.status = 'published'`);
      }
    }

    // Additional filters
    if (createdBy) {
      whereConditions.push(`e.created_by = $${paramIndex}`);
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
        whereConditions.push(`e.created_by = ANY($${paramIndex}::uuid[])`);
        queryParams.push(creatorRoleIds);
        paramIndex++;
      } else {
        // No users with this role - return empty
        return NextResponse.json({
          success: true,
          data: {
            events: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          }
        }, { status: 200 });
      }
    }

    if (status) {
      whereConditions.push(`e.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    } else if (publishedOnly && !userRole) {
      // Public users: only published by default
      whereConditions.push(`e.status = 'published'`);
    }

    if (mode) {
      whereConditions.push(`e.mode = $${paramIndex}`);
      queryParams.push(mode);
      paramIndex++;
    }

    // Date-based filtering
    if (dateFilter) {
      const now = new Date().toISOString();
      if (dateFilter === 'upcoming') {
        whereConditions.push(`e.start_date > $${paramIndex}`);
        queryParams.push(now);
        paramIndex++;
      } else if (dateFilter === 'current') {
        whereConditions.push(`e.start_date <= $${paramIndex} AND e.end_date >= $${paramIndex + 1}`);
        queryParams.push(now, now);
        paramIndex += 2;
      } else if (dateFilter === 'past') {
        whereConditions.push(`e.end_date < $${paramIndex}`);
        queryParams.push(now);
        paramIndex++;
      }
      // 'all' - no date filter
    }

    if (search) {
      whereConditions.push(`to_tsvector('simple', coalesce(e.title, '') || ' ' || coalesce(e.description, '')) @@ plainto_tsquery('simple', $${paramIndex})`);
      queryParams.push(search);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM events e ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get events with pagination
    const eventsQuery = `
      SELECT 
        e.id,
        e.title,
        e.description,
        e.banner_url,
        e.start_date,
        e.end_date,
        e.mode,
        e.external_link,
        e.is_free,
        e.price,
        e.capacity,
        e.created_by,
        e.organization_id,
        e.status,
        e.created_at,
        e.updated_at,
        u.first_name as creator_first_name,
        u.last_name as creator_last_name,
        u.email as creator_email,
        u.role as creator_role,
        o.name as organization_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN organizations o ON e.organization_id = o.id
      ${whereClause}
      ORDER BY e.start_date DESC, e.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const eventsResult = await query(eventsQuery, queryParams);

    const events = eventsResult.rows.map(row => ({
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

    console.log('📅 [EVENTS] ✅ Events fetched:', events.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          events,
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
    console.error('📅 [EVENTS] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch events' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events
 * Create a new event (Vendor or Mentor)
 */
export async function POST(request) {
  const client = await getClient();
  
  try {
    console.log('📅 [EVENTS] ===== CREATE EVENT STARTED =====');
    
    // Require vendor or mentor role
    const session = await requireRole(request, ['vendor', 'mentor']);
    const creatorId = session.user.id;
    const creatorOrgId = session.user.orgId;
    const isVendor = session.user.role === 'vendor';
    const isMentor = session.user.role === 'mentor';

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
        { success: false, error: 'External link is required for online events' },
        { status: 400 }
      );
    }

    if (is_free === false && (!price || price < 0)) {
      return NextResponse.json(
        { success: false, error: 'Price is required and must be >= 0 for paid events' },
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
    
    if (isVendor && finalOrgId) {
      // For vendors, check if organization is assigned to them
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
    } else if (isMentor && finalOrgId) {
      // For mentors, verify they belong to the organization
      if (finalOrgId !== creatorOrgId) {
        return NextResponse.json(
          { success: false, error: 'Organization mismatch. Mentors can only create events for their own organization' },
          { status: 403 }
        );
      }
    }

    await client.query('BEGIN');

    // Insert event
    const insertResult = await client.query(
      `INSERT INTO events (
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

    const event = insertResult.rows[0];

    console.log('📅 [EVENTS] ✅ Event created:', event.id);

    return NextResponse.json(
      {
        success: true,
        data: {
          event: {
            id: event.id,
            title: event.title,
            description: event.description,
            banner_url: event.banner_url,
            start_date: event.start_date,
            end_date: event.end_date,
            mode: event.mode,
            external_link: event.external_link,
            is_free: event.is_free,
            price: event.price ? parseFloat(event.price) : null,
            capacity: event.capacity ? parseInt(event.capacity, 10) : null,
            created_by: event.created_by,
            organization_id: event.organization_id,
            status: event.status,
            created_at: event.created_at,
            updated_at: event.updated_at,
          }
        }
      },
      { status: 201 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('📅 [EVENTS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create event' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

