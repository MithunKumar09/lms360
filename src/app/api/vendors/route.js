/**
 * Vendors API Route
 * 
 * GET /api/vendors - List all vendors (Superadmin only)
 * PUT /api/vendors/[id] - Update vendor organization assignments (Superadmin only)
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/vendors
 * List all vendors with their organization assignments
 */
export async function GET(request) {
  try {
    console.log('📋 [VENDORS] ===== LIST VENDORS STARTED =====');
    
    // Require superadmin role
    const session = await requireRole(request, ['superadmin']);

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Get total count (include all vendors, not just active)
    const countResult = await query(
      `SELECT COUNT(DISTINCT u.id) as total
       FROM users u
       INNER JOIN user_roles ur ON u.id = ur.user_id
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE r.code = 'vendor'`
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Get vendors with their organization assignments and activity counts
    const vendorsQuery = `
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.avatar_url,
        u.is_active,
        u.created_at,
        u.updated_at,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', o.id,
              'name', o.name,
              'display_name', o.display_name
            )
          ) FILTER (WHERE o.id IS NOT NULL),
          '[]'::json
        ) as organizations,
        -- Events count (placeholder - will be implemented in Phase 7)
        -- For now, return 0 since events table doesn't exist yet
        0 as events_count,
        -- Workshops count (placeholder - will be implemented in Phase 7)
        -- For now, return 0 since workshops table doesn't exist yet
        0 as workshops_count
      FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      INNER JOIN roles r ON ur.role_id = r.id
      LEFT JOIN vendor_organizations vo ON u.id = vo.vendor_id
      LEFT JOIN organizations o ON vo.organization_id = o.id
      WHERE r.code = 'vendor'
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.is_active, u.created_at, u.updated_at
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const vendorsResult = await query(vendorsQuery, [limit, offset]);

    const vendors = vendorsResult.rows.map(row => ({
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      avatar_url: row.avatar_url,
      is_active: row.is_active,
      organizations: row.organizations || [],
      events_count: parseInt(row.events_count || 0, 10),
      workshops_count: parseInt(row.workshops_count || 0, 10),
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    const totalPages = Math.ceil(total / limit);

    console.log('📋 [VENDORS] ✅ Vendors fetched:', vendors.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          vendors,
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
    console.error('📋 [VENDORS] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch vendors' 
      },
      { status: 500 }
    );
  }
}

