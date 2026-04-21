/**
 * Vendor Management API Route
 * 
 * PUT /api/vendors/[id]
 * Update vendor organization assignments (Superadmin only)
 * 
 * Request body:
 * {
 *   organization_ids: string[] (array of organization UUIDs)
 * }
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

export async function PUT(request, { params }) {
  const client = await getClient();
  
  try {
    console.log('✏️ [UPDATE VENDOR] ===== UPDATE VENDOR STARTED =====');
    
    const { id } = params;
    
    // Check authentication and require superadmin role
    const session = await requireRole(request, ['superadmin']);
    const adminId = session.user.id;

    // Parse request body
    const body = await request.json();
    const { organization_ids, is_active } = body;

    if (organization_ids !== undefined && !Array.isArray(organization_ids)) {
      return NextResponse.json(
        { success: false, error: 'organization_ids must be an array' },
        { status: 400 }
      );
    }

    if (is_active !== undefined && typeof is_active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'is_active must be a boolean' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');
    console.log('✏️ [UPDATE VENDOR] Transaction started');

    // Verify vendor exists and has vendor role
    const vendorCheck = await client.query(
      `SELECT u.id, u.email, u.first_name, u.last_name
       FROM users u
       INNER JOIN user_roles ur ON u.id = ur.user_id
       INNER JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1 AND r.code = 'vendor'`,
      [id]
    );

    if (vendorCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Validate all organizations exist
    if (organization_ids.length > 0) {
      const orgCheck = await client.query(
        'SELECT id, name FROM organizations WHERE id = ANY($1::uuid[])',
        [organization_ids]
      );

      if (orgCheck.rows.length !== organization_ids.length) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'One or more organizations not found' },
          { status: 404 }
        );
      }
    }

    // Update organization assignments if provided
    if (organization_ids !== undefined) {
      // Remove all existing organization assignments
      await client.query(
        'DELETE FROM vendor_organizations WHERE vendor_id = $1',
        [id]
      );

      // Add new organization assignments
      if (organization_ids.length > 0) {
        for (const orgId of organization_ids) {
          await client.query(
            `INSERT INTO vendor_organizations (vendor_id, organization_id, created_by)
             VALUES ($1, $2, $3)
             ON CONFLICT (vendor_id, organization_id) DO UPDATE SET created_by = $3`,
            [id, orgId, adminId]
          );
        }
      }
    }

    // Update is_active status if provided
    if (is_active !== undefined) {
      await client.query(
        'UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [is_active, id]
      );
    }

    // Get updated vendor with organizations and activity counts
    const updatedVendor = await client.query(
      `SELECT 
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
      LEFT JOIN vendor_organizations vo ON u.id = vo.vendor_id
      LEFT JOIN organizations o ON vo.organization_id = o.id
      WHERE u.id = $1
      GROUP BY u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.is_active, u.created_at, u.updated_at`,
      [id]
    );

    await client.query('COMMIT');
    console.log('✏️ [UPDATE VENDOR] Transaction committed');

    console.log('✏️ [UPDATE VENDOR] ✅ Vendor updated successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          vendor: {
            id: updatedVendor.rows[0].id,
            email: updatedVendor.rows[0].email,
            first_name: updatedVendor.rows[0].first_name,
            last_name: updatedVendor.rows[0].last_name,
            avatar_url: updatedVendor.rows[0].avatar_url,
            is_active: updatedVendor.rows[0].is_active,
            organizations: updatedVendor.rows[0].organizations || [],
            events_count: parseInt(updatedVendor.rows[0].events_count || 0, 10),
            workshops_count: parseInt(updatedVendor.rows[0].workshops_count || 0, 10),
            created_at: updatedVendor.rows[0].created_at,
            updated_at: updatedVendor.rows[0].updated_at
          }
        }
      },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✏️ [UPDATE VENDOR] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to update vendor' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

