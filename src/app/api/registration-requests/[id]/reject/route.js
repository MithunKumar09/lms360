/**
 * Reject Registration Request API Route
 * 
 * POST /api/registration-requests/[id]/reject
 * Reject a vendor or mentor registration request
 * 
 * Request body:
 * {
 *   rejection_reason?: string
 * }
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

export async function POST(request, { params }) {
  const client = await getClient();
  
  try {
    console.log('❌ [REJECT REGISTRATION REQUEST] ===== REJECT REQUEST STARTED =====');
    
    const { id } = params;
    
    // Check authentication - allow admin or superadmin
    const session = await requireRole(request, ['admin', 'superadmin']);
    const adminId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || null;

    // Parse request body
    const body = await request.json();
    const { rejection_reason } = body;

    await client.query('BEGIN');
    console.log('❌ [REJECT REGISTRATION REQUEST] Transaction started');

    // Get request details
    const requestResult = await client.query(
      `SELECT 
        var.id,
        var.request_type,
        var.first_name,
        var.last_name,
        var.email,
        var.status,
        var.organization_id
      FROM vendor_alumni_requests var
      WHERE var.id = $1`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    const requestData = requestResult.rows[0];

    // Check if request is pending
    if (requestData.status !== 'pending') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: `Request is already ${requestData.status}` },
        { status: 400 }
      );
    }

    // Authorization check:
    // - Vendor requests: Only superadmin can reject
    // - Mentor requests: Admin can reject if their organization matches, superadmin can reject any
    if (requestData.request_type === 'vendor' && userRole !== 'superadmin') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Only superadmin can reject vendor requests' },
        { status: 403 }
      );
    }

    if (requestData.request_type === 'mentor') {
      if (userRole === 'admin' && (!userOrgId || userOrgId !== requestData.organization_id)) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'You can only reject mentor requests for your organization' },
          { status: 403 }
        );
      }
    }

    // Update request status
    console.log('❌ [REJECT REGISTRATION REQUEST] Updating request status...');
    await client.query(
      `UPDATE vendor_alumni_requests 
       SET status = 'rejected',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           rejection_reason = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [adminId, rejection_reason?.trim() || null, id]
    );

    // TODO: Send rejection email to requester (optional)
    // For now, we just update the status
    // In the future, we can add email notification here

    await client.query('COMMIT');
    console.log('❌ [REJECT REGISTRATION REQUEST] Transaction committed');

    console.log('❌ [REJECT REGISTRATION REQUEST] ✅ Request rejected successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          request_id: id,
          status: 'rejected'
        }
      },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ [REJECT REGISTRATION REQUEST] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to reject request' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

