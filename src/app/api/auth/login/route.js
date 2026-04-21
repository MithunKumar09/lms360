/**
 * Login API Route
 * 
 * Handles user authentication with:
 * - Email/password validation
 * - Rate limiting
 * - Password verification
 * - Session creation
 * - MFA requirement handling
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db/index.js';
import bcrypt from 'bcryptjs';
import {
  recordLoginAttempt,
  checkAccountLock,
  checkIpRateLimit,
  LOCKOUT_DURATION_MINUTES,
} from '@/lib/auth/rate-limiter.js';
import { validateEmail, validatePassword, getClientIp } from '@/lib/auth/validation.js';
import { createSession } from '@/lib/auth/sessionManager.js';
import { createNextAuthSessionToken, setNextAuthSessionCookie } from '@/lib/auth/nextauth-session.js';
import { normalizeRole } from '@/lib/auth/roles.js';
import { logLoginEvent } from '@/lib/audit/logger.js';

import { extractHostname, isControlPlaneHost } from '@/lib/tenant/hostname.js';
import { resolveTenant } from '@/lib/tenant/resolver.js';


/**
 * POST /api/auth/login
 * 
 * Request body:
 * {
 *   email: string,
 *   password: string,
 *   rememberMe?: boolean
 * }
 */
export async function POST(request) {
  try {
    console.log('🔐 [LOGIN] ===== LOGIN REQUEST STARTED =====');
    console.log('🔐 [LOGIN] Request method:', request.method);
    console.log('🔐 [LOGIN] Request URL:', request.url);
    console.log('🔐 [LOGIN] Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Check CSRF token from headers
    const csrfToken = request.headers.get('x-csrf-token');
    const csrfCookie = request.cookies.get('next-auth.csrf-token')?.value;
    console.log('🔐 [LOGIN] CSRF Token from header:', csrfToken ? 'Present' : 'Missing');
    console.log('🔐 [LOGIN] CSRF Token from cookie:', csrfCookie ? 'Present' : 'Missing');
    
    // Parse request body
    const body = await request.json();
    const { email, password, rememberMe } = body;
    console.log('🔐 [LOGIN] Email received:', email);
    console.log('🔐 [LOGIN] Password received:', password ? 'Present' : 'Missing');
    console.log('🔐 [LOGIN] Remember me:', rememberMe);

    // Get client IP
    const ipAddress = getClientIp(request);
    console.log('🔐 [LOGIN] Client IP:', ipAddress);

    // Validate input
    console.log('🔐 [LOGIN] Validating email...');
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      console.log('🔐 [LOGIN] ❌ Email validation failed:', emailValidation.error);
      await recordLoginAttempt(email || 'unknown', ipAddress, false, emailValidation.error);
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }
    console.log('🔐 [LOGIN] ✅ Email validation passed');

    console.log('🔐 [LOGIN] Validating password...');
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      console.log('🔐 [LOGIN] ❌ Password validation failed:', passwordValidation.error);
      await recordLoginAttempt(emailValidation.email, ipAddress, false, passwordValidation.error);
      return NextResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400 }
      );
    }
    console.log('🔐 [LOGIN] ✅ Password validation passed');

    const validEmail = emailValidation.email;

    // Check IP rate limit
    console.log('🔐 [LOGIN] Checking IP rate limit...');
    const ipRateLimit = await checkIpRateLimit(ipAddress);
    if (ipRateLimit.isRateLimited) {
      console.log('🔐 [LOGIN] ❌ IP rate limit exceeded:', ipRateLimit.message);
      return NextResponse.json(
        {
          success: false,
          error: ipRateLimit.message,
          rateLimited: true,
        },
        { status: 429 }
      );
    }
    console.log('🔐 [LOGIN] ✅ IP rate limit check passed');

    // Check account lock
    console.log('🔐 [LOGIN] Checking account lock...');
    const accountLock = await checkAccountLock(validEmail);
    if (accountLock.isLocked) {
      console.log('🔐 [LOGIN] ❌ Account locked:', accountLock);
      await recordLoginAttempt(validEmail, ipAddress, false, 'Account locked');
      return NextResponse.json(
        {
          success: false,
          error: `Account temporarily locked due to too many failed attempts. Please try again in ${accountLock.minutesRemaining} minute(s).`,
          accountLocked: true,
          unlockTime: accountLock.unlockTime,
          minutesRemaining: accountLock.minutesRemaining,
        },
        { status: 423 } // 423 Locked
      );
    }
    console.log('🔐 [LOGIN] ✅ Account lock check passed');

