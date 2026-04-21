import { NextResponse } from "next/server";
import { userInviteSchema, validateInviteWithActor } from "@/lib/validation/userSchemas.js";
import { getRoleByCode, createInvite } from "@/lib/db/users.js";
import { generateTokenHex, sha256 } from "@/lib/security/tokens.js";
import { generateTemporaryPassword } from "@/lib/security/passwordGenerator.js";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { revalidateTag } from "next/cache";
import { sendEmail } from "@/lib/email/send.js";
import { inviteTemplate } from "@/lib/email/templates/invite.js";
import { createAuditLog, extractRequestInfo } from "@/lib/db/auditLogs.js";
import { rateLimit, RateLimitError } from "@/lib/security/rateLimiter.js";
import { handleApiError } from "@/lib/errors/apiErrorHandler.js";
import bcrypt from "bcryptjs";

/**
 * POST /api/users/invite
 * 
 * Creates an invite token for a new user
 */
export async function POST(request) {
  console.log('📧 [INVITE] ===== INVITE REQUEST STARTED =====');
  console.log('📧 [INVITE] Request method:', request.method);
  console.log('📧 [INVITE] Request URL:', request.url);
  
  try {
    // Check authentication
    console.log('📧 [INVITE] Checking authentication...');
    const session = await auth();
    if (!session?.user) {
      console.log('📧 [INVITE] ❌ Unauthorized - No session');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log('📧 [INVITE] ✅ Authenticated user:', session.user.email, 'Role:', session.user.role);

    // Check authorization (superadmin, admin, or instructor)
    const userRole = session.user.role;
    if (userRole !== "superadmin" && userRole !== "admin" && userRole !== "instructor") {
      console.log('📧 [INVITE] ❌ Forbidden - User role:', userRole);
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Role-based permission enforcement
    if (userRole === "instructor") {
      // Instructor can only invite students
      if (body.role && body.role !== "student") {
        console.log('📧 [INVITE] ❌ Forbidden - Instructor trying to invite non-student');
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Instructors can only invite student accounts" },
          { status: 403 }
        );
      }
    } else if (userRole === "admin") {
      // Admin can invite all roles except brand and superadmin
      // Company is allowed (organization-scoped, like vendor)
      const forbiddenRoles = ["brand", "superadmin"];
      if (body.role && forbiddenRoles.includes(body.role)) {
        console.log('📧 [INVITE] ❌ Forbidden - Admin trying to invite restricted role:', body.role);
        return NextResponse.json(
          { error: "FORBIDDEN", message: `Admins cannot invite ${body.role} accounts` },
          { status: 403 }
        );
      }
    }
    // Superadmin can invite all roles (no restriction needed)
    console.log('📧 [INVITE] ✅ Authorized - User has permission to invite');

    // Rate limiting
    const rateLimitResult = rateLimit(request, 'invitation', session.user.id);
    if (!rateLimitResult.allowed) {
      console.log('📧 [INVITE] ❌ Rate limit exceeded');
      return NextResponse.json(
        { 
          error: "RATE_LIMIT_EXCEEDED", 
          message: "Too many invitation requests. Please try again later.",
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          }
        }
      );
    }

    console.log('📧 [INVITE] Request body received:', { 
      email: body.email, 
      role: body.role, 
      delivery: body.delivery,
      expiry_hours: body.expiry_hours,
      // Student-specific fields
      cohort_id: body.cohort_id || null,
      subject_offering_ids: body.subject_offering_ids || null,
      roll_no: body.roll_no || null,
      program_node_id: body.program_node_id || null,
    });
    
    // For student invitation, check if cohort has offerings
    // If cohort has no offerings, make subject_offering_ids optional
    if (body.role === "student" && body.cohort_id) {
      const { query } = await import("@/lib/db/index.js");
      const offeringsResult = await query(
        `SELECT COUNT(*)::int as count FROM subject_offerings WHERE cohort_id = $1 AND status = 'published'`,
        [body.cohort_id]
      );
      const offeringsCount = offeringsResult.rows[0]?.count || 0;
      
      // If cohort has no offerings, allow empty subject_offering_ids
      if (offeringsCount === 0) {
        console.log('📧 [INVITE] ⚠️ Cohort has no offerings, allowing empty subject_offering_ids');
        if (!body.subject_offering_ids || body.subject_offering_ids.length === 0) {
          body.subject_offering_ids = undefined; // Make it truly optional
        }
      }
    }
    
    // Validate input
    console.log('📧 [INVITE] Validating input schema...');
    const validation = userInviteSchema.safeParse(body);
    if (!validation.success) {
      console.log('📧 [INVITE] ❌ Validation failed:', validation.error.errors);
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: validation.error.errors },
        { status: 400 }
      );
    }
    console.log('📧 [INVITE] ✅ Schema validation passed');
    const data = validation.data;

    // For instructor, fetch assigned cohorts/offerings from database if not in session
    let assignedCohorts = session.user.assignedCohorts || [];
    let assignedOfferings = session.user.assignedOfferings || [];
    
    if (userRole === "instructor" && (!assignedCohorts || assignedCohorts.length === 0)) {
      // Fetch instructor's assigned cohorts and offerings from database
      const { query } = await import("@/lib/db/index.js");
      
      // Get cohorts from instructor_classes
      const cohortsResult = await query(
        `SELECT DISTINCT cohort_id FROM instructor_classes WHERE instructor_user_id = $1`,
        [session.user.id]
      );
      assignedCohorts = cohortsResult.rows.map(row => row.cohort_id);
      
      // Get offerings from instructor_classes
      const offeringsResult = await query(
        `SELECT DISTINCT subject_offering_id FROM instructor_classes WHERE instructor_user_id = $1 AND subject_offering_id IS NOT NULL`,
        [session.user.id]
      );
      assignedOfferings = offeringsResult.rows.map(row => row.subject_offering_id);
    }

    // Brand role validation - must have org_id = null (enforced by validation, but ensure here too)
    if (data.role === "brand") {
      if (data.org_id !== null && data.org_id !== undefined) {
        console.log('📧 [INVITE] ❌ Invalid - Brand user cannot have org_id');
        return NextResponse.json(
          { error: "INVALID_ORG", message: "Brand users must be global (org_id must be null)" },
          { status: 400 }
        );
      }
      data.org_id = null; // Force null for brand users
      console.log('📧 [INVITE] ✅ Brand role validated - org_id set to null');
    }

    // Vendor organization handling
    if (data.role === "vendor") {
      if (userRole === "admin" && session.user.orgId) {
        // Admin must set vendor to their org
        data.org_id = session.user.orgId;
        console.log('📧 [INVITE] ✅ Auto-setting vendor org_id to admin org:', session.user.orgId);
      }
      // Superadmin can set org optionally (or leave null) - no change needed
    }

    // Organization access control: Admin and Instructor can only invite users in their organization
    // Automatically set org_id for admin and instructor users
    if ((userRole === "admin" || userRole === "instructor") && session.user.orgId) {
      if (data.org_id && data.org_id !== session.user.orgId) {
        console.log('📧 [INVITE] ❌ Forbidden - User trying to invite user for different org');
        return NextResponse.json(
          { error: "FORBIDDEN", message: "You can only invite users to your own organization" },
          { status: 403 }
        );
      }
      // Enforce org_id for admin and instructor - automatically set to their org
      if (!data.org_id) {
        console.log('📧 [INVITE] ✅ Auto-setting org_id for user:', session.user.orgId);
        data.org_id = session.user.orgId;
      }
    }

    // Build actor context for validation
    const actor = {
      role: userRole,
      orgId: session.user.orgId || null,
      // For instructor, include assigned cohorts/offerings for scope validation
      assignedCohorts: userRole === "superadmin" ? undefined : assignedCohorts,
      assignedOfferings: userRole === "superadmin" ? undefined : assignedOfferings,
    };

    // Validate with actor context
    let validatedData;
    try {
      validatedData = validateInviteWithActor(data, actor);
    } catch (e) {
      return NextResponse.json(
        { error: e.code || "VALIDATION_ERROR", message: e.message },
        { status: 400 }
      );
    }

    // Get or create role ID
    console.log('📧 [INVITE] ===== ROLE LOOKUP START =====');
    console.log('📧 [INVITE] Requested role code:', validatedData.role);
    let role = await getRoleByCode(validatedData.role);
    
    // If role not found and it's 'instructor', try 'orginstructor' as fallback
    if (!role && validatedData.role === 'instructor') {
      console.log('📧 [INVITE] ⚠️ Instructor role not found, trying orginstructor...');
      role = await getRoleByCode('orginstructor');
      if (role) {
        console.log('📧 [INVITE] ✅ Found orginstructor role, using it for instructor invitation');
      }
    }
    
    if (!role) {
      // Role doesn't exist, try to create it
      console.log('📧 [INVITE] ⚠️ Role not found, attempting to create...');
      try {
        const { query } = await import("@/lib/db/index.js");
        const roleTitles = {
          superadmin: "Super Admin",
          admin: "Organization Admin",
          instructor: "Instructor",
          orginstructor: "Organization Instructor",
          student: "Student",
          vendor: "Vendor",
          orgvendor: "Organization Vendor",
          parent: "Parent/Guardian",
          orgparent: "Organization Parent/Guardian",
          alumni: "Alumni",
          orgalumni: "Organization Alumni",
          mentor: "Mentor",
          brand: "Brand",
        };
        
        const roleCodeToUse = validatedData.role;
        const roleTitle = roleTitles[roleCodeToUse] || roleCodeToUse;
        
        console.log('📧 [INVITE] Attempting to create role:', { code: roleCodeToUse, title: roleTitle });
        
        const result = await query(
          `INSERT INTO roles (id, code, title, created_at, updated_at)
           VALUES (uuid_generate_v4(), $1::role_code_enum, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (code) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
           RETURNING id, code, title`,
          [roleCodeToUse, roleTitle]
        );
        
        if (result.rows.length > 0) {
          role = result.rows[0];
          console.log(`📧 [INVITE] ✅ Created role: ${role.code} (${role.title}) with ID: ${role.id}`);
        } else {
          // Try fetching again after insert
          console.log('📧 [INVITE] Role created but not returned, fetching again...');
          role = await getRoleByCode(roleCodeToUse);
          if (role) {
            console.log(`📧 [INVITE] ✅ Fetched role after creation: ${role.code} (${role.title})`);
          }
        }
      } catch (createError) {
        console.error("📧 [INVITE] ❌ Error creating role:", createError);
        console.error("📧 [INVITE] Error details:", {
          message: createError.message,
          code: createError.code,
          detail: createError.detail,
        });
        
        // If creation fails, try to list available roles for debugging
        try {
          const { listRoles } = await import("@/lib/db/users.js");
          const allRoles = await listRoles();
          console.error("📧 [INVITE] Available roles in database:", allRoles.map(r => ({ code: r.code, title: r.title })));
        } catch (e) {
          console.error("📧 [INVITE] Could not list roles:", e);
        }
        
        // If enum doesn't allow the role code, try with org prefix for instructor
        if (validatedData.role === 'instructor' && createError.code === '42804') {
          console.log('📧 [INVITE] ⚠️ Enum doesn\'t allow instructor, trying orginstructor...');
          try {
            const { query } = await import("@/lib/db/index.js");
            const result = await query(
              `INSERT INTO roles (id, code, title, created_at, updated_at)
               VALUES (uuid_generate_v4(), $1::role_code_enum, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               ON CONFLICT (code) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
               RETURNING id, code, title`,
              ['orginstructor', 'Organization Instructor']
            );
            if (result.rows.length > 0) {
              role = result.rows[0];
              console.log(`📧 [INVITE] ✅ Created orginstructor role as fallback: ${role.code} (${role.title})`);
            }
          } catch (fallbackError) {
            console.error("📧 [INVITE] ❌ Fallback role creation also failed:", fallbackError);
          }
        }
        
        if (!role) {
          return NextResponse.json(
            { 
              error: "INVALID_ROLE", 
              message: `Role '${validatedData.role}' not found and could not be created. Error: ${createError.message}` 
            },
            { status: 400 }
          );
        }
      }
    }

    if (!role || !role.id) {
      console.error('📧 [INVITE] ❌ Role lookup failed completely for:', validatedData.role);
      console.error('📧 [INVITE] Role object:', role);
      return NextResponse.json(
        { 
          error: "INVALID_ROLE", 
          message: `Role '${validatedData.role}' not found in database and could not be created` 
        },
        { status: 400 }
      );
    }
    
    console.log('📧 [INVITE] ✅ Role found/created successfully:', { 
      code: role.code, 
      title: role.title, 
      id: role.id 
    });
    console.log('📧 [INVITE] ===== ROLE LOOKUP END =====');

    // Generate invite token
    console.log('📧 [INVITE] Generating invite token...');
    const token = generateTokenHex(32);
    const tokenHash = sha256(token);
    console.log('📧 [INVITE] ✅ Token generated (hash:', tokenHash.toString("hex").substring(0, 16) + '...)');

    // Calculate expiry (enforce 24 hours for invitations)
    const expiryHours = Math.min(validatedData.expiry_hours || 24, 24); // Max 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);
    console.log('📧 [INVITE] Invite expires at:', expiresAt.toISOString(), `(${expiryHours} hours)`);

    // Generate temporary password if mode is temp_password_email
    let temporaryPassword = null;
    let temporaryPasswordHash = null;
    const inviteMode = validatedData.delivery === "invite_link" ? "invite_link" : "temp_password_email";
    
    if (inviteMode === "temp_password_email") {
      console.log('📧 [INVITE] Generating temporary password...');
      temporaryPassword = generateTemporaryPassword(16);
      temporaryPasswordHash = await bcrypt.hash(temporaryPassword, 10);
      console.log('📧 [INVITE] ✅ Temporary password generated (hash stored)');
    }

    // Build payload with role-specific data
    const payload = {
      first_name: validatedData.first_name || null,
      last_name: validatedData.last_name || null,
      avatar_url: validatedData.avatar_url || null,
      temporary_password_hash: temporaryPasswordHash || null, // Store hashed temp password
    };

    // Add role-specific fields to payload
    if (validatedData.role === "student") {
      if (validatedData.cohort_id) payload.cohort_id = validatedData.cohort_id;
      if (validatedData.subject_offering_ids && validatedData.subject_offering_ids.length > 0) {
        payload.subject_offering_ids = validatedData.subject_offering_ids;
      }
      if (validatedData.roll_no) payload.roll_no = validatedData.roll_no;
      if (validatedData.program_node_id) payload.program_node_id = validatedData.program_node_id;
      
      console.log('📧 [INVITE] Student-specific payload:', {
        cohort_id: payload.cohort_id || null,
        subject_offering_ids: payload.subject_offering_ids || null,
        roll_no: payload.roll_no || null,
        program_node_id: payload.program_node_id || null,
      });
    }

    if (validatedData.role === "instructor") {
      if (validatedData.cohort_ids) payload.cohort_ids = validatedData.cohort_ids;
      if (validatedData.offering_ids) payload.offering_ids = validatedData.offering_ids;
    }

    if (validatedData.role === "parent" && validatedData.linked_student_ids) {
      payload.linked_student_ids = validatedData.linked_student_ids;
    }

    if (validatedData.role === "vendor") {
      if (validatedData.vendor_category) payload.vendor_category = validatedData.vendor_category;
      if (validatedData.company_name) payload.company_name = validatedData.company_name;
      if (validatedData.gstin) payload.gstin = validatedData.gstin;
    }

    // Handle mentor/alumni role (alumni is mapped to mentor in validation)
    if (validatedData.role === "mentor" || validatedData.role === "alumni") {
      if (validatedData.graduation_year) payload.graduation_year = validatedData.graduation_year;
      if (validatedData.program_node_id) payload.program_node_id = validatedData.program_node_id;
    }

    // Brand users don't need role-specific payload fields (no cohorts/organizations)

    // Validate role ID before creating invite
    if (!role || !role.id) {
      console.error('📧 [INVITE] ❌ Cannot create invite: Invalid role', { role });
      return NextResponse.json(
        { 
          error: "INVALID_ROLE", 
          message: `Role '${validatedData.role}' is invalid. Role ID is missing.` 
        },
        { status: 400 }
      );
    }

    // Create invite
    console.log('📧 [INVITE] ===== CREATING INVITE RECORD =====');
    console.log('📧 [INVITE] Invite data:', {
      email: validatedData.email,
      orgId: validatedData.org_id || null,
      roleId: role.id,
      roleCode: role.code,
      roleTitle: role.title,
      creatorId: session.user.id,
      mode: inviteMode,
      payload: payload, // Include full payload for debugging
    });
    
    let invite;
    try {
      invite = await createInvite({
        email: validatedData.email,
        orgId: validatedData.org_id || null,
        roleId: role.id,
        creatorId: session.user.id,
        mode: inviteMode,
        mfa_required: validatedData.mfa_required || false,
        mfa_method: validatedData.mfa_method || "none",
        payload,
        expiresAt,
        tokenHash: tokenHash.toString("hex"),
      });
      console.log('📧 [INVITE] ✅ Invite record created successfully:', invite.id);
    } catch (inviteError) {
      console.error('📧 [INVITE] ❌ Failed to create invite record:', inviteError);
      console.error('📧 [INVITE] Error details:', {
        message: inviteError.message,
        code: inviteError.code,
        detail: inviteError.detail,
      });
      return NextResponse.json(
        { 
          error: "INVITE_CREATION_FAILED", 
          message: `Failed to create invite: ${inviteError.message}` 
        },
        { status: 500 }
      );
    }

    // Build invite URL using centralized helper
    const { getBaseUrl } = await import('@/lib/utils/url.js');
    const baseUrl = getBaseUrl(request);
    const inviteUrl = `${baseUrl}/invite/accept?token=${token}`;
    console.log('📧 [INVITE] Invite URL generated:', inviteUrl);

    // Get organization label for email
    let orgLabel = "the organization";
    if (validatedData.org_id) {
      try {
        const { query } = await import("@/lib/db/index.js");
        const orgRes = await query('SELECT name, display_name FROM organizations WHERE id = $1', [validatedData.org_id]);
        if (orgRes.rows.length > 0) {
          orgLabel = orgRes.rows[0].display_name || orgRes.rows[0].name || orgLabel;
        }
      } catch (orgError) {
        console.log('📧 [INVITE] ⚠️ Could not fetch org label:', orgError.message);
      }
    }

    // Send email
    console.log('📧 [INVITE] ===== PREPARING TO SEND EMAIL =====');
    console.log('📧 [INVITE] Email config check:');
    console.log('📧 [INVITE]   - SENDGRID_API_KEY:', process.env.SENDGRID_API_KEY ? 'Set (' + process.env.SENDGRID_API_KEY.substring(0, 10) + '...)' : '❌ NOT SET');
    console.log('📧 [INVITE]   - EMAIL_FROM:', process.env.EMAIL_FROM || 'not set');
    console.log('📧 [INVITE]   - NODE_ENV:', process.env.NODE_ENV);
    console.log('📧 [INVITE]   - Role:', validatedData.role);
    console.log('📧 [INVITE]   - Role Title:', role.title);
    console.log('📧 [INVITE]   - Recipient:', validatedData.email);
    console.log('📧 [INVITE]   - Mode:', inviteMode);
    
    try {
      // Ensure role title is properly set
      const roleTitle = role?.title || role?.code || validatedData.role || 'User';
      console.log('📧 [INVITE] Using role title:', roleTitle);
      
      const emailTemplate = inviteTemplate({
        orgLabel,
        roleTitle: roleTitle,
        expiryHours,
        acceptUrl: inviteUrl,
        temporaryPassword: temporaryPassword, // Include temp password in email
        mode: inviteMode,
      });

      console.log('📧 [INVITE] Email template generated:', {
        to: validatedData.email,
        subject: emailTemplate.subject,
        hasText: !!emailTemplate.text,
        hasHtml: !!emailTemplate.html,
        textLength: emailTemplate.text?.length || 0,
        htmlLength: emailTemplate.html?.length || 0,
      });

      console.log('📧 [INVITE] Calling sendEmail function...');
      const emailResult = await sendEmail({
        to: validatedData.email,
        subject: emailTemplate.subject,
        text: emailTemplate.text,
        html: emailTemplate.html,
        category: 'user_invite',
      });

      console.log('📧 [INVITE] ✅ Email sent successfully:', {
        messageId: emailResult.id,
        testMode: emailResult.test || false,
        to: validatedData.email,
      });

      if (emailResult.test) {
        console.log('📧 [INVITE] ⚠️ Email sent in TEST mode - actual email not sent');
        console.log('📧 [INVITE] Email content (test):', emailTemplate.text?.substring(0, 200));
      } else {
        console.log('📧 [INVITE] ✅ Real email sent via SendGrid');
      }
    } catch (emailError) {
      console.error('📧 [INVITE] ❌ ===== EMAIL SEND FAILED =====');
      console.error('📧 [INVITE] Error type:', emailError.constructor.name);
      console.error('📧 [INVITE] Error message:', emailError.message);
      console.error('📧 [INVITE] Error stack:', emailError.stack);
      console.error('📧 [INVITE] Error code:', emailError.code);
      console.error('📧 [INVITE] Error response:', emailError.response?.body || emailError.response);
      console.error('📧 [INVITE] Full error object:', JSON.stringify(emailError, Object.getOwnPropertyNames(emailError), 2));
      // Continue even if email fails - invite is still created
      console.log('📧 [INVITE] ⚠️ Continuing despite email error - invite record saved');
    }

    // Create audit log
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await createAuditLog({
      actorId: session.user.id,
      action: 'invite_user',
      resourceType: 'invitation',
      resourceId: invite.id,
      newValues: {
        email: validatedData.email,
        role: validatedData.role,
        org_id: validatedData.org_id,
        mode: inviteMode,
        expires_at: expiresAt.toISOString(),
      },
      metadata: {
        role_specific_data: payload,
      },
      ipAddress,
      userAgent,
    });

    // Revalidate cache - multiple tags for comprehensive cache invalidation
    revalidateTag("users");
    revalidateTag("users-list");
    
    console.log('📧 [INVITE] ✅ Invite process completed successfully');
    const res = NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: validatedData.email,
        inviteUrl,
        expiresAt: expiresAt.toISOString(),
      },
    }, { status: 201 });
    
    // POST responses shouldn't be cached
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  } catch (error) {
    console.error('📧 [INVITE] ❌ ===== INVITE REQUEST FAILED =====');
    console.error('📧 [INVITE] Error:', error.message);
    console.error('📧 [INVITE] Error stack:', error.stack);
    console.error('📧 [INVITE] Error code:', error.code);

    if (error.code === "UNIQUE_VIOLATION") {
      console.log('📧 [INVITE] ❌ Duplicate invite detected');
      return NextResponse.json(
        { error: "DUPLICATE_INVITE", message: "Invite for this email already exists" },
        { status: 409 }
      );
    }

    // Handle enum value missing error (database migration not run)
    if (error.code === "ENUM_VALUE_MISSING") {
      console.log('📧 [INVITE] ❌ Database migration required');
      return NextResponse.json(
        { 
          error: "DATABASE_MIGRATION_REQUIRED", 
          message: error.message || "Database migration required. Please run: npm run db:migrate"
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

