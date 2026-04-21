/**
 * Accept Registration Request API Route
 * 
 * POST /api/registration-requests/[id]/accept
 * Accept a vendor or mentor registration request, create user, and send invite
 * 
 * Request body:
 * {
 *   organization_ids?: string[] (required for vendor, ignored for mentor)
 * }
 */

import { NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db/index.js';
import { requireRole } from '@/lib/auth/guards.js';
import { createUserWithRole } from '@/lib/db/users.js';
import { hashPassword } from '@/lib/security/passwords.js';
import { generateTokenHex, sha256 } from '@/lib/security/tokens.js';
import { generateTemporaryPassword } from '@/lib/security/passwordGenerator.js';
import { createInvite } from '@/lib/db/users.js';
import { sendEmail } from '@/lib/email/send.js';
import { inviteTemplate } from '@/lib/email/templates/invite.js';
import bcrypt from 'bcryptjs';

export async function POST(request, { params }) {
  const client = await getClient();
  
  try {
    console.log('✅ [ACCEPT REGISTRATION REQUEST] ===== ACCEPT REQUEST STARTED =====');
    
    const { id } = params;
    
    // Check authentication - allow admin or superadmin
    const session = await requireRole(request, ['admin', 'superadmin']);
    const adminId = session.user.id;
    const userRole = session.user.role;
    const userOrgId = session.user.orgId || null;

    // Parse request body
    const body = await request.json();
    const { organization_ids } = body;

    await client.query('BEGIN');
    console.log('✅ [ACCEPT REGISTRATION REQUEST] Transaction started');

    // Get request details
    const requestResult = await client.query(
      `SELECT 
        var.id,
        var.request_type,
        var.first_name,
        var.last_name,
        var.email,
        var.phone,
        var.organization_id,
        var.status,
        var.event_interest,
        var.workshop_interest,
        o.name as organization_name,
        o.display_name as organization_display_name
      FROM vendor_alumni_requests var
      LEFT JOIN organizations o ON var.organization_id = o.id
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
    // - Vendor requests: Only superadmin can accept
    // - Mentor requests: Admin can accept if their organization matches, superadmin can accept any
    if (requestData.request_type === 'vendor' && userRole !== 'superadmin') {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: 'Only superadmin can accept vendor requests' },
        { status: 403 }
      );
    }

    if (requestData.request_type === 'mentor') {
      if (userRole === 'admin' && (!userOrgId || userOrgId !== requestData.organization_id)) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'You can only accept mentor requests for your organization' },
          { status: 403 }
        );
      }
    }

    // Validate organization_ids for vendor requests
    let orgCheck = null;
    if (requestData.request_type === 'vendor') {
      if (!organization_ids || !Array.isArray(organization_ids) || organization_ids.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: 'organization_ids array is required for vendor requests' },
          { status: 400 }
        );
      }

      // Validate all organizations exist
      orgCheck = await client.query(
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

    // Determine role code
    const roleCode = requestData.request_type === 'vendor' ? 'vendor' : 'mentor';
    const orgId = requestData.request_type === 'mentor' ? requestData.organization_id : null;

    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword(16);
    const temporaryPasswordHash = await hashPassword(temporaryPassword);

    // Create user
    console.log('✅ [ACCEPT REGISTRATION REQUEST] Creating user...');
    const user = await createUserWithRole({
      email: requestData.email.toLowerCase().trim(),
      first_name: requestData.first_name,
      last_name: requestData.last_name,
      password_hash: temporaryPasswordHash,
      roleCode: roleCode,
      orgId: orgId,
      mfa_required: false,
      mfa_method: 'none',
      must_reset_password: true,
      status: 'active'
    });

    console.log('✅ [ACCEPT REGISTRATION REQUEST] User created:', user.id);

    // For vendors: assign to organizations
    if (requestData.request_type === 'vendor' && organization_ids.length > 0) {
      console.log('✅ [ACCEPT REGISTRATION REQUEST] Assigning vendor to organizations...');
      for (const orgId of organization_ids) {
        await client.query(
          `INSERT INTO vendor_organizations (vendor_id, organization_id, created_by)
           VALUES ($1, $2, $3)
           ON CONFLICT (vendor_id, organization_id) DO NOTHING`,
          [user.id, orgId, adminId]
        );
      }
    }

    // Get role for invite
    const roleResult = await client.query(
      'SELECT id, code, title FROM roles WHERE code = $1',
      [roleCode]
    );

    if (roleResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: `Role '${roleCode}' not found` },
        { status: 500 }
      );
    }

    const role = roleResult.rows[0];

    // Create invite
    console.log('✅ [ACCEPT REGISTRATION REQUEST] Creating invite...');
    const token = generateTokenHex(32);
    const tokenHash = sha256(token);
    const tokenHashHex = tokenHash.toString("hex");
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiry

    const invite = await createInvite({
      email: requestData.email.toLowerCase().trim(),
      orgId: orgId,
      roleId: role.id,
      creatorId: adminId,
      mode: 'temp_password_email',
      mfa_required: false,
      mfa_method: 'none',
      payload: {
        first_name: requestData.first_name,
        last_name: requestData.last_name,
        temporary_password_hash: await bcrypt.hash(temporaryPassword, 10)
      },
      expiresAt,
      tokenHash: tokenHashHex
    });

    // Update request status
    console.log('✅ [ACCEPT REGISTRATION REQUEST] Updating request status...');
    await client.query(
      `UPDATE vendor_alumni_requests 
       SET status = 'approved',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [adminId, id]
    );

    // Send invite email
    console.log('✅ [ACCEPT REGISTRATION REQUEST] Sending invite email...');
    const { getBaseUrl } = await import('@/lib/utils/url.js');
    const baseUrl = getBaseUrl(request);
    const inviteUrl = `${baseUrl}/invite/accept?token=${token}`;

    // Build organization label for email
    let orgLabel = "the organization";
    if (requestData.request_type === 'mentor' && requestData.organization_name) {
      orgLabel = requestData.organization_display_name || requestData.organization_name;
    } else if (requestData.request_type === 'vendor' && orgCheck && orgCheck.rows.length > 0) {
      const orgNames = orgCheck.rows.map(org => org.name).join(', ');
      orgLabel = orgNames;
    }

    const emailTemplate = inviteTemplate({
      orgLabel,
      roleTitle: role.title,
      expiryHours: 24,
      acceptUrl: inviteUrl,
      temporaryPassword: temporaryPassword,
      mode: 'temp_password_email'
    });

    await sendEmail({
      to: requestData.email,
      subject: emailTemplate.subject,
      text: emailTemplate.text,
      html: emailTemplate.html,
      category: 'registration_approved'
    });

    await client.query('COMMIT');
    console.log('✅ [ACCEPT REGISTRATION REQUEST] Transaction committed');

    console.log('✅ [ACCEPT REGISTRATION REQUEST] ✅ Request accepted successfully');

    return NextResponse.json(
      {
        success: true,
        data: {
          request_id: id,
          user_id: user.id,
          role: roleCode,
          invite_id: invite.id,
          organizations: requestData.request_type === 'vendor' && orgCheck
            ? orgCheck.rows.map(org => ({ id: org.id, name: org.name }))
            : requestData.organization_id ? [{ id: requestData.organization_id, name: requestData.organization_name }] : []
        }
      },
      { status: 200 }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('✅ [ACCEPT REGISTRATION REQUEST] ❌ Error:', error);
    
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

