import { NextResponse } from "next/server";
import { getInviteByTokenHash, markInviteUsed, attachStudentLink, attachInstructorLinks } from "@/lib/db/users.js";
import { sha256 } from "@/lib/security/tokens.js";
import { query, getClient } from "@/lib/db/index.js";
import { createAuditLog, extractRequestInfo } from "@/lib/db/auditLogs.js";
import bcrypt from "bcryptjs";

/**
 * POST /api/users/invitations/accept
 * 
 * Public endpoint to accept an invitation and create a user account
 * Requires: token, password (for new password)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: "MISSING_FIELDS", message: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 12) {
      return NextResponse.json(
        { error: "WEAK_PASSWORD", message: "Password must be at least 12 characters long" },
        { status: 400 }
      );
    }

    // Hash the token to look up the invitation
    const tokenHash = sha256(token);
    const tokenHashHex = tokenHash.toString("hex");

    // Get invitation by token hash
    const invite = await getInviteByTokenHash(tokenHashHex);

    if (!invite) {
      return NextResponse.json(
        { error: "INVALID_TOKEN", message: "Invalid or expired invitation token" },
        { status: 400 }
      );
    }

    // Check if invitation has already been used
    if (invite.used_at) {
      return NextResponse.json(
        { error: "INVITATION_USED", message: "This invitation has already been used" },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (now > expiresAt) {
      return NextResponse.json(
        { error: "INVITATION_EXPIRED", message: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Validate org_id: Brand and superadmin can have null org_id (global users)
    // All other roles must have an org_id
    if (!['superadmin', 'brand'].includes(invite.role_code) && !invite.org_id) {
      console.error('[INVITE_ACCEPT] ❌ Missing org_id for non-global user:', {
        email: invite.email,
        role: invite.role_code,
        orgId: invite.org_id
      });
      return NextResponse.json(
        { error: "INVALID_INVITATION", message: "Organization is required for this user role" },
        { status: 400 }
      );
    }

    // Brand users must have org_id = null
    if (invite.role_code === 'brand' && invite.org_id !== null) {
      console.error('[INVITE_ACCEPT] ❌ Brand user cannot have org_id:', {
        email: invite.email,
        role: invite.role_code,
        orgId: invite.org_id
      });
      return NextResponse.json(
        { error: "INVALID_INVITATION", message: "Brand users must be global (no organization)" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id, email FROM users WHERE email = $1',
      [invite.email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "USER_EXISTS", message: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Hash the new password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user account
      const userResult = await client.query(
        `INSERT INTO users (id, email, role, org_id, is_active, email_verified, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1, $2::user_role, $3, true, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id, email, role, org_id`,
        [invite.email, invite.role_code, invite.org_id]
      );

      if (userResult.rows.length === 0) {
        throw new Error('Failed to create user');
      }

      const newUser = userResult.rows[0];

      // Create user_auth record with password and must_reset_password flag
      await client.query(
        `INSERT INTO user_auth (user_id, password_hash, must_reset_password, created_at, updated_at)
         VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           must_reset_password = true,
           updated_at = CURRENT_TIMESTAMP`,
        [newUser.id, passwordHash]
      );

      // Add first_name, last_name, avatar_url if provided in payload
      const payload = invite.payload || {};
      if (payload.first_name || payload.last_name || payload.avatar_url) {
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (payload.first_name) {
          updates.push(`first_name = $${paramIndex++}`);
          values.push(payload.first_name);
        }
        if (payload.last_name) {
          updates.push(`last_name = $${paramIndex++}`);
          values.push(payload.last_name);
        }
        if (payload.avatar_url) {
          updates.push(`avatar_url = $${paramIndex++}`);
          values.push(payload.avatar_url);
        }

        if (updates.length > 0) {
          values.push(newUser.id);
          await client.query(
            `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
            values
          );
        }
      }

      // Assign role via user_roles table
      await client.query(
        `INSERT INTO user_roles (id, user_id, role_id, org_id, created_at, updated_at)
         VALUES (uuid_generate_v4(), $1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, role_id, org_id) DO NOTHING`,
        [newUser.id, invite.role_id, invite.org_id]
      );

      // Handle role-specific links based on payload
      if (invite.role_code === 'student' && payload.cohort_id) {
        // Validate cohort exists before processing
        const cohortCheck = await client.query(
          `SELECT id, org_id FROM cohorts WHERE id = $1 AND status = 'published'`,
          [payload.cohort_id]
        );
        
        if (cohortCheck.rows.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: "INVALID_COHORT", message: "The selected cohort does not exist or is not available" },
            { status: 400 }
          );
        }

        // Validate cohort belongs to the same organization
        if (cohortCheck.rows[0].org_id !== invite.org_id) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: "COHORT_ORG_MISMATCH", message: "The selected cohort does not belong to the invitation's organization" },
            { status: 400 }
          );
        }

        // Validate subject offerings if provided
        if (payload.subject_offering_ids && Array.isArray(payload.subject_offering_ids) && payload.subject_offering_ids.length > 0) {
          const offeringsCheck = await client.query(
            `SELECT id, cohort_id FROM subject_offerings 
             WHERE id = ANY($1::uuid[]) AND status = 'published'`,
            [payload.subject_offering_ids]
          );

          const foundOfferingIds = new Set(offeringsCheck.rows.map(row => row.id));
          const missingOfferings = payload.subject_offering_ids.filter(id => !foundOfferingIds.has(id));
          
          if (missingOfferings.length > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { error: "INVALID_OFFERINGS", message: `Subject offerings not found: ${missingOfferings.join(', ')}` },
              { status: 400 }
            );
          }

          // Validate all offerings belong to the selected cohort
          const invalidOfferings = offeringsCheck.rows.filter(row => row.cohort_id !== payload.cohort_id);
          if (invalidOfferings.length > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { error: "OFFERING_COHORT_MISMATCH", message: `Some subject offerings do not belong to the selected cohort: ${invalidOfferings.map(o => o.id).join(', ')}` },
              { status: 400 }
            );
          }
        }

        // Use attachStudentLink function to handle student links and subject offerings
        // This ensures consistency with direct user creation
        // Note: This function uses its own transaction, but it will work correctly
        await attachStudentLink({
          userId: newUser.id,
          orgId: invite.org_id,
          cohortId: payload.cohort_id,
          subjectOfferingIds: payload.subject_offering_ids || [],
          rollNo: payload.roll_no || null,
          programNodeId: payload.program_node_id || null,
        });
      }

      if (invite.role_code === 'instructor' && invite.org_id) {
        const cohortIds = payload.cohort_ids || [];
        const offeringIds = payload.offering_ids || [];

        // Validate cohorts exist if provided
        if (cohortIds.length > 0) {
          const cohortsCheck = await client.query(
            `SELECT id, org_id FROM cohorts WHERE id = ANY($1::uuid[]) AND status = 'published'`,
            [cohortIds]
          );

          const foundCohortIds = new Set(cohortsCheck.rows.map(row => row.id));
          const missingCohorts = cohortIds.filter(id => !foundCohortIds.has(id));
          
          if (missingCohorts.length > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { error: "INVALID_COHORTS", message: `Cohorts not found: ${missingCohorts.join(', ')}` },
              { status: 400 }
            );
          }

          // Validate all cohorts belong to the same organization
          const invalidCohorts = cohortsCheck.rows.filter(row => row.org_id !== invite.org_id);
          if (invalidCohorts.length > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { error: "COHORT_ORG_MISMATCH", message: `Some cohorts do not belong to the invitation's organization: ${invalidCohorts.map(c => c.id).join(', ')}` },
              { status: 400 }
            );
          }
        }

        // Validate subject offerings exist if provided
        if (offeringIds.length > 0) {
          const offeringsCheck = await client.query(
            `SELECT id, cohort_id, org_id FROM subject_offerings 
             WHERE id = ANY($1::uuid[]) AND status = 'published'`,
            [offeringIds]
          );

          const foundOfferingIds = new Set(offeringsCheck.rows.map(row => row.id));
          const missingOfferings = offeringIds.filter(id => !foundOfferingIds.has(id));
          
          if (missingOfferings.length > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { error: "INVALID_OFFERINGS", message: `Subject offerings not found: ${missingOfferings.join(', ')}` },
              { status: 400 }
            );
          }

          // Validate all offerings belong to the same organization
          const invalidOfferings = offeringsCheck.rows.filter(row => row.org_id !== invite.org_id);
          if (invalidOfferings.length > 0) {
            await client.query('ROLLBACK');
            return NextResponse.json(
              { error: "OFFERING_ORG_MISMATCH", message: `Some subject offerings do not belong to the invitation's organization: ${invalidOfferings.map(o => o.id).join(', ')}` },
              { status: 400 }
            );
          }
        }

        // Validate at least one cohort or offering is provided
        if (cohortIds.length === 0 && offeringIds.length === 0) {
          await client.query('ROLLBACK');
          return NextResponse.json(
            { error: "MISSING_ASSIGNMENTS", message: "At least one cohort or subject offering must be provided for instructor accounts" },
            { status: 400 }
          );
        }

        // Use attachInstructorLinks function to handle instructor links and assignments
        // This ensures consistency with direct user creation
        // Note: This function uses its own transaction, but it will work correctly
        await attachInstructorLinks({
          userId: newUser.id,
          orgId: invite.org_id,
          cohortIds: cohortIds,
          offeringIds: offeringIds,
        });
      }

      if (invite.role_code === 'parent' && payload.linked_student_ids && Array.isArray(payload.linked_student_ids)) {
        for (const studentId of payload.linked_student_ids) {
          await client.query(
            `INSERT INTO parent_links (id, parent_user_id, student_user_id, org_id, created_at, updated_at)
             VALUES (uuid_generate_v4(), $1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (parent_user_id, student_user_id) DO NOTHING`,
            [newUser.id, studentId, invite.org_id]
          );
        }
      }

      // Mark invitation as used
      await markInviteUsed(invite.id);

      // Create audit log
      const { ipAddress, userAgent } = extractRequestInfo(request);
      await createAuditLog({
        actorId: null, // System action (no actor)
        targetUserId: newUser.id,
        action: 'accept_invitation',
        resourceType: 'invitation',
        resourceId: invite.id,
        newValues: {
          email: newUser.email,
          role: newUser.role,
          org_id: invite.org_id,
        },
        metadata: {
          invitation_id: invite.id,
        },
        ipAddress,
        userAgent,
      });

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: "Account created successfully. Please log in with your new password.",
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
        },
        redirect: "/auth/login",
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error accepting invitation:', error);
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Invitation acceptance error:', error);
    
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
      { error: "SERVER_ERROR", message: error.message || "Failed to accept invitation" },
      { status: 500 }
    );
  }
}

