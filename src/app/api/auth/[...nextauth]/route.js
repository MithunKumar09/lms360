/**
 * NextAuth.js API Route Handler
 * 
 * This is the main NextAuth.js API route handler.
 * Handles all authentication endpoints: /api/auth/signin, /api/auth/signout, etc.
 * 
 * Uses NextAuth v5 (Auth.js) with:
 * - JWT strategy for sessions (no database adapter needed)
 * - Credentials provider for email/password
 * - Custom session management handles database sessions separately
 */

import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth/config.js';
import { credentialsProvider } from '@/lib/auth/providers.js';

/**
 * NextAuth configuration with providers
 * 
 * Note: Using JWT strategy (no database adapter needed)
 * Sessions are stored in JWT tokens, not database
 * Custom session management handles database sessions separately
 */
const nextAuthConfig = {
  ...authConfig,
  
  // Providers
  providers: [credentialsProvider],

  // Cookie configuration
  // FIX #3: Removed domain setting to prevent cookie sharing across subdomains
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // FIX #3: Don't set domain unless explicitly needed for cross-subdomain cookies
        // Setting domain can cause cookies to be shared incorrectly
        // domain: undefined, // Explicitly undefined to prevent subdomain sharing
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // FIX #3: No domain setting
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        // FIX #3: No domain setting
      },
    },
  },
};

// Create NextAuth handler
// NextAuth v5 beta returns a handler object with GET, POST, and auth methods
const handler = NextAuth(nextAuthConfig);

// Export route handlers and auth function
// In NextAuth v5, the handler object contains GET, POST, and auth
export const { GET, POST, auth } = handler;

