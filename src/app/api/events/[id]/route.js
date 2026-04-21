/**
 * Individual Event API Route
 * 
 * GET /api/events/[id] - Get event by ID
 * PUT /api/events/[id] - Update event (Vendor only, own events)
 * DELETE /api/events/[id] - Delete event (Vendor only, own events)
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/events/[id]
 * Get event by ID
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const eventResult = await query(
      `SELECT 
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
      WHERE e.id = $1`,
      [id]
    );

    if (eventResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const row = eventResult.rows[0];
    const event = {
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
    };

    return NextResponse.json(
      {
        success: true,
        data: { event }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📅 [EVENTS] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch event' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/events/[id]
 * Update event (Vendor only, own events)
 */
export async function PUT(request, { params }) {
  const client = await getClient();
  
  try {
    const { id } = params;
    
    // Require vendor role
    const session = await requireRole(request, ['vendor']);
    const vendorId = session.user.id;

    // Verify event exists and belongs to vendor
    const eventCheck = await client.query(
      'SELECT created_by, organization_id FROM events WHERE id = $1',
      [id]
    );

    if (eventCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    if (eventCheck.rows[0].created_by !== vendorId) {
      return NextResponse.json(
        { success: false, error: 'You can only update your own events' },
        { status: 403 }
      );
    }

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

    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex}`);
      updateValues.push(description?.trim() || null);
      paramIndex++;
    }

    if (banner_url !== undefined) {
      updateFields.push(`banner_url = $${paramIndex}`);
      updateValues.push(banner_url || null);
      paramIndex++;
    }

    if (start_date !== undefined) {
      updateFields.push(`start_date = $${paramIndex}`);
      updateValues.push(start_date);
      paramIndex++;
    }

    if (end_date !== undefined) {
      updateFields.push(`end_date = $${paramIndex}`);
      updateValues.push(end_date);
      paramIndex++;
    }

    if (mode !== undefined) {
      if (!['online', 'offline', 'live'].includes(mode)) {
        return NextResponse.json(
          { success: false, error: 'Mode must be online, offline, or live' },
          { status: 400 }
        );
      }
      updateFields.push(`mode = $${paramIndex}`);
      updateValues.push(mode);
      paramIndex++;
    }

    if (external_link !== undefined) {
      updateFields.push(`external_link = $${paramIndex}`);
      updateValues.push(external_link || null);
      paramIndex++;
    }

    if (is_free !== undefined) {
      updateFields.push(`is_free = $${paramIndex}`);
      updateValues.push(is_free !== false);
      paramIndex++;
    }

    if (price !== undefined) {
      if (is_free === false && (!price || price < 0)) {
        return NextResponse.json(
          { success: false, error: 'Price must be >= 0 for paid events' },
          { status: 400 }
        );
      }
      updateFields.push(`price = $${paramIndex}`);
      updateValues.push(is_free === false ? price : null);
      paramIndex++;
    }

    if (capacity !== undefined) {
      if (capacity !== null && capacity <= 0) {
        return NextResponse.json(
          { success: false, error: 'Capacity must be greater than 0 if provided' },
          { status: 400 }
        );
      }
      updateFields.push(`capacity = $${paramIndex}`);
      updateValues.push(capacity || null);
      paramIndex++;
    }

    if (status !== undefined) {
      if (!['draft', 'published', 'cancelled', 'completed'].includes(status)) {
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

    // Validate date order if both dates are being updated
    if (start_date !== undefined && end_date !== undefined) {
      if (new Date(end_date) < new Date(start_date)) {
        return NextResponse.json(
          { success: false, error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    await client.query('BEGIN');

    updateValues.push(id);
    const updateQuery = `
      UPDATE events 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, updateValues);

    await client.query('COMMIT');

    const event = updateResult.rows[0];

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
      { status: 200 }
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
        error: error.message || 'Failed to update event' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/events/[id]
 * Delete event (Vendor only, own events)
 */
export async function DELETE(request, { params }) {
  const client = await getClient();
  
  try {
    const { id } = params;
    
    // Require vendor role
    const session = await requireRole(request, ['vendor']);
    const vendorId = session.user.id;

    // Verify event exists and belongs to vendor
    const eventCheck = await client.query(
      'SELECT created_by FROM events WHERE id = $1',
      [id]
    );

    if (eventCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    if (eventCheck.rows[0].created_by !== vendorId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own events' },
        { status: 403 }
      );
    }

    await client.query('BEGIN');

    await client.query('DELETE FROM events WHERE id = $1', [id]);

    await client.query('COMMIT');

    return NextResponse.json(
      {
        success: true,
        message: 'Event deleted successfully'
      },
      { status: 200 }
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
        error: error.message || 'Failed to delete event' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

