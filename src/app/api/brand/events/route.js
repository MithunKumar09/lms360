/**
 * Brand Events API Route
 * 
 * GET /api/brand/events - Get brand events
 * POST /api/brand/events - Create brand event proposal
 */

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/guards.js';
import { canCreateEvent, canManageEvent } from '@/lib/auth/brandPermissions.js';
import { getBrandEvents, createBrandEvent } from '@/lib/db/brand/events.js';

export async function GET(request) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Validate pagination
    if (page < 1) {
      return NextResponse.json(
        { success: false, error: 'Page must be greater than 0' },
        { status: 400 }
      );
    }
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Get events
    const data = await getBrandEvents(userId, { status, page, limit });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error fetching brand events:', error);
    // Return empty events list if table doesn't exist (graceful degradation)
    if (error.code === '42P01') {
      return NextResponse.json({
        success: true,
        data: {
          events: [],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
        },
      });
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch events',
      },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Authentication: Only brands
    const session = await requireRole(request, ['brand']);
    const userId = session.user.id;

    // Check permission
    const hasPermission = await canCreateEvent(session.user.role, userId);
    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Brand profile must be approved to create events',
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      title,
      description,
      banner_url,
      event_type,
      start_date,
      end_date,
      mode,
      external_link,
      is_free,
      price,
      capacity,
      status = 'draft',
    } = body;

    // Validate required fields
    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Title is required and must be at least 3 characters',
        },
        { status: 400 }
      );
    }

    if (!start_date || !end_date) {
      return NextResponse.json(
        {
          success: false,
          error: 'Start date and end date are required',
        },
        { status: 400 }
      );
    }

    // Validate date order
    const startDateTime = new Date(start_date);
    const endDateTime = new Date(end_date);
    if (endDateTime <= startDateTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'End date must be after start date',
        },
        { status: 400 }
      );
    }

    if (mode === 'online' && !external_link) {
      return NextResponse.json(
        {
          success: false,
          error: 'External link is required for online events',
        },
        { status: 400 }
      );
    }

    // Create event
    // Handle price according to constraint: if is_free=true, price must be NULL; if is_free=false, price must be NOT NULL
    const isFree = is_free !== false;
    const finalPrice = isFree ? null : (price || 0);

    const event = await createBrandEvent(userId, {
      title: title.trim(),
      description: description || null,
      banner_url: banner_url || null,
      event_type: event_type || 'seminar',
      start_date,
      end_date,
      mode: mode || 'online',
      external_link: external_link || null,
      is_free: isFree,
      price: finalPrice,
      capacity: capacity || null,
      status,
    });

    return NextResponse.json({
      success: true,
      data: {
        event,
      },
    });
  } catch (error) {
    // Check if it's a migration-related error
    const isTableMissing = error.message?.includes('not available') || 
                          error.message?.includes('migration') ||
                          error.message?.includes('table');
    
    // Only log full error details in development, and skip stack trace for expected errors
    if (process.env.NODE_ENV === 'development') {
      if (isTableMissing) {
        console.log('[Brand Events API] Migration required:', error.message);
      } else {
        console.error('Error creating brand event:', error);
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create event',
        requiresMigration: isTableMissing,
      },
      { status: isTableMissing ? 503 : (error.status || 500) }
    );
  }
}
