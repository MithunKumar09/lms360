/**
 * NextAuth.js Providers Configuration
 * 
 * This file contains the provider configurations for NextAuth.js.
 * Currently supports Credentials provider for email/password authentication.
 */

import CredentialsProvider from 'next-auth/providers/credentials';
import { verifyCredentials } from './config.js';

/**
 * Credentials Provider Configuration
 * 
 * Handles email/password authentication
 */
export const credentialsProvider = CredentialsProvider({
  name: 'Credentials',
  credentials: {
    email: {
      label: 'Email',
      type: 'email',
      placeholder: 'your@email.com',
    },
    password: {
      label: 'Password',
      type: 'password',
    },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials?.password) {
      throw new Error('Email and password are required');
    }

    // Verify credentials
    const { error, user } = await verifyCredentials(
      credentials.email,
      credentials.password
    );

    if (error || !user) {
      throw new Error(error || 'Invalid credentials');
    }

    // Check MFA requirement
    if (user.mfaEnabled && !user.mfaVerified) {
      // MFA is enabled but not verified
      // Return user with MFA flag for MFA flow
      return {
        ...user,
        requiresMfa: true,
      };
    }

    // Return user object
    return user;
  },
});

/**
 * Get all providers
 */
export function getProviders() {
  return [credentialsProvider];
}

export default {
  credentials: credentialsProvider,
};


