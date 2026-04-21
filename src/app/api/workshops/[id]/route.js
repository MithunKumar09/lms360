/**
 * Individual Workshop API Route
 * 
 * GET /api/workshops/[id] - Get workshop by ID
 * PUT /api/workshops/[id] - Update workshop (Vendor/Mentor only, own workshops)
 * DELETE /api/workshops/[id] - Delete workshop (Vendor/Mentor only, own workshops)
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/workshops/[id]
 * Get workshop by ID
 */
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const workshopResult = await query(
      `SELECT 
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
        o.name as organization_name
      FROM workshops w
      LEFT JOIN users u ON w.created_by = u.id
      LEFT JOIN organizations o ON w.organization_id = o.id
      WHERE w.id = $1`,
      [id]
    );

    if (workshopResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Workshop not found' },
        { status: 404 }
      );
    }

    const row = workshopResult.rows[0];
    const workshop = {
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
      },
      organization: row.organization_name ? {
        id: row.organization_id,
        name: row.organization_name,
      } : null,
    };

    return NextResponse.json(
      {
        success: true,
        data: { workshop }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('🎓 [WORKSHOPS] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch workshop' 
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/workshops/[id]
 * Update workshop (Vendor/Mentor only, own workshops)
 */
export async function PUT(request, { params }) {
  const client = await getClient();
  
  try {
    const { id } = params;
    
    // Require vendor or mentor role
    const session = await requireRole(request, ['vendor', 'mentor']);
    const creatorId = session.user.id;

    // Verify workshop exists and belongs to creator
    const workshopCheck = await client.query(
      'SELECT created_by FROM workshops WHERE id = $1',
      [id]
    );

    if (workshopCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Workshop not found' },
        { status: 404 }
      );
    }

    if (workshopCheck.rows[0].created_by !== creatorId) {
      return NextResponse.json(
        { success: false, error: 'You can only update your own workshops' },
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
          { success: false, error: 'Price must be >= 0 for paid workshops' },
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
      UPDATE workshops 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const updateResult = await client.query(updateQuery, updateValues);

    await client.query('COMMIT');

    const workshop = updateResult.rows[0];

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
      { status: 200 }
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
        error: error.message || 'Failed to update workshop' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/workshops/[id]
 * Delete workshop (Vendor/Mentor only, own workshops)
 */
export async function DELETE(request, { params }) {
  const client = await getClient();
  
  try {
    const { id } = params;
    
    // Require vendor or mentor role
    const session = await requireRole(request, ['vendor', 'mentor']);
    const creatorId = session.user.id;

    // Verify workshop exists and belongs to creator
    const workshopCheck = await client.query(
      'SELECT created_by FROM workshops WHERE id = $1',
      [id]
    );

    if (workshopCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Workshop not found' },
        { status: 404 }
      );
    }

    if (workshopCheck.rows[0].created_by !== creatorId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own workshops' },
        { status: 403 }
      );
    }

    await client.query('BEGIN');

    await client.query('DELETE FROM workshops WHERE id = $1', [id]);

    await client.query('COMMIT');

    return NextResponse.json(
      {
        success: true,
        message: 'Workshop deleted successfully'
      },
      { status: 200 }
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
        error: error.message || 'Failed to delete workshop' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

