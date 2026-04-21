/**
 * NextAuth.js Configuration
 * 
 * This file contains the NextAuth.js configuration for authentication.
 * Uses NextAuth v5 (Auth.js) with PostgreSQL adapter and JWT strategy.
 */

import bcrypt from 'bcryptjs';

// Dynamic import for database to avoid Edge Runtime issues
// Only import when actually needed (in API routes, not middleware)
let dbQuery = null;
async function getDbQuery() {
  if (!dbQuery) {
    const dbModule = await import('../db/index.js');
    dbQuery = dbModule.query;
  }
  return dbQuery;
}

/**
 * Get database connection for NextAuth adapter
 */
function getDbConnection() {
  // Return the database connection configuration
  // NextAuth will use this to connect to PostgreSQL
  const dbUrl = process.env.DATABASE_URL;
  
  if (dbUrl) {
    return dbUrl;
  }

  // Build connection string from individual variables
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '5432';
  const database = process.env.DB_NAME || 'edurock_db';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD;

  if (!password) {
    throw new Error('Database password (DB_PASSWORD) is required for NextAuth');
  }

  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

/**
 * NextAuth Configuration
 */
export const authConfig = {
  // Secret for JWT encryption
  secret: process.env.NEXTAUTH_SECRET,

  // MULTI-TENANT: Allow NextAuth to work across multiple domains/subdomains
  // without a hardcoded NEXTAUTH_URL. Next.js (and NextAuth v5) normalizes the
  // host from x-forwarded-host when this is true, which our middleware relies on.
  trustHost: true,

  // Session configuration
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    updateAge: 24 * 60 * 60, // 24 hours in seconds
  },

  // JWT configuration
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    // Use plain JWT (not encrypted JWE) for compatibility
    encode: async ({ token, secret }) => {
      // Use jose library to sign JWT (not encrypt)
      const { SignJWT } = await import('jose');
      return await new SignJWT(token)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60)
        .sign(new TextEncoder().encode(secret));
    },
    decode: async ({ token, secret }) => {
      // Use jose library to verify JWT (not decrypt)
      const { jwtVerify } = await import('jose');
      try {
        const { payload } = await jwtVerify(
          token,
          new TextEncoder().encode(secret),
          { algorithms: ['HS256'] }
        );
        return payload;
      } catch (error) {
        return null;
      }
    },
  },

  // Pages configuration (custom pages)
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    verifyRequest: '/login',
    newUser: '/login',
  },

  // Callbacks
  callbacks: {
    /**
     * JWT callback - runs whenever a JWT is created or updated
     * 
     * CRITICAL FIX: Always refresh orgId from database to prevent stale values
     * Database is the source of truth - never use stale session/token values
     */
    async jwt({ token, user, account, profile }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        // FIX: Standardize orgId - use only orgId (camelCase), not org_id
        token.orgId = user.orgId || null; // Ensure it's set, even if null
        token.isActive = user.isActive;
        token.mfaEnabled = user.mfaEnabled;
        token.mfaVerified = user.mfaVerified;
        // Revocation versions — stamped at mint time so middleware can compare
        // token.rv  < current user rv  → user role/org changed → re-login
        // token.org_rv < current org rv → org suspended/deleted → re-login
        token.rv     = user.rv     ?? 0;
        token.org_rv = user.org_rv ?? 0;
        token._dbRefreshedAt = Math.floor(Date.now() / 1000);
      } else if (token?.id) {
        // Token refresh - refresh from DB at most once per hour.
        // Previously this ran on EVERY auth() call (including every call to
        // /api/auth/session), causing a 4-8 s DB round-trip per page load.
        const DB_REFRESH_INTERVAL = 60 * 60; // 1 hour in seconds
        const now = Math.floor(Date.now() / 1000);
        const lastRefresh = token._dbRefreshedAt ?? 0;

        if (now - lastRefresh < DB_REFRESH_INTERVAL) {
          return token; // Cached values are fresh enough
        }

        try {
          const query = await getDbQuery();
          // Also fetch revocation_version from both user and their org so the
          // JWT stays current after a suspension or role-change event.
          const userResult = await query(
            `SELECT u.org_id,
                    u.is_active,
                    u.mfa_enabled,
                    u.mfa_verified,
                    u.revocation_version                      AS user_rv,
                    COALESCE(o.revocation_version, 0)         AS org_rv
             FROM   users u
             LEFT JOIN organizations o ON o.id = u.org_id
             WHERE  u.id = $1`,
            [token.id]
          );

          if (userResult.rows.length > 0) {
            const dbUser = userResult.rows[0];
            const dbOrgId = dbUser.org_id;

            if (token.orgId !== dbOrgId) {
              console.log('🔄 [JWT] Refreshing orgId from database', {
                userId: token.id,
                oldOrgId: token.orgId,
                newOrgId: dbOrgId,
              });
              token.orgId = dbOrgId;
            }

            token.isActive   = dbUser.is_active;
            token.mfaEnabled = dbUser.mfa_enabled;
            token.mfaVerified = dbUser.mfa_verified;
            token.rv          = dbUser.user_rv  ?? 0;
            token.org_rv      = dbUser.org_rv   ?? 0;
            token._dbRefreshedAt = now;
          }
        } catch (error) {
          console.error('🔄 [JWT] ⚠️ Failed to refresh from database:', error.message);
        }
      }

      return token;
    },

    /**
     * Session callback - runs whenever a session is checked
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id          = token.id;
        session.user.role        = token.role;
        // FIX: Standardize orgId - use only orgId (camelCase), not org_id
        session.user.orgId       = token.orgId || null;
        session.user.isActive    = token.isActive;
        session.user.mfaEnabled  = token.mfaEnabled;
        session.user.mfaVerified = token.mfaVerified;
        // Revocation versions — keep in sync with edge-config.js session callback
        session.user.rv          = token.rv     ?? 0;
        session.user.org_rv      = token.org_rv ?? 0;
      }

      return session;
    },
  },

  // Providers
  providers: [],

  // Events
  events: {
    async signIn({ user, account, profile }) {
      // Log successful sign in
      // Note: Using dynamic import to avoid Edge Runtime issues
      try {
        const query = await getDbQuery();
        await query(
          `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
          [user.id]
        );
      } catch (error) {
        console.error('Failed to update last login:', error);
      }
    },
    async signOut({ token }) {
      // Clean up on sign out if needed
    },
  },

  // Debug mode (development only)
  debug: process.env.NODE_ENV === 'development',
};

/**
 * Verify credentials (for Credentials provider)
 *
 * @param {string} email
 * @param {string} password
 * @param {string|null} resolvedOrgId  The org resolved from the request domain.
 *   - null  → request came from the control plane (admin.edurock.com); only
 *             superadmin/brand (org_id IS NULL) users are accepted.
 *   - UUID  → request came from a tenant subdomain/custom domain; the user
 *             MUST belong to that org. Superadmin/brand are rejected here.
 */