// ─── TENANT SCOPE ENFORCEMENT ──────────────────────────────────────────
/**
 * IMPORTANT:
 *
 * /api/auth/login is excluded from middleware matcher:
 *
 * matcher: /((?!api/auth|...).*)
 *
 * so middleware never injects:
 *
 * x-tenant-org-id
 * x-tenant-mode
 *
 * We must resolve tenant manually here.
 */

let resolvedOrgId = request.headers.get('x-tenant-org-id') || null;
let tenantMode = request.headers.get('x-tenant-mode') || 'control_plane';

if (!resolvedOrgId) {
  const baseDomain =
    process.env.NEXTAUTH_BASE_DOMAIN || 'localhost';

  const hostname = extractHostname(request);
  const isControlPlane = isControlPlaneHost(
    hostname,
    baseDomain
  );

  console.log('🔐 [LOGIN] Manual Tenant Resolution:', {
    hostname,
    baseDomain,
    isControlPlane,
  });

  if (!isControlPlane && hostname) {
const tenantResult = await resolveTenant(
  hostname,
  baseDomain
);

console.log('🔐 [LOGIN] ===== DIRECT TENANT RESOLVE =====');
console.log({
  hostname,
  baseDomain,
  tenantResult,
});

if (tenantResult && tenantResult.orgId) {
  resolvedOrgId = tenantResult.orgId;
  tenantMode = 'tenant';

  console.log('🔐 [LOGIN] ✅ Tenant resolved successfully', {
    resolvedOrgId,
    tenantMode,
  });
} else {
  console.log('🔐 [LOGIN] ⚠️ Tenant resolve failed, falling back to control_plane', {
    hostname,
  });
}
  }
}

const isTenantDomain =
  tenantMode === 'tenant' && !!resolvedOrgId;
