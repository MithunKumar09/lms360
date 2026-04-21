/**
 * Registration Requests API Route
 * 
 * Handles vendor and mentor registration requests:
 * - POST: Create a new registration request (public, no auth required)
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import { sendEmail } from '@/lib/email/send.js';

/**
 * POST /api/registration-requests
 * Create a new vendor or mentor registration request
 * 
 * Request body:
 * {
 *   request_type: 'vendor' | 'mentor',
 *   first_name: string,
 *   last_name: string,
 *   email: string,
 *   phone?: string,
 *   organization_id?: string (required for mentor),
 *   event_interest?: boolean,
 *   workshop_interest?: boolean
 * }
 */
export async function POST(request) {
  try {
    console.log('📝 [REGISTRATION REQUEST] ===== CREATE REQUEST STARTED =====');
    
    const body = await request.json();
    const {
      request_type,
      first_name,
      last_name,
      email,
      phone,
      organization_id,
      event_interest = false,
      workshop_interest = false
    } = body;

    // Validate required fields
    if (!request_type || !['vendor', 'mentor'].includes(request_type)) {
      return NextResponse.json(
        { success: false, error: 'request_type must be "vendor" or "mentor"' },
        { status: 400 }
      );
    }

    if (!first_name || !last_name || !email) {
      return NextResponse.json(
        { success: false, error: 'first_name, last_name, and email are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate phone format if provided
    if (phone && phone.trim()) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phone.trim())) {
        return NextResponse.json(
          { success: false, error: 'Invalid phone number format' },
          { status: 400 }
        );
      }
    }

    // For mentor requests, organization_id is required
    if (request_type === 'mentor' && !organization_id) {
      return NextResponse.json(
        { success: false, error: 'organization_id is required for mentor requests' },
        { status: 400 }
      );
    }

    // Validate organization exists if provided
    if (organization_id) {
      const orgCheck = await query(
        'SELECT id, name FROM organizations WHERE id = $1',
        [organization_id]
      );
      if (orgCheck.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Organization not found' },
          { status: 404 }
        );
      }
    }

    // Check if user with this email already exists
    const existingUser = await query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'An account with this email already exists. Please log in instead.' 
        },
        { status: 409 }
      );
    }

    // Check if there's already a pending request for this email and type
    const existingRequest = await query(
      `SELECT id, status FROM vendor_alumni_requests 
       WHERE email = $1 AND request_type = $2 AND status = 'pending'`,
      [email.toLowerCase().trim(), request_type]
    );

    if (existingRequest.rows.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'You already have a pending registration request. Please wait for it to be reviewed.',
          existing_request_id: existingRequest.rows[0].id
        },
        { status: 409 }
      );
    }

    // Create the registration request
    const result = await query(
      `INSERT INTO vendor_alumni_requests (
        request_type, first_name, last_name, email, phone, 
        organization_id, event_interest, workshop_interest, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING id, status, created_at`,
      [
        request_type,
        first_name.trim(),
        last_name.trim(),
        email.toLowerCase().trim(),
        phone?.trim() || null,
        organization_id || null,
        event_interest,
        workshop_interest
      ]
    );

    const requestData = result.rows[0];
    console.log('📝 [REGISTRATION REQUEST] ✅ Request created:', requestData.id);

    // Send notifications based on request type
    try {
      const orgName = organization_id 
        ? (await query('SELECT name FROM organizations WHERE id = $1', [organization_id])).rows[0]?.name || 'Unknown Organization'
        : null;

      const roleDisplayName = request_type === 'vendor' ? 'Vendor' : 'Mentor';
      const notificationType = request_type === 'vendor' ? 'vendor_request' : 'mentor_request';
      
      if (request_type === 'vendor') {
        // Vendor requests: Send to all superadmins
        const superadminResult = await query(
          `SELECT u.id, u.email, u.first_name, u.last_name
           FROM users u
           INNER JOIN user_roles ur ON u.id = ur.user_id
           INNER JOIN roles r ON ur.role_id = r.id
           WHERE r.code = 'superadmin' AND u.is_active = true`
        );

        if (superadminResult.rows.length > 0) {
          // Get base URL before building template
          const { buildUrl } = await import('@/lib/utils/url.js');
          const actionUrl = buildUrl('/dashboards/superadmin-vendor-requests', request);
          const subject = `New ${roleDisplayName} Registration Request`;
          
          const emailText = `
A new ${roleDisplayName} registration request has been submitted.

Request Details:
- Name: ${first_name} ${last_name}
- Email: ${email}
- Phone: ${phone || 'Not provided'}
- Type: ${roleDisplayName}
- Event Interest: ${event_interest ? 'Yes' : 'No'}
- Workshop Interest: ${workshop_interest ? 'Yes' : 'No'}

Please review and approve/reject this request in the admin dashboard.
          `.trim();

          const emailHtml = `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">New ${roleDisplayName} Registration Request</h2>
  <p>A new ${roleDisplayName} registration request has been submitted.</p>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #555;">Request Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #666;">Name:</td>
        <td style="padding: 8px 0;">${first_name} ${last_name}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #666;">Email:</td>
        <td style="padding: 8px 0;">${email}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #666;">Phone:</td>
        <td style="padding: 8px 0;">${phone || 'Not provided'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #666;">Type:</td>
        <td style="padding: 8px 0;">${roleDisplayName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #666;">Event Interest:</td>
        <td style="padding: 8px 0;">${event_interest ? 'Yes' : 'No'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #666;">Workshop Interest:</td>
        <td style="padding: 8px 0;">${workshop_interest ? 'Yes' : 'No'}</td>
      </tr>
    </table>
  </div>
  
  <p style="margin-top: 20px;">
    <a href="${actionUrl}" 
       style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
      Review Request
    </a>
  </p>
</div>
          `.trim();

          // Create database notifications and send emails to each superadmin
          for (const superadmin of superadminResult.rows) {
            try {
              // Create database notification
              await query(
                `INSERT INTO notifications (user_id, type, title, message, data, action_url)
                 VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
                [
                  superadmin.id,
                  notificationType,
                  `New ${roleDisplayName} Registration Request`,
                  `A new ${roleDisplayName} registration request has been submitted by ${first_name} ${last_name} (${email}).`,
                  JSON.stringify({
                    request_id: requestData.id,
                    request_type: request_type,
                    requester_name: `${first_name} ${last_name}`,
                    requester_email: email,
                    organization_id: null,
                    organization_name: null
                  }),
                  actionUrl
                ]
              );
              console.log(`🔔 [REGISTRATION REQUEST] ✅ Database notification created for superadmin: ${superadmin.email}`);

              // Send email notification
              await sendEmail({
                to: superadmin.email,
                subject,
                text: emailText,
                html: emailHtml,
                category: 'registration_request'
              });
              console.log(`📧 [REGISTRATION REQUEST] ✅ Email notification sent to superadmin: ${superadmin.email}`);
            } catch (error) {
              console.error(`📧 [REGISTRATION REQUEST] ❌ Failed to notify superadmin ${superadmin.email}:`, error);
              // Continue with other superadmins even if one fails
            }
          }
        } else {
          console.log('📧 [REGISTRATION REQUEST] ⚠️ No superadmin users found to notify');
        }
      } else if (request_type === 'mentor' && organization_id) {
        // Mentor requests: Send ONLY to admins of the matching organization
        // Must have admin role in user_roles for this organization AND primary role must be admin (exclude students)
        const adminResult = await query(
          `SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
           FROM users u
           INNER JOIN user_roles ur ON u.id = ur.user_id
           INNER JOIN roles r ON ur.role_id = r.id
           WHERE r.code = 'admin' 
             AND ur.org_id = $1
             AND u.is_active = true
             AND COALESCE(u.role, '') != 'student'`,
          [organization_id]
        );

        if (adminResult.rows.length > 0) {
          // Get base URL before building template
          const { buildUrl } = await import('@/lib/utils/url.js');
          const actionUrl = buildUrl('/dashboards/admin-mentor-requests', request);
          const subject = `New ${roleDisplayName} Registration Request`;
          
          const emailText = `
A new ${roleDisplayName} registration request has been submitted for your organization.

Request Details:
- Name: ${first_name} ${last_name}
- Email: ${email}
- Phone: ${phone || 'Not provided'}
- Type: ${roleDisplayName}
- Organization: ${orgName}
- Event Interest: ${event_interest ? 'Yes' : 'No'}
- Workshop Interest: ${workshop_interest ? 'Yes' : 'No'}

Please review and approve/reject this request in the admin dashboard.
          `.trim();

          const emailHtml = `
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333;">New ${roleDisplayName} Registration Request</h2>
  <p>A new ${roleDisplayName} registration request has been submitted for your organization.</p>
  
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #555;">Request Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #666;">Name:</td>
        <td style="padding: 8px 0;">${first_name} ${last_name}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #666;">Email:</td>
        <td style="padding: 8px 0;">${email}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #666;">Phone:</td>
        <td style="padding: 8px 0;">${phone || 'Not provided'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #666;">Type:</td>
        <td style="padding: 8px 0;">${roleDisplayName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #666;">Organization:</td>
        <td style="padding: 8px 0;">${orgName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #666;">Event Interest:</td>
        <td style="padding: 8px 0;">${event_interest ? 'Yes' : 'No'}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #666;">Workshop Interest:</td>
        <td style="padding: 8px 0;">${workshop_interest ? 'Yes' : 'No'}</td>
      </tr>
    </table>
  </div>
  
  <p style="margin-top: 20px;">
    <a href="${actionUrl}" 
       style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
      Review Request
    </a>
  </p>
</div>
          `.trim();

          // Create database notifications and send emails to each admin
          for (const admin of adminResult.rows) {
            try {
              // Create database notification
              await query(
                `INSERT INTO notifications (user_id, type, title, message, data, action_url)
                 VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
                [
                  admin.id,
                  notificationType,
                  `New ${roleDisplayName} Registration Request`,
                  `A new ${roleDisplayName} registration request has been submitted by ${first_name} ${last_name} (${email}) for ${orgName}.`,
                  JSON.stringify({
                    request_id: requestData.id,
                    request_type: request_type,
                    requester_name: `${first_name} ${last_name}`,
                    requester_email: email,
                    organization_id: organization_id,
                    organization_name: orgName
                  }),
                  actionUrl
                ]
              );
              console.log(`🔔 [REGISTRATION REQUEST] ✅ Database notification created for admin: ${admin.email}`);

              // Send email notification
              await sendEmail({
                to: admin.email,
                subject,
                text: emailText,
                html: emailHtml,
                category: 'registration_request'
              });
              console.log(`📧 [REGISTRATION REQUEST] ✅ Email notification sent to admin: ${admin.email}`);
            } catch (error) {
              console.error(`📧 [REGISTRATION REQUEST] ❌ Failed to notify admin ${admin.email}:`, error);
              // Continue with other admins even if one fails
            }
          }
        } else {
          console.log(`📧 [REGISTRATION REQUEST] ⚠️ No admin users found for organization ${organization_id} to notify`);
        }
      }
    } catch (notificationError) {
      console.error('📧 [REGISTRATION REQUEST] ❌ Error sending notifications:', notificationError);
      // Don't fail the request creation if notification fails
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: requestData.id,
          status: requestData.status,
          created_at: requestData.created_at,
          message: 'Your registration request has been submitted successfully. You will be notified once it is reviewed.'
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('📝 [REGISTRATION REQUEST] ❌ Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to create registration request' 
      },
      { status: 500 }
    );
  }
}

