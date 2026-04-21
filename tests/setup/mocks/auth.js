/**
 * Mock for Next.js Auth
 * 
 * Provides mock implementations of auth functions for testing
 */

export const mockAuth = {
  auth: jest.fn(),
  requireAuth: jest.fn(),
  requireRole: jest.fn(),
};

// Mock the auth module
jest.mock('@/lib/auth/guards.js', () => ({
  requireAuth: mockAuth.requireAuth,
  requireRole: mockAuth.requireRole,
}));

// Mock Next.js auth
jest.mock('@/app/api/auth/[...nextauth]/route.js', () => ({
  auth: mockAuth.auth,
}));

export default mockAuth;

