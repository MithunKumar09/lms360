/**
 * Company Events API Route
 * 
 * Handles event operations for company users (recruitment events: campus drives, workshops, webinars, etc.)
 * 
 * GET /api/company/events - List company's events
 * POST /api/company/events - Create new event
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/company/events
 * List company's events
 */
export async function GET(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const orgId = session.user.orgId;
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || null,
      mode: searchParams.get('mode') || null,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '10')
    };
    
    const offset = (filters.page - 1) * filters.pageSize;
    const conditions = ['e.company_user_id = $1'];
    const params = [userId];
    let paramIndex = 2;
    
    if (filters.status) {
      conditions.push(`e.status = $${paramIndex}`);
      params.push(filters.status);
      paramIndex++;
    }
    
    if (filters.mode) {
      conditions.push(`e.mode = $${paramIndex}`);
      params.push(filters.mode);
      paramIndex++;
    }
    
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM events e ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);
    
    // Get events
    params.push(filters.pageSize, offset);
    const result = await query(
      `SELECT 
        e.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );
    
    const events = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      bannerUrl: row.banner_url,
      startDate: row.start_date,
      endDate: row.end_date,
      mode: row.mode,
      externalLink: row.external_link,
      isFree: row.is_free,
      price: row.price ? parseFloat(row.price) : null,
      capacity: row.capacity,
      status: row.status,
      companyUserId: row.company_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    return NextResponse.json({
      success: true,
      data: events,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.ceil(total / filters.pageSize)
      }
    });
  } catch (error) {
    console.error('Error getting company events:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get events'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST /api/company/events
 * Create new event
 */
export async function POST(request) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const orgId = session.user.orgId;
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.title || !body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: 'Title, startDate, and endDate are required' },
        { status: 400 }
      );
    }
    
    // Validate mode
    if (body.mode && !['online', 'offline', 'hybrid'].includes(body.mode)) {
      return NextResponse.json(
        { success: false, error: 'mode must be online, offline, or hybrid' },
        { status: 400 }
      );
    }
    
    // Validate status
    if (body.status && !['draft', 'published', 'closed', 'cancelled'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    // Create event
    const result = await query(
      `INSERT INTO events (
        title, description, banner_url, start_date, end_date,
        mode, external_link, is_free, price, capacity,
        created_by, organization_id, company_user_id, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *`,
      [
        body.title,
        body.description || null,
        body.bannerUrl || null,
        body.startDate,
        body.endDate,
        body.mode || 'online',
        body.externalLink || null,
        body.isFree !== undefined ? body.isFree : true,
        body.price || null,
        body.capacity || null,
        userId,
        orgId || null,
        userId,
        body.status || 'draft'
      ]
    );
    
    const event = result.rows[0];
    
    return NextResponse.json({
      success: true,
      data: {
        id: event.id,
        title: event.title,
        description: event.description,
        bannerUrl: event.banner_url,
        startDate: event.start_date,
        endDate: event.end_date,
        mode: event.mode,
        externalLink: event.external_link,
        isFree: event.is_free,
        price: event.price ? parseFloat(event.price) : null,
        capacity: event.capacity,
        status: event.status,
        companyUserId: event.company_user_id,
        createdAt: event.created_at,
        updatedAt: event.updated_at
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating company event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create event'
      },
      { status: error.status || 500 }
    );
  }
}
