/**
 * Vendor Me API Route
 * 
 * GET /api/vendors/me - Get current vendor's organizations (Vendor only)
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/vendors/me
 * Get current vendor's organizations
 */
export async function GET(request) {
  try {
    console.log('📋 [VENDOR ME] ===== GET VENDOR ME STARTED =====');
    
    // Require vendor role
    const session = await requireRole(request, ['vendor']);
    const vendorId = session.user.id;

    // Get vendor's organizations
    const orgsResult = await query(
      `SELECT 
        o.id,
        o.name,
        o.display_name,
        o.org_code,
        o.org_type,
        o.status,
        vo.created_at as assigned_at
      FROM vendor_organizations vo
      INNER JOIN organizations o ON vo.organization_id = o.id
      WHERE vo.vendor_id = $1 AND o.status = 'active'
      ORDER BY o.name ASC`,
      [vendorId]
    );

    const organizations = orgsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      display_name: row.display_name,
      org_code: row.org_code,
      org_type: row.org_type,
      status: row.status,
      assigned_at: row.assigned_at,
    }));

    console.log('📋 [VENDOR ME] ✅ Organizations fetched:', organizations.length);

    return NextResponse.json(
      {
        success: true,
        data: {
          organizations
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📋 [VENDOR ME] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch vendor organizations' 
      },
      { status: 500 }
    );
  }
}

