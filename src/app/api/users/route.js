import { NextResponse } from "next/server";
import crypto from "crypto";
import { listUsers, createUserWithRole, attachStudentLink, attachInstructorLinks, attachParentLink, getRoleByCode } from "@/lib/db/users.js";
import { userCreateSchema, validateCreateWithActor } from "@/lib/validation/userSchemas.js";
import { hashPassword } from "@/lib/security/passwords.js";
import { auth } from "@/app/api/auth/[...nextauth]/route.js";
import { revalidateTag } from "next/cache";
import { createAuditLog, extractRequestInfo } from "@/lib/db/auditLogs.js";

export async function GET(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role;
    const userOrgId = session.user.orgId || null;
    const currentUserId = session.user.id; // Get current user ID to exclude from list

    // Organization access control: Admin can only see users from their organization
    // Superadmin can see all users
    let enforcedOrgId = null;
    if (userRole === "admin" && userOrgId) {
      enforcedOrgId = userOrgId;
    } else if (userRole !== "superadmin") {
      // Other roles (instructor, student, etc.) can only see users from their organization
      if (userOrgId) {
        enforcedOrgId = userOrgId;
      }
    }

    // ===== INSTRUCTOR-SPECIFIC FILTERING =====
    // For instructors: Only show students that belong to their assigned cohorts/subjects
    let instructorCohortIds = null;
    let instructorOfferingIds = null;
    
    if (userRole === "instructor") {
      // console.log('👨‍🏫 [USERS API] Instructor detected - fetching assigned cohorts/subjects for filtering');
      const { query } = await import("@/lib/db/index.js");
      
      try {
        // Get instructor's assigned cohorts from BOTH instructor_classes AND user_class_subject_links
        // This ensures we capture all assignments regardless of how they were created
        const cohortsResult = await query(
          `SELECT DISTINCT cohort_id 
           FROM (
             -- From instructor_classes table
             SELECT cohort_id 
             FROM instructor_classes 
             WHERE instructor_user_id = $1 AND cohort_id IS NOT NULL
             UNION
             -- From user_class_subject_links table (instructor type)
             SELECT DISTINCT cohort_id 
             FROM user_class_subject_links 
             WHERE user_id = $1 AND link_type = 'instructor' AND cohort_id IS NOT NULL
           ) AS instructor_cohorts`,
          [currentUserId]
        );
        instructorCohortIds = cohortsResult.rows.map(row => row.cohort_id).filter(Boolean);
        
        // Get instructor's assigned subject offerings from BOTH instructor_classes AND user_class_subject_links
        const offeringsResult = await query(
          `SELECT DISTINCT subject_offering_id 
           FROM (
             -- From instructor_classes table
             SELECT subject_offering_id 
             FROM instructor_classes 
             WHERE instructor_user_id = $1 AND subject_offering_id IS NOT NULL
             UNION
             -- From user_class_subject_links table (instructor type)
             SELECT DISTINCT subject_offering_id 
             FROM user_class_subject_links 
             WHERE user_id = $1 AND link_type = 'instructor' AND subject_offering_id IS NOT NULL
           ) AS instructor_offerings`,
          [currentUserId]
        );
        instructorOfferingIds = offeringsResult.rows.map(row => row.subject_offering_id).filter(Boolean);
        
        // console.log('👨‍🏫 [USERS API] Instructor assigned data (from both tables):', {
        //   cohortCount: instructorCohortIds.length,
        //   offeringCount: instructorOfferingIds.length,
        //   cohorts: instructorCohortIds,
        //   offerings: instructorOfferingIds,
        // });
      } catch (error) {
        console.error('👨‍🏫 [USERS API] Error fetching instructor assignments:', error);
        // If error, don't apply filtering (fail open - show all users in org)
        instructorCohortIds = null;
        instructorOfferingIds = null;
      }
    }

    const { searchParams } = new URL(request.url);
    
    // Parse roles filter (can be comma-separated or array)
    let roles = undefined;
    const rolesParam = searchParams.get("roles");
    if (rolesParam) {
      roles = rolesParam.split(',').map(r => r.trim()).filter(r => r);
    }
    
    // Get orgId from query params (support both orgId and organizationId)
    const orgIdFromQuery = searchParams.get("orgId") || searchParams.get("organizationId");
    
    // Parse classIds filter (comma-separated or array)
    let classIds = undefined;
    const classIdsParam = searchParams.get("classIds");
    if (classIdsParam) {
      classIds = classIdsParam.split(',').map(id => id.trim()).filter(id => id);
    }

    const filters = {
      q: searchParams.get("q") || undefined,
      role: searchParams.get("role") || undefined, // Single role (backward compatibility)
      roles: roles, // Multiple roles
      status: searchParams.get("status") || undefined,
      verified: searchParams.get("verified") === "true" ? true : searchParams.get("verified") === "false" ? false : undefined,
      orgId: enforcedOrgId || orgIdFromQuery || undefined, // Enforce org restriction, support both orgId and organizationId
      cohortId: searchParams.get("cohortId") || undefined,
      classIds: classIds, // Array of class IDs to filter instructors
      vendor_category: searchParams.get("vendor_category") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: Math.min(parseInt(searchParams.get("pageSize") || "20", 10), 50),
      sort: searchParams.get("sort") || undefined, // Format: "field:direction" e.g., "email:asc", "created_at:desc"
    };
    
    // Check If-None-Match header for ETag validation
    const ifNoneMatch = request.headers.get("If-None-Match");
    
    // Fetch data - exclude current user from the list
    // For instructors, add filtering to only show students in their assigned cohorts/subjects
    const data = await listUsers({
      ...filters,
      excludeUserId: currentUserId,
      // Instructor-specific filtering (only applies when userRole is instructor)
      instructorUserId: userRole === "instructor" ? currentUserId : undefined,
      instructorCohortIds: userRole === "instructor" ? instructorCohortIds : undefined,
      instructorOfferingIds: userRole === "instructor" ? instructorOfferingIds : undefined,
    });
    
    // Generate ETag from data hash (include filters and total for cache validation)
    const etagContent = JSON.stringify({ 
      ...filters, 
      total: data.total,
      count: data.items?.length || 0,
      timestamp: Math.floor(Date.now() / 60000) // Round to minute for cache stability
    });
    const etag = `"${crypto.createHash("sha256").update(etagContent).digest("hex").substring(0, 32)}"`;
    
    // If client sent matching ETag, return 304 Not Modified
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { 
        status: 304,
        headers: {
          "ETag": etag,
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300, must-revalidate",
        }
      });
    }
    
    // Return data with ETag headers
    const res = NextResponse.json({ ...data, etag: etag.replace(/"/g, '') }, { status: 200 });
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300, must-revalidate");
    res.headers.set("ETag", etag);
    res.headers.set("Vary", "Accept, Accept-Encoding, Authorization");
    return res;
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: error.message || "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check authorization (superadmin, admin, or instructor)
    const userRole = session.user.role;
    if (userRole !== "superadmin" && userRole !== "admin" && userRole !== "instructor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Role-based permission enforcement
    if (userRole === "instructor") {
      // Instructor can only create students
      if (body.role && body.role !== "student") {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "Instructors can only create student accounts" },
          { status: 403 }
        );
      }
    } else if (userRole === "admin") {
      // Admin can create all roles except brand and superadmin
      // Company is allowed (organization-scoped, like vendor)
      const forbiddenRoles = ["brand", "superadmin"];
      if (body.role && forbiddenRoles.includes(body.role)) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: `Admins cannot create ${body.role} accounts` },
          { status: 403 }
        );
      }
    }
    // Superadmin can create all roles (no restriction needed)

    // Tenant-isolation guard: admin/instructor must have a resolved organization.
    // Without this, a null session orgId would skip all org enforcement below and let a
    // payload org_id pass through unchecked.
    if ((userRole === "admin" || userRole === "instructor") && !session.user.orgId) {
      return NextResponse.json(
        { error: "NO_ORG", message: "Your account is not linked to an organization, so you cannot create users. Contact a super admin." },
        { status: 403 }
      );
    }

    // For student creation, check if cohort has offerings
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
        // Temporarily remove subject_offering_ids requirement by making it optional
        if (!body.subject_offering_ids || body.subject_offering_ids.length === 0) {
          body.subject_offering_ids = undefined; // Make it truly optional
        }
      }
    }
    
    // Validate input
    const validation = userCreateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // For instructor, fetch assigned cohorts/offerings from database if not in session
    let assignedCohorts = session.user.assignedCohorts || [];
    let assignedOfferings = session.user.assignedOfferings || [];
    
    if (userRole === "instructor" && (!assignedCohorts || assignedCohorts.length === 0)) {
      // Fetch instructor's assigned cohorts and offerings from database
      // Check BOTH instructor_classes AND user_class_subject_links tables
      const { query } = await import("@/lib/db/index.js");
      
      // Get cohorts from BOTH tables
      const cohortsResult = await query(
        `SELECT DISTINCT cohort_id 
         FROM (
           -- From instructor_classes table
           SELECT cohort_id 
           FROM instructor_classes 
           WHERE instructor_user_id = $1 AND cohort_id IS NOT NULL
           UNION
           -- From user_class_subject_links table (instructor type)
           SELECT DISTINCT cohort_id 
           FROM user_class_subject_links 
           WHERE user_id = $1 AND link_type = 'instructor' AND cohort_id IS NOT NULL
         ) AS instructor_cohorts`,
        [session.user.id]
      );
      assignedCohorts = cohortsResult.rows.map(row => row.cohort_id).filter(Boolean);
      
      // Get offerings from BOTH tables
      const offeringsResult = await query(
        `SELECT DISTINCT subject_offering_id 
         FROM (
           -- From instructor_classes table
           SELECT subject_offering_id 
           FROM instructor_classes 
           WHERE instructor_user_id = $1 AND subject_offering_id IS NOT NULL
           UNION
           -- From user_class_subject_links table (instructor type)
           SELECT DISTINCT subject_offering_id 
           FROM user_class_subject_links 
           WHERE user_id = $1 AND link_type = 'instructor' AND subject_offering_id IS NOT NULL
         ) AS instructor_offerings`,
        [session.user.id]
      );
      assignedOfferings = offeringsResult.rows.map(row => row.subject_offering_id).filter(Boolean);
    }

    // Build actor context for validation
    const actor = {
      role: userRole,
      orgId: session.user.orgId || null,
      // For superadmin, skip scope checks by not including assignedCohorts/assignedOfferings
      // For admin, we'll validate org-level access instead of personal assignments
      // For instructor, use fetched assignedCohorts/assignedOfferings
      assignedCohorts: userRole === "superadmin" ? undefined : assignedCohorts,
      assignedOfferings: userRole === "superadmin" ? undefined : assignedOfferings,
    };

    // Brand role validation - must have org_id = null (enforced by validation, but ensure here too)
    if (data.role === "brand") {
      if (data.org_id !== null && data.org_id !== undefined) {
        return NextResponse.json(
          { error: "INVALID_ORG", message: "Brand users must be global (org_id must be null)" },
          { status: 400 }
        );
      }
      data.org_id = null; // Force null for brand users
    }

    // Vendor organization handling
    if (data.role === "vendor") {
      if (userRole === "admin" && session.user.orgId) {
        // Admin must set vendor to their org
        data.org_id = session.user.orgId;
      }
      // Superadmin can set org optionally (or leave null) - no change needed
    }

    // Company organization handling (similar to vendor - organization-scoped)
    if (data.role === "company") {
      if (userRole === "admin" && session.user.orgId) {
        // Admin must set company to their org
        data.org_id = session.user.orgId;
      }
      // Superadmin can set org optionally (or leave null) - no change needed
    }

    // Organization access control: Admin and Instructor can only create users in their organization
    if ((userRole === "admin" || userRole === "instructor") && session.user.orgId) {
      if (data.org_id && data.org_id !== session.user.orgId) {
        return NextResponse.json(
          { error: "FORBIDDEN", message: "You can only create users in your own organization" },
          { status: 403 }
        );
      }
      // CRITICAL FIX: Enforce org_id for admin and instructor (ensure it's set)
      if (!data.org_id) {
        data.org_id = session.user.orgId;
      }
    }

    // Validate with actor context
    let validatedData;
    try {
      validatedData = validateCreateWithActor(data, actor);
    } catch (e) {
      // Provide more user-friendly error messages
      const errorMessage = e.code === "SCOPE_VIOLATION" 
        ? "You don't have permission to assign these cohorts or offerings. Please select only cohorts/offerings from your organization."
        : e.message || "Validation failed";
      return NextResponse.json(
        { error: e.code || "VALIDATION_ERROR", message: errorMessage },
        { status: 400 }
      );
    }

    // Duplicate guard: email is globally unique. createUserWithRole upserts on conflict, so
    // without this pre-check an existing account would be silently overwritten (and could be
    // moved across organizations). Detect it here and return 409 instead.
    {
      const { query } = await import("@/lib/db/index.js");
      const existing = await query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
        [validatedData.email]
      );
      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: "DUPLICATE_EMAIL", message: "A user with this email already exists." },
          { status: 409 }
        );
      }
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.temp_password);

    // CRITICAL FIX: Ensure orgId is properly set before creating user
    // validatedData.org_id should be set by validation and org enforcement logic above
    const finalOrgId = validatedData.org_id !== undefined ? validatedData.org_id : null;

    // Create user
    const user = await createUserWithRole({
      email: validatedData.email,
      first_name: validatedData.first_name || null,
      last_name: validatedData.last_name || null,
      avatar_url: validatedData.avatar_url || null,
      status: validatedData.status || "active",
      password_hash: passwordHash,
      mfa_required: validatedData.mfa_required || false,
      mfa_method: validatedData.mfa_method || "none",
      must_reset_password: validatedData.must_reset_password !== false,
      roleCode: validatedData.role,
      orgId: finalOrgId,
    });

    // Handle role-specific scopes
    // Note: Brand users don't have cohorts/organizations, so skip role-specific links
    if (validatedData.role === "student" && validatedData.cohort_id) {
      await attachStudentLink({
        userId: user.id,
        orgId: finalOrgId,
        cohortId: validatedData.cohort_id,
        subjectOfferingIds: validatedData.subject_offering_ids || [],
        rollNo: validatedData.roll_no || null,
        programNodeId: validatedData.program_node_id || null,
      });
    }

    if (validatedData.role === "instructor") {
      await attachInstructorLinks({
        userId: user.id,
        orgId: finalOrgId,
        cohortIds: validatedData.cohort_ids || [],
        offeringIds: validatedData.offering_ids || [],
      });
    }

    if (validatedData.role === "parent" && validatedData.linked_student_ids?.length > 0) {
      for (const studentId of validatedData.linked_student_ids) {
        await attachParentLink({
          parentUserId: user.id,
          studentUserId: studentId,
          orgId: finalOrgId,
        });
      }
    }

    // Create audit log
    const { ipAddress, userAgent } = extractRequestInfo(request);
    await createAuditLog({
      actorId: session.user.id,
      targetUserId: user.id,
      action: 'create_user',
      resourceType: 'user',
      resourceId: user.id,
      newValues: {
        email: user.email,
        role: validatedData.role,
        org_id: finalOrgId,
        first_name: validatedData.first_name,
        last_name: validatedData.last_name,
      },
      metadata: {
        role_specific_data: {
          cohort_id: validatedData.cohort_id,
          subject_offering_ids: validatedData.subject_offering_ids,
          roll_no: validatedData.roll_no,
          cohort_ids: validatedData.cohort_ids,
          offering_ids: validatedData.offering_ids,
          linked_student_ids: validatedData.linked_student_ids,
        },
      },
      ipAddress,
      userAgent,
    });

    // Revalidate cache - multiple tags for comprehensive cache invalidation
    revalidateTag("users");
    revalidateTag("users-list");
    
    // Return response without caching headers (POST requests shouldn't be cached)
    const res = NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email } 
    }, { status: 201 });
    res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    return res;
  } catch (error) {
    console.error("Create user error:", error);
    
    if (error.code === "UNIQUE_VIOLATION") {
      return NextResponse.json(
        { error: "DUPLICATE_EMAIL", message: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Handle enum value missing error (database migration not run)
    if (error.code === "ENUM_VALUE_MISSING") {
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


