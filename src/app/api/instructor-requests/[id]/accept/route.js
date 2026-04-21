/**
 * Accept Instructor Request API Route
 * 
 * PATCH /api/instructor-requests/[id]/accept
 * Accept an instructor request and promote user to instructor role
 * 
 * Request body:
 * {
 *   mfa_method: 'totp' | 'email_otp' | 'none'
 * }
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';

export async function PATCH(request, { params }) {
  const client = await getClient();
  
  try {
    console.log('✅ [ACCEPT REQUEST] ===== ACCEPT REQUEST STARTED =====');
    
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
    const { mfa_method } = body;

    // Validate MFA method
    if (!mfa_method || !['totp', 'email_otp', 'none'].includes(mfa_method)) {
      return NextResponse.json(
        { success: false, error: 'Invalid MFA method. Must be: totp, email_otp, or none' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');
    console.log('✅ [ACCEPT REQUEST] Transaction started');

    // Get request details
    const requestResult = await client.query(
      `SELECT 
        ir.id,
        ir.user_id,
        ir.org_id,
        ir.status,
        ir.cohorts,
        ir.subjects,
        u.role as current_role,
        u.email,
        u.first_name,
        u.last_name,
        u.display_name,
        u.avatar_url,
        u.phone,
        u.bio,
        u.org_id as user_org_id,
        u.is_active,
        u.email_verified,
        u.mfa_enabled,
        u.mfa_secret,
        u.mfa_verified,
        u.created_at as user_created_at,
        u.last_login_at
      FROM instructor_requests ir
      INNER JOIN users u ON ir.user_id = u.id
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

    // Admin can only accept requests from their organization
    if (userRole === 'admin' && userOrgId && requestData.org_id !== userOrgId) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const userId = requestData.user_id;
    const fromRole = requestData.current_role;

    // Backup user data before promotion
    console.log('✅ [ACCEPT REQUEST] Backing up user data...');
    
    // Fetch all user-related data for backup
    const userBackup = {
      user: {
        id: requestData.user_id,
        email: requestData.email,
        role: requestData.current_role,
        first_name: requestData.first_name,
        last_name: requestData.last_name,
        display_name: requestData.display_name,
        avatar_url: requestData.avatar_url,
        phone: requestData.phone,
        bio: requestData.bio,
        org_id: requestData.user_org_id,
        is_active: requestData.is_active,
        email_verified: requestData.email_verified,
        mfa_enabled: requestData.mfa_enabled,
        mfa_secret: requestData.mfa_secret,
        mfa_verified: requestData.mfa_verified,
        created_at: requestData.user_created_at,
        last_login_at: requestData.last_login_at
      },
      request: {
        id: requestData.id,
        cohorts: requestData.cohorts,
        subjects: requestData.subjects,
        created_at: new Date().toISOString()
      },
      backup_timestamp: new Date().toISOString()
    };

    // Update user role to instructor
    console.log('✅ [ACCEPT REQUEST] Updating user role to instructor...');
    await client.query(
      `UPDATE users 
       SET role = 'instructor', 
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );

    // Update MFA settings based on admin selection
    if (mfa_method === 'none') {
      // Disable MFA for first login
      await client.query(
        `UPDATE users 
         SET mfa_enabled = false, 
             mfa_secret = NULL,
             mfa_verified = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId]
      );
    } else {
      // Keep existing MFA settings or set enabled (user will need to set up)
      // If mfa_method is 'totp' or 'email_otp', we enable MFA but user needs to set it up
      await client.query(
        `UPDATE users 
         SET mfa_enabled = true,
             mfa_verified = false,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId]
      );
    }

    // Update request status
    console.log('✅ [ACCEPT REQUEST] Updating request status...');
    await client.query(
      `UPDATE instructor_requests 
       SET status = 'accepted',
           mfa_method = $1,
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [mfa_method, adminId, id]
    );

    // Create promotion history record
    console.log('✅ [ACCEPT REQUEST] Creating promotion history...');
    const historyResult = await client.query(
      `INSERT INTO role_promotion_history (
        user_id, 
        from_role, 
        to_role, 
        promotion_type, 
        request_id, 
        promoted_by, 
        user_data_backup, 
        mfa_method
      )
      VALUES ($1, $2, 'instructor', 'instructor_request', $3, $4, $5::jsonb, $6)
      RETURNING id`,
      [
        userId,
        fromRole,
        id,
        adminId,
        JSON.stringify(userBackup),
        mfa_method
      ]
    );

    const historyId = historyResult.rows[0].id;

    // Create notification for the requester
    console.log('✅ [ACCEPT REQUEST] Creating notification for requester...');
    await client.query(
      `INSERT INTO notifications (user_id, type, title, message, data, action_url)
       VALUES ($1, 'request_accepted', $2, $3, $4::jsonb, $5)`,
      [
        userId,
        'Instructor Request Accepted',
        'Your request to become an instructor has been accepted! Please log out and log in again to access your instructor dashboard.',
        JSON.stringify({
          request_id: id,
          promotion_history_id: historyId,
          mfa_method: mfa_method
        }),
        '/dashboards/instructor-dashboard'
      ]
    );

    await client.query('COMMIT');
    console.log('✅ [ACCEPT REQUEST] Transaction committed');

    console.log('✅ [ACCEPT REQUEST] ✅ Request accepted successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          request_id: id,
          user_id: userId,
          new_role: 'instructor',
          promotion_history_id: historyId,
          mfa_method: mfa_method
        }
      },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✅ [ACCEPT REQUEST] ❌ Error:', error);
    
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json(
        { success: false, error: error.message || 'Access denied' },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to accept request' 
      },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