// ──────────────────────────────────────────────────────────────────────

    // Query user from database with role and password reset requirement
    // Handle both enum (old) and varchar (new) role columns
    console.log('🔐 [LOGIN] Querying user from database...');
    const userResult = await query(
      `SELECT
        u.id,
        u.email,
        COALESCE(ua.password_hash, u.password_hash) as password_hash,
        -- Cast role to text (handles both enum and varchar types)
        u.role::text AS role,
        u.org_id,
        u.is_active,
        u.mfa_enabled,
        u.mfa_verified,
        u.mfa_secret,
        u.last_login_at,
        COALESCE(ua.must_reset_password, false) as must_reset_password
       FROM users u
       LEFT JOIN user_auth ua ON ua.user_id = u.id
       WHERE u.email = $1`,
      [validEmail]
    );

    if (userResult.rows.length === 0) {
      console.log('🔐 [LOGIN] ❌ User not found in database');
      await recordLoginAttempt(validEmail, ipAddress, false, 'User not found');
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

const user = userResult.rows[0];

console.log('🔐 [LOGIN] ===== TENANT ACCESS CHECK =====');
console.log({
  tenantMode,
  resolvedOrgId,
  isTenantDomain,
  userOrgId: user.org_id,
  role: user.role,
  email: user.email,
});

// Tenant scope validation: enforce that the user belongs to the resolved tenant.
// P5 decision: superadmin/brand must ONLY log in from the control plane.
if (isTenantDomain) {
      const normalizedRoleCheck = normalizeRole(user.role);
      if (normalizedRoleCheck === 'superadmin' || normalizedRoleCheck === 'brand') {
        await recordLoginAttempt(validEmail, ipAddress, false, 'Control plane roles cannot log in on tenant domains');
        return NextResponse.json(
          { success: false, error: 'Please log in via admin.edurock.com' },
          { status: 403 }
        );
      }
      if (user.org_id !== resolvedOrgId) {
        await recordLoginAttempt(validEmail, ipAddress, false, 'User does not belong to this organization');
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }
    } else {
      // Control plane: only global users (superadmin/brand with null org_id)
      if (user.org_id !== null) {
        await recordLoginAttempt(validEmail, ipAddress, false, 'Org-scoped users cannot log in on control plane');
        return NextResponse.json(
          { success: false, error: 'Invalid email or password' },
          { status: 401 }
        );
      }
    }

    // Normalize role to ensure consistency
    const normalizedRole = normalizeRole(user.role);
    user.role = normalizedRole;
    
    // FIX: Log orgId to help debug issues
    console.log('🔐 [LOGIN] ✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      originalRole: userResult.rows[0].role,
      org_id: user.org_id, // Database field (snake_case)
      is_active: user.is_active,
      mfa_enabled: user.mfa_enabled,
      mfa_verified: user.mfa_verified,
      mfa_secret: user.mfa_secret ? 'Present' : 'Missing'
    });
    
    // ===== STUDENT COHORT DATA LOGGING =====
    if (normalizedRole === 'student') {
      console.log('🎓 [LOGIN] ===== FETCHING STUDENT COHORT DATA =====');
      try {
        // Fetch student links (cohorts)
        const studentLinksResult = await query(
          `SELECT 
            sl.id,
            sl.user_id,
            sl.org_id,
            sl.cohort_id,
            sl.roll_no,
            sl.program_node_id,
            c.code as cohort_code,
            c.level as cohort_level,
            c.status as cohort_status,
            pn.title as program_node_title,
            pn.code as program_node_code
           FROM student_links sl
           LEFT JOIN cohorts c ON sl.cohort_id = c.id
           LEFT JOIN program_nodes pn ON sl.program_node_id = pn.id
           WHERE sl.user_id = $1`,
          [user.id]
        );
        
        const studentLinks = studentLinksResult.rows;
        console.log('🎓 [LOGIN] Student Links (Cohorts):', {
          count: studentLinks.length,
          links: studentLinks.map(link => ({
            linkId: link.id,
            cohortId: link.cohort_id,
            cohortCode: link.cohort_code,
            cohortLevel: link.cohort_level,
            cohortStatus: link.cohort_status,
            rollNo: link.roll_no,
            programNodeId: link.program_node_id,
            programNodeTitle: link.program_node_title,
            programNodeCode: link.program_node_code,
            orgId: link.org_id,
          }))
        });
        
        // Fetch subject offerings for this student
        if (studentLinks.length > 0) {
          const cohortIds = studentLinks.map(link => link.cohort_id).filter(Boolean);
          if (cohortIds.length > 0) {
            const subjectLinksResult = await query(
              `SELECT 
                ucsl.id,
                ucsl.user_id,
                ucsl.cohort_id,
                ucsl.subject_offering_id,
                so.subject_id,
                so.cohort_id as offering_cohort_id,
                s.code as subject_code,
                s.title as subject_title,
                c.code as cohort_code
               FROM user_class_subject_links ucsl
               LEFT JOIN subject_offerings so ON ucsl.subject_offering_id = so.id
               LEFT JOIN subject_catalog s ON so.subject_id = s.id
               LEFT JOIN cohorts c ON ucsl.cohort_id = c.id
               WHERE ucsl.user_id = $1 
                 AND ucsl.link_type = 'student'
                 AND ucsl.cohort_id = ANY($2::uuid[])`,
              [user.id, cohortIds]
            );
            
            const subjectLinks = subjectLinksResult.rows;
            console.log('🎓 [LOGIN] Student Subject Offerings:', {
              count: subjectLinks.length,
              subjects: subjectLinks.map(subj => ({
                linkId: subj.id,
                cohortId: subj.cohort_id,
                cohortCode: subj.cohort_code,
                subjectOfferingId: subj.subject_offering_id,
                subjectId: subj.subject_id,
                subjectCode: subj.subject_code,
                subjectTitle: subj.subject_title,
                offeringCohortId: subj.offering_cohort_id,
                cohortMatch: subj.cohort_id === subj.offering_cohort_id ? '✅ Match' : '❌ Mismatch',
              }))
            });
            
            // Group subjects by cohort
            const subjectsByCohort = {};
            subjectLinks.forEach(subj => {
              const cohortId = subj.cohort_id;
              if (!subjectsByCohort[cohortId]) {
                subjectsByCohort[cohortId] = [];
              }
              subjectsByCohort[cohortId].push({
                subjectId: subj.subject_id,
                subjectCode: subj.subject_code,
                subjectTitle: subj.subject_title,
                offeringId: subj.subject_offering_id,
              });
            });
            
            console.log('🎓 [LOGIN] Subjects Grouped by Cohort:', Object.entries(subjectsByCohort).map(([cohortId, subjects]) => {
              const cohort = studentLinks.find(link => link.cohort_id === cohortId);
              return {
                cohortId,
                cohortCode: cohort?.cohort_code || 'Unknown',
                cohortLevel: cohort?.cohort_level || 'Unknown',
                subjectCount: subjects.length,
                subjects: subjects.map(s => `${s.subjectCode} - ${s.subjectTitle}`),
              };
            }));
          }
        } else {
          console.log('🎓 [LOGIN] ⚠️ Student has NO cohorts linked (student_links table is empty)');
        }
        
        // Summary
        console.log('🎓 [LOGIN] ===== STUDENT AUTH DATA SUMMARY =====');
        console.log('🎓 [LOGIN] Complete Student Auth Data:', {
          userId: user.id,
          email: user.email,
          role: user.role,
          orgId: user.org_id,
          isActive: user.is_active,
          hasCohorts: studentLinks.length > 0,
          cohortCount: studentLinks.length,
          cohorts: studentLinks.map(link => ({
            cohortId: link.cohort_id,
            cohortCode: link.cohort_code,
            cohortLevel: link.cohort_level,
            rollNo: link.roll_no,
            programNode: link.program_node_title || link.program_node_code || 'None',
          })),
          totalSubjectOfferings: studentLinks.length > 0 ? (await query(
            `SELECT COUNT(*) as count 
             FROM user_class_subject_links 
             WHERE user_id = $1 AND link_type = 'student'`,
            [user.id]
          )).rows[0].count : 0,
        });
        console.log('🎓 [LOGIN] ===== END STUDENT COHORT DATA =====');
      } catch (cohortError) {
        console.error('🎓 [LOGIN] ❌ Error fetching student cohort data:', cohortError);
        console.error('🎓 [LOGIN] ❌ Error stack:', cohortError.stack);
      }
    }
    
    // FIX: Warn if non-superadmin user doesn't have orgId (data integrity issue)
    if (user.org_id === null && user.role !== 'superadmin') {
      console.warn('🔐 [LOGIN] ⚠️ WARNING: Non-superadmin user without orgId', {
        userId: user.id,
        email: user.email,
        role: user.role,
        reason: 'Non-superadmin roles require orgId - this may cause access issues'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      console.log('🔐 [LOGIN] ❌ Account is inactive');
      await recordLoginAttempt(validEmail, ipAddress, false, 'Account inactive');
      return NextResponse.json(
        { success: false, error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password
    console.log('🔐 [LOGIN] Verifying password...');
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    console.log('🔐 [LOGIN] Password verification result:', isValidPassword);

    if (!isValidPassword) {
      await recordLoginAttempt(validEmail, ipAddress, false, 'Invalid password');
      
      // Check if account should be locked after this failed attempt
      const updatedLock = await checkAccountLock(validEmail);
      if (updatedLock.isLocked) {
        return NextResponse.json(
          {
            success: false,
            error: `Too many failed attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
            accountLocked: true,
            unlockTime: updatedLock.unlockTime,
            minutesRemaining: updatedLock.minutesRemaining,
          },
          { status: 423 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Invalid email or password',
          remainingAttempts: updatedLock.remainingAttempts,
        },
        { status: 401 }
      );
    }

    // Password is valid - check if password reset is required
    if (user.must_reset_password) {
      console.log('🔐 [LOGIN] ⚠️ Password reset required');
      await recordLoginAttempt(validEmail, ipAddress, true, null);
      
      // Check if user has a valid password reset token
      const resetTokenResult = await query(
        `SELECT password_reset_token, password_reset_expires 
         FROM user_auth 
         WHERE user_id = $1 
         AND password_reset_token IS NOT NULL 
         AND password_reset_expires > CURRENT_TIMESTAMP`,
        [user.id]
      );
      
      const hasValidResetToken = resetTokenResult.rows.length > 0;
      
      return NextResponse.json(
        {
          success: false,
          requiresPasswordReset: true,
          message: 'Password reset required. Please check your email for reset instructions or request a new reset link.',
          userId: user.id,
          email: user.email,
          hasValidResetToken,
          // Note: Frontend should redirect to password reset page
        },
        { status: 200 } // 200 because password is correct, just needs password reset
      );
    }

    // Password is valid - check MFA requirement
    // mfaRequired: fully enrolled (mfa_verified=true AND secret present) — needs TOTP entry at login
    // mfaNeedsSetup: not yet verified (mfa_verified=false) — redirect to setup/re-enrollment regardless of whether a secret exists
    const mfaRequired   = user.mfa_enabled && user.mfa_verified && user.mfa_secret !== null;
    const mfaNeedsSetup = user.mfa_enabled && !user.mfa_verified;
    console.log('🔐 [LOGIN] MFA check:', { mfaRequired, mfaNeedsSetup, mfa_enabled: user.mfa_enabled, mfa_verified: user.mfa_verified, mfa_secret: user.mfa_secret ? 'Present' : 'Missing' });
    
    // If MFA is enabled, require MFA setup or verification before allowing dashboard access
    if (mfaRequired) {
      console.log('🔐 [LOGIN] ⚠️ MFA verification required');
      // MFA is set up - require TOTP verification
      await recordLoginAttempt(validEmail, ipAddress, true, null);
      
      return NextResponse.json(
        {
          success: false,
          requiresMfa: true,
          message: 'Multi-factor authentication required',
          userId: user.id,
          email: user.email,
          // Note: Frontend should call /api/auth/mfa/verify after this
        },
        { status: 200 } // 200 because password is correct, just needs MFA
      );
    }
    
    // If MFA is enabled but not set up, redirect to MFA setup page
    if (mfaNeedsSetup) {
      console.log('🔐 [LOGIN] ⚠️ MFA setup required');
      await recordLoginAttempt(validEmail, ipAddress, true, null);
      
      return NextResponse.json(
        {
          success: false,
          requiresMfaSetup: true,
          message: 'MFA setup required before accessing dashboard',
          userId: user.id,
          email: user.email,
          // Note: Frontend should redirect to /mfa?mode=setup&email=...
        },
        { status: 200 } // 200 because password is correct, just needs MFA setup
      );
    }

    // Create custom session (not using NextAuth signIn since we have custom session management)
    try {
      console.log('🔐 [LOGIN] Creating session...');
      
      // Record successful login
      await recordLoginAttempt(validEmail, ipAddress, true, null);
      console.log('🔐 [LOGIN] ✅ Login attempt recorded');

      // Check if this is first login (last_login_at is NULL before update)
      const isFirstLogin = !user.last_login_at || user.last_login_at === null;
      
      // Update last login timestamp (use last_login_at column)
      await query(
        `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [user.id]
      );
      console.log('🔐 [LOGIN] ✅ Last login timestamp updated');

      // If this is first login, mark any pending invites for this user as used (accepted)
      if (isFirstLogin) {
        try {
          const { markInviteUsed } = await import('@/lib/db/users.js');
          // Find and mark all pending invites for this user's email
          const inviteResult = await query(
            `SELECT id FROM invite_tokens 
             WHERE LOWER(email) = LOWER($1) 
             AND used_at IS NULL 
             AND expires_at > CURRENT_TIMESTAMP`,
            [user.email]
          );
          
          if (inviteResult.rows.length > 0) {
            for (const invite of inviteResult.rows) {
              await markInviteUsed(invite.id);
            }
            console.log('🔐 [LOGIN] ✅ Marked invite(s) as accepted on first login:', inviteResult.rows.length);
          }
        } catch (inviteError) {
          // Don't fail login if invite marking fails
          console.error('🔐 [LOGIN] ⚠️ Failed to mark invites as accepted:', inviteError);
        }
      }

      // Create custom session with tokens
      const userAgent = request.headers.get('user-agent') || 'unknown';
      console.log('🔐 [LOGIN] Creating custom session with tokens...');
      const session = await createSession({
        userId: user.id,
        email: user.email,
        role: user.role,
        ipAddress,
        userAgent,
        userData: {
          orgId: user.org_id,
          isActive: user.is_active,
          mfaEnabled: user.mfa_enabled,
          mfaVerified: user.mfa_verified,
        },
      });
      console.log('🔐 [LOGIN] ✅ Custom session created:', {
        sessionId: session.sessionId,
        accessToken: session.accessToken ? 'Present' : 'Missing',
        refreshToken: session.refreshToken ? 'Present' : 'Missing',
        expiresAt: session.expiresAt
      });

      // Create NextAuth session token for middleware compatibility
      console.log('🔐 [LOGIN] Creating NextAuth session token...');
      console.log('🔐 [LOGIN] User data for NextAuth token:', {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.org_id, // Database org_id -> session orgId
        isActive: user.is_active,
        mfaEnabled: user.mfa_enabled,
        mfaVerified: user.mfa_verified,
      });
      const nextAuthToken = await createNextAuthSessionToken({
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.org_id, // Database org_id (snake_case) -> session orgId (camelCase)
        isActive: user.is_active,
        mfaEnabled: user.mfa_enabled,
        mfaVerified: user.mfa_verified,
      });
      console.log('🔐 [LOGIN] ✅ NextAuth session token created:', nextAuthToken ? 'Present' : 'Missing');

      // Create response with tokens
      const response = NextResponse.json(
        {
          success: true,
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            orgId: user.org_id,
            isActive: user.is_active,
            mfaEnabled: user.mfa_enabled,
            mfaVerified: user.mfa_verified,
          },
          sessionToken: session.accessToken,
          refreshToken: session.refreshToken,
          expiresAt: session.expiresAt,
        },
        { status: 200 }
      );

      // Set refresh token in httpOnly cookie (secure storage)
      const expiresAt = new Date(session.expiresAt);
      console.log('🔐 [LOGIN] Setting refresh token cookie...', {
        expiresAt: expiresAt.toISOString(),
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        httpOnly: true
      });
      response.cookies.set('refresh-token', session.refreshToken, {
        httpOnly: true, // Prevent XSS attacks
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        sameSite: 'lax', // CSRF protection
        path: '/',
        expires: expiresAt,
      });
      console.log('🔐 [LOGIN] ✅ Refresh token cookie set');

      // Set NextAuth session token cookie (for middleware compatibility)
      console.log('🔐 [LOGIN] Setting NextAuth session cookie...');
      setNextAuthSessionCookie(response, nextAuthToken);
      console.log('🔐 [LOGIN] ✅ NextAuth session cookie set');

      // Log login event to audit logs
      try {
        await logLoginEvent({
          userId: user.id,
          userEmail: user.email,
          userRole: user.role,
          orgId: user.org_id,
          request,
          sessionId: session.sessionId,
          metadata: {
            mfaEnabled: user.mfa_enabled,
            mfaVerified: user.mfa_verified,
            isFirstLogin: isFirstLogin,
          },
        });
        console.log('🔐 [LOGIN] ✅ Login event logged to audit logs');
      } catch (auditError) {
        // Don't fail login if audit logging fails
        console.error('🔐 [LOGIN] ⚠️ Failed to log login event:', auditError);
      }

      console.log('🔐 [LOGIN] ✅ ===== LOGIN SUCCESSFUL =====');
      return response;
    } catch (sessionError) {
      console.error('🔐 [LOGIN] ❌ Session creation error:', sessionError);
      console.error('🔐 [LOGIN] ❌ Session creation error stack:', sessionError.stack);
      await recordLoginAttempt(validEmail, ipAddress, false, 'Session creation failed');
      
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create session. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('🔐 [LOGIN] ❌ ===== LOGIN ERROR =====');
    console.error('🔐 [LOGIN] ❌ Error message:', error.message);
    console.error('🔐 [LOGIN] ❌ Error stack:', error.stack);
    console.error('🔐 [LOGIN] ❌ Error details:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during login. Please try again.',
      },
      { status: 500 }
    );
  }
}
