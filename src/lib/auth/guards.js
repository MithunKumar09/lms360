/**
 * Auth Guards
 * 
 * Utility functions for authentication and authorization checks.
 * Used in middleware, API routes, and server components.
 */

import { auth } from '@/app/api/auth/[...nextauth]/route.js';

// Dynamic import for database to avoid Edge Runtime issues
// Only import when actually needed (in API routes, not middleware)
let dbQuery = null;
async function getDbQuery() {
  if (!dbQuery) {
    const dbModule = await import('@/lib/db/index.js');
    dbQuery = dbModule.query;
  }
  return dbQuery;
}

/**
 * Require authentication
 * Throws error if user is not authenticated
 * 
 * @param {Request} request - Next.js request object
 * @returns {Promise<Object>} Session object
 * @throws {Error} If not authenticated
 * 
 * FIX #7: Added enhanced logging for session issues
 */
export async function requireAuth(request = null) {
  try {
    // FIX #7: Enhanced logging
    const cookiePresent = request?.cookies?.get('next-auth.session-token');
    // console.log('🔐 [GUARDS] [requireAuth] Checking authentication...', {
    //   cookiePresent: !!cookiePresent,
    // });
    
    const session = await auth();
    
    // console.log('🔐 [GUARDS] [requireAuth] Session check:', {
    //   hasSession: !!session,
    //   hasUser: !!session?.user,
    //   userId: session?.user?.id,
    //   email: session?.user?.email,
    //   role: session?.user?.role,
    //   orgId: session?.user?.orgId,
    // });

    if (!session || !session.user) {
      console.error('🔐 [GUARDS] [requireAuth] ❌ Authentication required');
      const error = new Error('Authentication required');
      error.status = 401;
      throw error;
    }

    // console.log('🔐 [GUARDS] [requireAuth] ✅ Authentication verified');
    return session;
  } catch (error) {
    if (error.status === 401) {
      throw error;
    }
    console.error('🔐 [GUARDS] [requireAuth] ❌ Authentication verification failed:', error.message);
    const authError = new Error('Failed to verify authentication');
    authError.status = 401;
    throw authError;
  }
}

/**
 * Require specific role
 * Throws error if user doesn't have required role
 * 
 * @param {Request} request - Next.js request object
 * @param {string|string[]} requiredRoles - Required role(s)
 * @returns {Promise<Object>} Session object
 * @throws {Error} If user doesn't have required role
 * 
 * FIX #2: Added user validation against database to prevent session hijacking
 */
