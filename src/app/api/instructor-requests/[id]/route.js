/**
 * Instructor Request Details API Route
 * 
 * Handles individual instructor request operations:
 * - GET: Get request details
 * - DELETE: Delete request (admin only, after accept/reject)
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { auth } from '@/app/api/auth/[...nextauth]/route.js';
import { requireRole } from '@/lib/auth/guards.js';

/**
 * GET /api/instructor-requests/[id]
 * Get single request details
 */
export async function GET(request, { params }) {
  try {
    console.log('📄 [INSTRUCTOR REQUEST] ===== GET REQUEST DETAILS STARTED =====');
    
    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request ID is required',
        },
        { status: 400 }
      );
    }
    
    const { id } = params;
    
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;

    // Get request details
    const requestResult = await query(
      `SELECT 
        ir.id,
        ir.user_id,
        ir.org_id,
        ir.status,
        ir.cohorts,
        ir.subjects,
        ir.phone_number,
        ir.bio,
        ir.mfa_method,
        ir.reviewed_by,
        ir.reviewed_at,
        ir.rejection_reason,
        ir.created_at,
        ir.updated_at,
        u.email as user_email,
        u.first_name as user_first_name,
        u.last_name as user_last_name,
        u.avatar_url as user_avatar_url,
        u.role as user_role,
        u.phone as user_phone,
        u.bio as user_bio,
        u.display_name as user_display_name,
        o.name as org_name,
        o.display_name as org_display_name,
        reviewer.email as reviewer_email,
        reviewer.first_name as reviewer_first_name,
        reviewer.last_name as reviewer_last_name
      FROM instructor_requests ir
      INNER JOIN users u ON ir.user_id = u.id
      INNER JOIN organizations o ON ir.org_id = o.id
      LEFT JOIN users reviewer ON ir.reviewed_by = reviewer.id
      WHERE ir.id = $1`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    const row = requestResult.rows[0];

    // Access control:
    // - User can view their own request
    // - Admin can view requests from their organization
    // - Superadmin can view all requests
    const isOwnRequest = row.user_id === userId;
    const isAdmin = (userRole === 'admin' || userRole === 'superadmin');
    const isSameOrg = userOrgId && row.org_id === userOrgId;

    if (!isOwnRequest && !isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    if (isAdmin && !isOwnRequest && userRole === 'admin' && !isSameOrg) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const requestData = {
      id: row.id,
      user: {
        id: row.user_id,
        email: row.user_email,
        first_name: row.user_first_name,
        last_name: row.user_last_name,
        display_name: row.user_display_name,
        avatar_url: row.user_avatar_url,
        role: row.user_role,
        phone: row.user_phone,
        bio: row.user_bio
      },
      organization: {
        id: row.org_id,
        name: row.org_name,
        display_name: row.org_display_name
      },
      status: row.status,
      cohorts: row.cohorts,
      subjects: row.subjects,
      phone_number: row.phone_number,
      bio: row.bio,
      mfa_method: row.mfa_method,
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
    };

    console.log('📄 [INSTRUCTOR REQUEST] ✅ Request details fetched');

    return NextResponse.json(
      {
        success: true,
        data: requestData
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('📄 [INSTRUCTOR REQUEST] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch request details' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/instructor-requests/[id]
 * Delete instructor request (Admin only, after accept/reject)
 */
export async function DELETE(request, { params }) {
  try {
    console.log('🗑️ [INSTRUCTOR REQUEST] ===== DELETE REQUEST STARTED =====');
    
    if (!params || !params.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request ID is required',
        },
        { status: 400 }
      );
    }
    
    const { id } = params;
    
    // Check authentication and require admin role
    const session = await requireRole(request, ['admin', 'superadmin']);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session invalid',
        },
        { status: 401 }
      );
    }
    
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;

    // Get request to check ownership and status
    const requestResult = await query(
      `SELECT id, org_id, status FROM instructor_requests WHERE id = $1`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    const requestData = requestResult.rows[0];

    // Admin can only delete requests from their organization
    if (userRole === 'admin' && userOrgId && requestData.org_id !== userOrgId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Can only delete accepted or rejected requests (not pending)
    if (requestData.status === 'pending') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete pending requests. Please accept or reject first.' },
        { status: 400 }
      );
    }

    // Delete the request
    await query(
      `DELETE FROM instructor_requests WHERE id = $1`,
      [id]
    );

    console.log('🗑️ [INSTRUCTOR REQUEST] ✅ Request deleted');

    return NextResponse.json(
      {
        success: true,
        message: 'Request deleted successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('🗑️ [INSTRUCTOR REQUEST] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to delete request' 
      },
      { status: 500 }
    );
  }
}

