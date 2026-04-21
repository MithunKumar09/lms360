/**
 * Reject Instructor Request API Route
 * 
 * PATCH /api/instructor-requests/[id]/reject
 * Reject an instructor request
 * 
 * Request body:
 * {
 *   rejection_reason?: string
 * }
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

export async function PATCH(request, { params }) {
  const client = await getClient();
  
  try {
    console.log('❌ [REJECT REQUEST] ===== REJECT REQUEST STARTED =====');
    
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
    
    const adminId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId;

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected JSON.',
        },
        { status: 400 }
      );
    }
    const { rejection_reason } = body;

    await client.query('BEGIN');
    console.log('❌ [REJECT REQUEST] Transaction started');

    // Get request details
    const requestResult = await client.query(
      `SELECT 
        ir.id,
        ir.user_id,
        ir.org_id,
        ir.status
      FROM instructor_requests ir
      WHERE ir.id = $1`,
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

    // Admin can only reject requests from their organization
    if (userRole === 'admin' && userOrgId && requestData.org_id !== userOrgId) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const userId = requestData.user_id;

    // Update request status
    console.log('❌ [REJECT REQUEST] Updating request status...');
    await client.query(
      `UPDATE instructor_requests 
       SET status = 'rejected',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           rejection_reason = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [adminId, rejection_reason?.trim() || null, id]
    );

    // Create notification for the requester
    console.log('❌ [REJECT REQUEST] Creating notification for requester...');
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, data, action_url)
       VALUES ($1, 'request_rejected', $2, $3, $4::jsonb, $5)`,
      [
        userId,
        'Instructor Request Rejected',
        rejection_reason 
          ? `Your request to become an instructor has been rejected. Reason: ${rejection_reason}`
          : 'Your request to become an instructor has been rejected. You can submit a new request if needed.',
        JSON.stringify({
          request_id: id,
          rejection_reason: rejection_reason || null
        }),
        '/dashboards/become-an-instructor'
      ]
    );

    await client.query('COMMIT');
    console.log('❌ [REJECT REQUEST] Transaction committed');

    console.log('❌ [REJECT REQUEST] ✅ Request rejected successfully');

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
    console.error('❌ [REJECT REQUEST] ❌ Error:', error);
    
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