export async function requireRole(request = null, requiredRoles) {
  try {
    const session = await requireAuth(request);

    // FIX #2: VALIDATION - Verify session user exists and is active
    // console.log('🔐 [GUARDS] Validating session user against database...', {
    //   userId: session.user.id,
    //   email: session.user.email,
    // });
    const query = await getDbQuery();
    const userCheck = await query(
      `SELECT id, role, org_id, is_active 
       FROM users 
       WHERE id = $1`,
      [session.user.id]
    );

    if (userCheck.rows.length === 0) {
      console.error('🔐 [GUARDS] ❌ User not found in database', {
        userId: session.user.id,
      });
      const error = new Error('User not found');
      error.status = 401;
      throw error;
    }

    const dbUser = userCheck.rows[0];

    if (!dbUser.is_active) {
      console.error('🔐 [GUARDS] ❌ User account is inactive', {
        userId: dbUser.id,
      });
      const error = new Error('Account is inactive');
      error.status = 403;
      throw error;
    }

    // FIX #2: VALIDATION - Ensure role matches
    if (dbUser.role !== session.user.role) {
      console.error('🔐 [GUARDS] ❌ Session role mismatch', {
        userId: dbUser.id,
        sessionRole: session.user.role,
        dbRole: dbUser.role,
      });
      const error = new Error('Session role mismatch');
      error.status = 401;
      throw error;
    }

    // FIX: orgId validation - database is source of truth, but only update if actually different
    // Standardize: use only orgId (camelCase) in session, org_id (snake_case) in database
    const sessionOrgId = session.user.orgId; // Only use orgId, not org_id
    const dbOrgId = dbUser.org_id;
    
    // Only update session if database value is different AND database value is not null
    // If database has null, only clear session if user is not superadmin (superadmin can have null orgId)
    if (sessionOrgId !== dbOrgId) {
      if (dbOrgId !== null) {
        // Database has orgId - update session to match (this is the correct value)
        console.warn('🔐 [GUARDS] ⚠️ Session orgId updated from database', {
          userId: dbUser.id,
          oldOrgId: sessionOrgId,
          newOrgId: dbOrgId,
          reason: 'Database is source of truth - updating session',
        });
        session.user.orgId = dbOrgId;
      } else if (dbOrgId === null && sessionOrgId !== null) {
        // Database has null - only clear session if user is not superadmin
        // Superadmin can have null orgId (global user), other roles cannot
        if (session.user.role !== 'superadmin') {
          console.warn('🔐 [GUARDS] ⚠️ Organization removed from database, clearing session orgId', {
            userId: dbUser.id,
            oldOrgId: sessionOrgId,
            userRole: session.user.role,
            reason: 'Organization deleted or user reassigned - non-superadmin role requires orgId',
          });
          session.user.orgId = null;
        } else {
          // Superadmin with null orgId is valid - keep it
          // console.log('🔐 [GUARDS] ✅ Superadmin with null orgId is valid (global user)');
        }
      }
    }

    // console.log('🔐 [GUARDS] ✅ Session user validated successfully');

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    // Normalize user role to handle orgadmin -> admin mapping
    const { normalizeRole } = await import('@/lib/auth/roles.js');
    const userRole = normalizeRole(session.user.role);

    // STRICT: If ONLY superadmin is required, only superadmin can access
    // But if multiple roles are required (including superadmin), check all of them
    const normalizedRequiredRoles = roles.map(r => normalizeRole(r));
    const isOnlySuperadminRequired = normalizedRequiredRoles.length === 1 && normalizedRequiredRoles[0] === 'superadmin';
    
    if (isOnlySuperadminRequired) {
      // Only superadmin role is required - strict check
      if (userRole === 'superadmin') {
        return session;
      } else {
        const error = new Error('Insufficient permissions - Superadmin access required');
        error.status = 403;
        error.requiredRoles = roles;
        error.userRole = userRole;
        throw error;
      }
    }

    // Superadmin has access to all routes (even if not explicitly in requiredRoles)
    if (userRole === 'superadmin') {
      return session;
    }

    // Check if user has any of the required roles (multiple roles allowed)
    if (normalizedRequiredRoles.includes(userRole)) {
      return session;
    }

    const error = new Error('Insufficient permissions');
    error.status = 403;
    error.requiredRoles = roles;
    error.userRole = userRole;
    throw error;
  } catch (error) {
    if (error.status === 403 || error.status === 401) {
      throw error;
    }
    const authError = new Error('Failed to verify role');
    authError.status = 403;
    throw authError;
  }
}

/**
 * Require MFA verification
 * Throws error if MFA is not verified
 * 
 * @param {Request} request - Next.js request object
 * @returns {Promise<Object>} Session object
 * @throws {Error} If MFA is not verified
 */
export async function requireMfa(request = null) {
  try {
    const session = await requireAuth(request);

    // Check if MFA is enabled
    if (!session.user.mfaEnabled) {
      // MFA not enabled, allow access
      return session;
    }

    // Check if MFA is verified
    if (!session.user.mfaVerified) {
      const error = new Error('MFA verification required');
      error.status = 403;
      error.mfaRequired = true;
      throw error;
    }

    return session;
  } catch (error) {
    if (error.status === 403 || error.status === 401) {
      throw error;
    }
    const authError = new Error('Failed to verify MFA');
    authError.status = 403;
    throw authError;
  }
}