export async function verifyCredentials(email, password, resolvedOrgId = null) {
  try {
    const query = await getDbQuery();

    let result;
    if (resolvedOrgId) {
      // Tenant domain login: scope to this org only.
      // Also fetch revocation_version from both user and org so the JWT is
      // stamped with fresh rv/org_rv values at mint time.
      result = await query(
        `SELECT u.id, u.email, u.password_hash, u.role, u.org_id,
                u.is_active, u.mfa_enabled, u.mfa_verified,
                u.revocation_version                  AS user_rv,
                COALESCE(o.revocation_version, 0)     AS org_rv
         FROM   users u
         LEFT JOIN organizations o ON o.id = u.org_id
         WHERE  u.email = $1 AND u.org_id = $2`,
        [email, resolvedOrgId]
      );
    } else {
      // Control plane login: only global users (superadmin / brand have null org_id).
      result = await query(
        `SELECT u.id, u.email, u.password_hash, u.role, u.org_id,
                u.is_active, u.mfa_enabled, u.mfa_verified,
                u.revocation_version                  AS user_rv,
                0                                     AS org_rv
         FROM   users u
         WHERE  u.email = $1 AND u.org_id IS NULL`,
        [email]
      );
    }

    if (result.rows.length === 0) {
      return { error: 'Invalid email or password', user: null };
    }

    const user = result.rows[0];

    // Enforce P5 decision: superadmin/brand must NOT log in from a tenant domain
    if (resolvedOrgId && (user.role === 'superadmin' || user.role === 'brand')) {
      return { error: 'Superadmin and brand users must log in via admin.edurock.com', user: null };
    }

    // Check if user is active
    if (!user.is_active) {
      return { error: 'Account is inactive', user: null };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return { error: 'Invalid email or password', user: null };
    }

    // Return user data (without password hash).
    // rv and org_rv are included so the JWT callback can stamp them into the token.
    return {
      error: null,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.org_id,
        isActive: user.is_active,
        mfaEnabled: user.mfa_enabled,
        mfaVerified: user.mfa_verified,
        rv:     user.user_rv ?? 0,
        org_rv: user.org_rv  ?? 0,
      },
    };
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return { error: 'Authentication failed', user: null };
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId) {
  try {
    // Using dynamic import to avoid Edge Runtime issues
    const query = await getDbQuery();
    const result = await query(
      `SELECT id, email, role, org_id, is_active, mfa_enabled, mfa_verified 
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const user = result.rows[0];
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.org_id,
      isActive: user.is_active,
      mfaEnabled: user.mfa_enabled,
      mfaVerified: user.mfa_verified,
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

export default authConfig;

