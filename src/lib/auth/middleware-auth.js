/**
 * Middleware-safe NextAuth instance
 *
 * This is the ONLY auth export that src/middleware.js should import.
 * It uses edgeAuthConfig which has no Node.js-only dependencies.
 *
 * The full NextAuth instance (with bcryptjs, DB callbacks, and Credentials
 * provider) lives in src/app/api/auth/[...nextauth]/route.js and is NOT
 * imported here or by middleware.
 *
 * Both instances share the same NEXTAUTH_SECRET and HS256 algorithm, so
 * JWT tokens issued by the full instance are decodable by this one.
 */

import NextAuth from 'next-auth';
import { edgeAuthConfig } from './edge-config.js';

export const { auth } = NextAuth(edgeAuthConfig);