/**
 * Require superadmin role
 * Throws error if user is not superadmin
 * 
 * @param {Request} request - Next.js request object
 * @returns {Promise<Object>} Session object
 * @throws {Error} If user is not superadmin
 */
export async function requireSuperadmin(request = null) {
  return await requireRole(request, 'superadmin');
}

/**
 * Require superadmin with MFA
 * Throws error if user is not superadmin or MFA is not verified
 * 
 * @param {Request} request - Next.js request object
 * @returns {Promise<Object>} Session object
 * @throws {Error} If user is not superadmin or MFA is not verified
 */
export async function requireSuperadminWithMfa(request = null) {
  const session = await requireSuperadmin(request);
  await requireMfa(request);
  return session;
}

/**
 * Require superadmin or admin role
 * Throws error if user is not superadmin or admin
 * 
 * @param {Request} request - Next.js request object
 * @returns {Promise<Object>} Session object
 * @throws {Error} If user is not superadmin or admin
 */
export async function requireSuperadminOrAdmin(request = null) {
  return await requireRole(request, ['superadmin', 'admin']);
}

/**
 * Require vendor role
 * Throws error if user is not vendor
 * 
 * @param {Request} request - Next.js request object
 * @returns {Promise<Object>} Session object
 * @throws {Error} If user is not vendor
 */
export async function requireVendor(request = null) {
  return await requireRole(request, 'vendor');
}

/**
 * Check if user has role (non-throwing)
 * 
 * @param {Request} request - Next.js request object
 * @param {string|string[]} roles - Role(s) to check
 * @returns {Promise<boolean>} Whether user has role
 */
export async function hasRole(request = null, roles) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return false;
    }

    const roleArray = Array.isArray(roles) ? roles : [roles];
    const userRole = session.user.role;

    // Superadmin has access to all roles
    if (userRole === 'superadmin') {
      return true;
    }

    return roleArray.includes(userRole);
  } catch (error) {
    return false;
  }
}

/**
 * Check if user is authenticated (non-throwing)
 * 
 * @param {Request} request - Next.js request object
 * @returns {Promise<boolean>} Whether user is authenticated
 */
export async function isAuthenticated(request = null) {
  try {
    const session = await auth();
    return !!session?.user;
  } catch (error) {
    return false;
  }
}

/**
 * Check if MFA is verified (non-throwing)
 * 
 * @param {Request} request - Next.js request object
 * @returns {Promise<boolean>} Whether MFA is verified
 */
export async function isMfaVerified(request = null) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return false;
    }

    // If MFA is not enabled, consider it verified
    if (!session.user.mfaEnabled) {
      return true;
    }

    return !!session.user.mfaVerified;
  } catch (error) {
    return false;
  }
}

/**
 * Get user from session (non-throwing)
 * 
 * @param {Request} request - Next.js request object
 * @returns {Promise<Object|null>} User object or null
 */
export async function getUser(request = null) {
  try {
    const session = await auth();
    return session?.user || null;
  } catch (error) {
    return null;
  }
}

/**
 * Update last activity timestamp
 * 
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function updateLastActivity(userId) {
  try {
    // Update last_login as last_activity (since last_activity column doesn't exist yet)
    // This can be updated when the schema migration is added
    // Using dynamic import to avoid Edge Runtime issues
    const query = await getDbQuery();
    await query(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
      [userId]
    );
  } catch (error) {
    // Don't throw - this is a non-critical operation
    console.error('Failed to update last activity:', error);
  }
}

export default {
  requireAuth,
  requireRole,
  requireMfa,
  requireSuperadmin,
  requireSuperadminWithMfa,
  requireSuperadminOrAdmin,
  requireVendor,
  hasRole,
  isAuthenticated,
  isMfaVerified,
  getUser,
  updateLastActivity,
};

