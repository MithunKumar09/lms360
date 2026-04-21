/**
 * Company Event Details API Route
 * 
 * Handles single event operations for company users.
 * 
 * GET /api/company/events/[id] - Get event details
 * PUT /api/company/events/[id] - Update event
 * DELETE /api/company/events/[id] - Delete event
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { query } from '@/lib/db/index.js';

/**
 * GET /api/company/events/[id]
 * Get event details (company must own it)
 */
export async function GET(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const { id: eventId } = params;
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    const result = await query(
      `SELECT 
        e.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1 AND e.company_user_id = $2`,
      [eventId, userId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Event not found or access denied' },
        { status: 404 }
      );
    }
    
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
    });
  } catch (error) {
    console.error('Error getting company event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to get event'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * PUT /api/company/events/[id]
 * Update event (company must own it)
 */
export async function PUT(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const { id: eventId } = params;
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // Verify company owns this event
    const checkResult = await query(
      `SELECT id FROM events WHERE id = $1 AND company_user_id = $2`,
      [eventId, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Event not found or access denied' },
        { status: 404 }
      );
    }
    
    const body = await request.json();
    
    // Build update fields
    const updateFields = [];
    const params = [];
    let paramIndex = 1;
    
    const allowedFields = {
      title: 'title',
      description: 'description',
      bannerUrl: 'banner_url',
      startDate: 'start_date',
      endDate: 'end_date',
      mode: 'mode',
      externalLink: 'external_link',
      isFree: 'is_free',
      price: 'price',
      capacity: 'capacity',
      status: 'status'
    };
    
    Object.keys(body).forEach(key => {
      if (allowedFields[key]) {
        updateFields.push(`${allowedFields[key]} = $${paramIndex}`);
        params.push(body[key]);
        paramIndex++;
      }
    });
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    params.push(eventId);
    const result = await query(
      `UPDATE events 
      SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *`,
      params
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
    });
  } catch (error) {
    console.error('Error updating company event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update event'
      },
      { status: error.status || 500 }
    );
  }
}

/**
 * DELETE /api/company/events/[id]
 * Delete event (company must own it)
 */
export async function DELETE(request, { params }) {
  try {
    const session = await requireRole(request, ['company']);
    const userId = session.user.id;
    const { id: eventId } = params;
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    // Verify company owns this event
    const result = await query(
      `DELETE FROM events 
      WHERE id = $1 AND company_user_id = $2
      RETURNING id`,
      [eventId, userId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Event not found or access denied' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting company event:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete event'
      },
      { status: error.status || 500 }
    );
  }
}
