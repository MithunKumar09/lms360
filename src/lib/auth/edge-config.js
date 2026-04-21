/**
 * Edge-safe NextAuth configuration
 *
 * Used ONLY by src/lib/auth/middleware-auth.js, which is imported by middleware.
 *
 * STRICT IMPORT RULES — this file must NEVER import:
 *   - bcryptjs  (uses Node.js crypto)
 *   - pg        (uses Node.js net / crypto)
 *   - db/index  (imports pg + fs)
 *   - config.js (imports bcryptjs at module top-level)
 *   - providers.js (re-imports config.js)
 *   - any route handler
 *
 * Purpose: decode the existing NextAuth JWT and project the session object so
 * that middleware can read role, orgId, mfaVerified, etc.
 *
 * Middleware ONLY reads sessions — it never issues tokens — so only jwt.decode
 * is required here. jwt.encode is omitted intentionally.
 *
 * The jwt.decode implementation uses jose (jwtVerify) via dynamic import.
 * jose targets Web Crypto API and is fully Edge Runtime compatible.
 *
 * The decode algorithm (HS256) and secret MUST match the full auth config in
 * src/lib/auth/config.js so that tokens issued by the full config are readable
 * here.
 */

export const edgeAuthConfig = {
  // Must match NEXTAUTH_SECRET used by the full auth config.
  // AUTH_SECRET is the v5 canonical name; NEXTAUTH_SECRET is the v4 alias.
  // Accept both so that the edge instance never silently uses a random secret.
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,

  // Allow NextAuth to work across multiple domains / subdomains without a
  // hardcoded NEXTAUTH_URL. Mirrors the setting in the full config.
  trustHost: true,

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days — must match full config
  },

  // CRITICAL: Must match the cookie name set by the full auth config AND by
  // nextauth-session.js (setNextAuthSessionCookie).
  //
  // Without this block, NextAuth v5 derives the cookie name from the request
  // protocol:
  //   HTTP  → next-auth.session-token
  //   HTTPS → __Secure-next-auth.session-token
  //
  // Our login route always writes `next-auth.session-token` (no __Secure-
  // prefix), so on any HTTPS deployment the edge instance would look for the
  // wrong cookie, auth() would return null, and every dashboard request would
  // redirect to /login → infinite loop.
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  jwt: {
    // Decode only — middleware never writes tokens.
    // Algorithm and secret must be identical to the full config's encode/decode
    // so tokens are interoperable between the two NextAuth instances.
    decode: async ({ token, secret }) => {
      // Dynamic import keeps jose out of the static import graph.
      // jose uses Web Crypto API internally — fully Edge Runtime compatible.
      const { jwtVerify } = await import('jose');
      try {
        const { payload } = await jwtVerify(
          token,
          new TextEncoder().encode(secret),
          { algorithms: ['HS256'] }
        );
        return payload;
      } catch {
        return null;
      }
    },
  },

  callbacks: {
    /**
     * JWT callback — read-only pass-through.
     *
     * The full config's jwt callback refreshes orgId / isActive from the DB on
     * every token check. We skip that here — middleware reads what was stamped
     * into the token at sign-in time. The DB refresh still happens in the full
     * NextAuth instance (API route) during actual session operations.
     */
    async jwt({ token }) {
      return token;
    },

    /**
     * Session callback — project token fields onto the session object.
     *
     * Field list MUST stay in sync with the full config's session callback in
     * src/lib/auth/config.js. Middleware relies on:
     *   session.user.id, role, orgId, isActive, mfaEnabled, mfaVerified,
     *   rv (user revocation version), org_rv (org revocation version)
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id          = token.id;
        session.user.role        = token.role;
        session.user.orgId       = token.orgId ?? null;
        session.user.isActive    = token.isActive;
        session.user.mfaEnabled  = token.mfaEnabled;
        session.user.mfaVerified = token.mfaVerified;
        // Revocation version fields — read by middleware to detect stale sessions
        session.user.rv          = token.rv     ?? 0;
        session.user.org_rv      = token.org_rv ?? 0;
      }
      return session;
    },
  },

  // No providers — middleware never authenticates users directly.
  providers: [],
};
