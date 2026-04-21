import { NextResponse } from "next/server";
import { sha256 } from "@/lib/security/tokens.js";
import { hashPassword, ensureStrongPassword } from "@/lib/security/passwords.js";
import { getInviteByTokenHash, markInviteUsed, createUserWithRole } from "@/lib/db/users.js";

// POST: accept invite
// Body: { token, password }
export async function POST(request) {
  try {
    const body = await request.json();
    const token = body?.token || "";
    const password = body?.password || "";
    
    if (!token || token.length < 20) {
      return NextResponse.json({ error: "INVALID_TOKEN", message: "Token is required and must be at least 20 characters" }, { status: 400 });
    }
    
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "INVALID_PASSWORD", message: "Password is required and must be at least 8 characters" }, { status: 400 });
    }

    try {
      ensureStrongPassword(password);
    } catch (e) {
      if (e?.code === 'WEAK_PASSWORD') {
        return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
      }
      throw e;
    }

    const tokenHashBuffer = sha256(token);
    const tokenHashHex = tokenHashBuffer.toString("hex");
    const invite = await getInviteByTokenHash(tokenHashHex);
    
    if (!invite) {
      return NextResponse.json({ error: "NOT_FOUND_OR_EXPIRED", message: "Invite token not found or has expired" }, { status: 404 });
    }

    const password_hash = await hashPassword(password);

    // Create user if needed and attach role; payload may include scope fields
    const payload = invite.payload || {};
    const roleCode = invite.role_code;
    let orgId = invite.org_id || null;

    // Log invite details for debugging
    console.log('[INVITE_ACCEPT] Processing invite:', {
      inviteId: invite.id,
      email: invite.email,
      roleCode,
      orgId: orgId,
      orgIdType: typeof orgId,
      orgName: invite.org_name || invite.org_display_name,
      rawInvite: {
        org_id: invite.org_id,
        org_id_type: typeof invite.org_id
      }
    });
    
    // Validate and normalize orgId if present
    if (orgId) {
      // Ensure orgId is a string and trim whitespace
      orgId = String(orgId).trim();
      if (orgId === '' || orgId === 'null' || orgId === 'undefined') {
        orgId = null;
      }
    }

    // Validate org_id requirement based on role
    // Only superadmin can have null org_id; all other roles require an organization
    // Exception: vendors get organizations from vendor_organizations table, not from invite.org_id
    const rolesRequiringOrg = ['admin', 'instructor', 'student', 'parent', 'alumni'];
    const isSuperadmin = roleCode === 'superadmin';
    const isVendor = roleCode === 'vendor';
    
    // For vendors, check if they have organizations assigned in vendor_organizations
    let vendorHasOrgs = false;
    if (isVendor) {
      const { query } = await import('@/lib/db/index.js');
      try {
        // Check if user already exists and has organizations
        const userCheck = await query(
          'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
          [invite.email]
        );
        
        if (userCheck.rows.length > 0) {
          const vendorOrgs = await query(
            `SELECT COUNT(*) as count
             FROM vendor_organizations vo
             INNER JOIN organizations o ON vo.organization_id = o.id
             WHERE vo.vendor_id = $1 AND o.status = 'active'`,
            [userCheck.rows[0].id]
          );
          vendorHasOrgs = parseInt(vendorOrgs.rows[0]?.count || 0) > 0;
        }
      } catch (err) {
        console.error('[INVITE_ACCEPT] Error checking vendor organizations:', err);
      }
    }
    
    if (!isSuperadmin && !isVendor && rolesRequiringOrg.includes(roleCode) && !orgId) {
      return NextResponse.json({ 
        error: "ORG_REQUIRED", 
        message: `Organization is required for ${roleCode} role. The invitation is invalid or the organization was removed. Please contact support.` 
      }, { status: 400 });
    }
    
    // For vendors, require either orgId or organizations in vendor_organizations
    if (isVendor && !orgId && !vendorHasOrgs) {
      return NextResponse.json({ 
        error: "ORG_REQUIRED", 
        message: `Organization is required for vendor role. The invitation is invalid or the organization was removed. Please contact support.` 
      }, { status: 400 });
    }

    // Validate organization exists if org_id is provided
    // Note: We validate here, but createUserWithRole will also validate within its transaction
    // Skip orgId validation for vendors since they get organizations from vendor_organizations
    if (orgId && !isVendor) {
      const { query } = await import('@/lib/db/index.js');
      try {
        // Normalize orgId to ensure it's a valid UUID string
        const normalizedOrgId = String(orgId).trim();
        
        const orgCheck = await query('SELECT id, name, status FROM organizations WHERE id = $1::uuid', [normalizedOrgId]);
        if (orgCheck.rows.length === 0) {
          console.error(`[INVITE_ACCEPT] Organization not found: ${normalizedOrgId} (type: ${typeof orgId})`);
          return NextResponse.json({ 
            error: "ORG_NOT_FOUND", 
            message: `The organization associated with this invitation no longer exists. Please contact support.` 
          }, { status: 400 });
        }
        
        const org = orgCheck.rows[0];
        // Check if organization is active
        if (org.status && org.status !== 'active') {
          return NextResponse.json({ 
            error: "ORG_INACTIVE", 
            message: `The organization "${org.name}" is currently ${org.status}. Please contact support.` 
          }, { status: 400 });
        }
        
        // Use the validated org_id from database (ensures correct format)
        // Convert to string to ensure consistent format
        orgId = String(org.id);
        console.log(`[INVITE_ACCEPT] Organization validated: ${org.name} (${org.id}), using orgId: ${orgId}`);
      } catch (orgError) {
        console.error('[INVITE_ACCEPT] Error validating organization:', {
          error: orgError,
          orgId: orgId,
          orgIdType: typeof orgId,
          code: orgError.code,
          message: orgError.message
        });
        // If UUID format is invalid, return error
        if (orgError.code === '22P02' || orgError.message?.includes('invalid input syntax')) {
          return NextResponse.json({ 
            error: "INVALID_ORG_ID", 
            message: `Invalid organization ID format in invitation: ${orgId}. Please contact support.` 
          }, { status: 400 });
        }
        throw orgError;
      }
    }

    try {
      // For vendors, orgId should be null since they get organizations from vendor_organizations
      const finalOrgId = isVendor ? null : orgId;
      
      const user = await createUserWithRole({
        email: invite.email,
        first_name: payload.first_name || null,
        last_name: payload.last_name || null,
        avatar_url: payload.avatar_url || null,
        status: 'active',
        password_hash,
        mfa_required: !!invite.mfa_required,
        mfa_method: invite.mfa_method || 'none',
        must_reset_password: false,
        roleCode,
        orgId: finalOrgId,
      });

      await markInviteUsed(invite.id);

      // TODO: set email_verified_at and create session via your existing auth/session system
      // For now return user id for redirect
      return NextResponse.json({ ok: true, userId: user.id, message: "Invitation accepted successfully" });
    } catch (userError) {
      console.error('[INVITE_ACCEPT] User creation error:', {
        code: userError?.code,
        message: userError?.message,
        detail: userError?.detail,
        constraint: userError?.constraint,
        table: userError?.table,
        stack: userError?.stack
      });
      
      // Handle specific database errors
      if (userError?.code === 'UNIQUE_VIOLATION' || userError?.code === '23505') {
        return NextResponse.json({ 
          error: "USER_EXISTS", 
          message: "A user with this email already exists. Please login instead." 
        }, { status: 409 });
      }
      
      // Handle foreign key violations more intelligently
      if (userError?.code === 'FOREIGN_KEY_VIOLATION' || userError?.code === '23503') {
        // Log detailed error information
        console.error('[INVITE_ACCEPT] Foreign key violation details:', {
          code: userError.code,
          constraint: userError.constraint,
          table: userError.table,
          detail: userError.detail,
          message: userError.message,
          orgId: orgId,
          roleCode: roleCode
        });
        
        // Check if it's actually an organization issue
        const isOrgIssue = userError?.constraint?.toLowerCase().includes('org') || 
                          userError?.table === 'organizations' ||
                          userError?.detail?.toLowerCase().includes('organizations') ||
                          userError?.detail?.toLowerCase().includes('org_id');
        
        if (isOrgIssue) {
          // For non-superadmin roles, org is required - don't retry with null
          if (!isSuperadmin && rolesRequiringOrg.includes(roleCode)) {
            return NextResponse.json({ 
              error: "ORG_INVALID", 
              message: `The organization (ID: ${orgId}) associated with this invitation is invalid or no longer exists. Organization is required for ${roleCode} role. Please contact support with this error code: FK_${userError.constraint || 'UNKNOWN'}` 
            }, { status: 400 });
          }
          
          // Only for superadmin, allow retry with null org_id
          if (isSuperadmin && orgId) {
            console.warn(`[INVITE_ACCEPT] Organization ${orgId} constraint violation for superadmin, retrying with null org_id`);
            try {
              const user = await createUserWithRole({
                email: invite.email,
                first_name: payload.first_name || null,
                last_name: payload.last_name || null,
                avatar_url: payload.avatar_url || null,
                status: 'active',
                password_hash,
                mfa_required: !!invite.mfa_required,
                mfa_method: invite.mfa_method || 'none',
                must_reset_password: false,
                roleCode,
                orgId: null, // Superadmin can have null org_id
              });
              await markInviteUsed(invite.id);
              return NextResponse.json({ 
                ok: true, 
                userId: user.id, 
                message: "Invitation accepted successfully" 
              });
            } catch (retryError) {
              console.error('[INVITE_ACCEPT] Retry also failed:', retryError);
              return NextResponse.json({ 
                error: "INVALID_ORG", 
                message: "There was an issue with the organization association. Please contact support." 
              }, { status: 400 });
            }
          }
        }
        
        // Not an org issue, return detailed error
        return NextResponse.json({ 
          error: "DATABASE_ERROR", 
          message: `Database constraint violation: ${userError.constraint || 'unknown constraint'} on table ${userError.table || 'unknown'}. ${userError.detail || userError.message || 'Please contact support.'}` 
        }, { status: 400 });
      }
      
      // Log other errors for debugging
      throw userError;
    }
  } catch (e) {
    console.error('[INVITE_ACCEPT] Error:', e);
    return NextResponse.json({ 
      error: "SERVER_ERROR", 
      message: e.message || "An unexpected error occurred while accepting the invitation" 
    }, { status: 500 });
  }
}


