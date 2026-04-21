/**
 * Vendor Registration Requests API Route
 * 
 * GET /api/registration-requests/vendors
 * List vendor registration requests (Superadmin only)
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

export async function GET(request) {
  try {
    console.log('📋 [VENDOR REQUESTS] ===== LIST REQUESTS STARTED =====');
    
    // Require superadmin role
    const session = await requireRole(request, ['superadmin']);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Validate status if provided
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status filter' },
        { status: 400 }
      );
    }

    // Build query
    let whereClause = "WHERE var.request_type = 'vendor'";
    const queryParams = [];
    let paramIndex = 1;

    // Add status filter if provided
    if (status) {
      whereClause += ` AND var.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM vendor_alumni_requests var ${whereClause}`;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);

    // Get requests with organization details
    const requestsQuery = `
      SELECT 
        var.id,
        var.request_type,
        var.first_name,
        var.last_name,
        var.email,
        var.phone,
        var.status,
        var.event_interest,
        var.workshop_interest,
        var.organization_id,
        var.reviewed_by,
        var.reviewed_at,
        var.rejection_reason,
        var.created_at,
        var.updated_at,
        o.name as organization_name,
        reviewer.email as reviewer_email,
        reviewer.first_name as reviewer_first_name,
        reviewer.last_name as reviewer_last_name
      FROM vendor_alumni_requests var
      LEFT JOIN organizations o ON var.organization_id = o.id
      LEFT JOIN users reviewer ON var.reviewed_by = reviewer.id
      ${whereClause}
      ORDER BY var.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const requestsResult = await query(requestsQuery, queryParams);

    const requests = requestsResult.rows.map(row => ({
      id: row.id,
      request_type: row.request_type,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
      status: row.status,
      event_interest: row.event_interest,
      workshop_interest: row.workshop_interest,
      organization: row.organization_id ? {
        id: row.organization_id,
        name: row.organization_name
      } : null,
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
    }));

    const totalPages = Math.ceil(total / limit);

    console.log('📋 [VENDOR REQUESTS] ✅ Requests fetched:', requests.length);

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
    console.error('📋 [VENDOR REQUESTS] ❌ Error:', error);
    
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
        error: error.message || 'Failed to fetch vendor requests' 
      },
      { status: 500 }
    );
  }
}

